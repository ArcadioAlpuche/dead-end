import type { CaseState, Discovery, Entry, Interaction, NpcIdentityKnowledge, NpcMemoryEvent, Player, SavedGame, ViewState, WorldDefinition } from './model.ts';
import { casebookEntries, copyCaseStates } from './cases.ts';
import { MAX_HISTORY_LINES, MAX_MESSAGE_LENGTH } from './conversation.ts';
import { ActionConfirmation } from './actions.ts';
import type { ActionRequest } from './actions.ts';
import { caseActionPolicy } from './caseActions.ts';
import type { CaseActionContext } from './caseActions.ts';
import { routeConversationInput } from './conversationBoundary.ts';
import type { ConversationResponder } from './conversation.ts';
import { frictionCount, lastDiscussedTopic, rememberOnce, setFriction } from './npcMemory.ts';
import { establishNpcIdentity, npcDisplayName } from './npcIdentity.ts';
import { canStand, distance, INTERACTION_RADIUS } from './spatial.ts';

export class GameSession {
    readonly world: WorldDefinition;
    private player: Player;
    private cases: Readonly<Record<string, CaseState>>;
    private discoveries: readonly Discovery[];
    private view: ViewState;
    private npcMemories: readonly NpcMemoryEvent[];
    private npcIdentities: Readonly<Record<string, NpcIdentityKnowledge>>;
    private requestGeneration = 0;
    private activeConversationTopic: string | null = null;
    private readonly actions: ActionConfirmation<CaseActionContext>;
    private readonly responder: ConversationResponder;
    private readonly listeners = new Set<() => void>();

    constructor(world: WorldDefinition, saved?: SavedGame, responder?: ConversationResponder) {
        this.world = world;
        this.actions = new ActionConfirmation(caseActionPolicy(world));
        this.cases = copyCaseStates(saved?.cases ?? {});
        this.responder = responder ?? { async respond() { throw new Error('No conversation responder configured'); } };
        this.npcMemories = saved?.npcMemories ?? [];
        this.npcIdentities = saved?.npcIdentities ?? {};
        this.player = saved?.player ?? { locationId: 'lobby', ...world.locations.lobby.entries.arrival };
        this.discoveries = saved?.discoveries ?? [];
        this.view = {
            pendingAction: null, actionError: '',
            locationId: this.player.locationId, nearby: null, notebookOpen: false, conversation: null,
            caseOfferId: null, cases: casebookEntries(world.cases, this.cases),
            entries: this.discoveries.map(d => ({ ...world.records[d.id], recordedAt: d.recordedAt })),
            message: 'The Bellweather. Better days available on request.',
        };
        this.refreshNearby();
    }

    readonly getSnapshot = (): ViewState => this.view;
    readonly subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    };
    getPlayer(): Player { return this.player; }
    isBlocked(): boolean { return this.view.pendingAction !== null || this.view.notebookOpen || this.view.conversation !== null; }
    getSave(): SavedGame {
        return { version: 5, cases: copyCaseStates(this.cases), contentVersion: 'bellweather-3', player: { ...this.player }, discoveries: this.discoveries.map(d => ({ ...d })), npcMemories: this.npcMemories.map(event => ({ ...event })), npcIdentities: { ...this.npcIdentities } };
    }
    private publish(patch: Partial<ViewState>): void {
        this.view = { ...this.view, ...patch };
        this.listeners.forEach(listener => listener());
    }

    // The Phaser movement adapter supplies a collision-resolved position.
    moveTo(position: Entry): boolean {
        if (this.isBlocked() || !canStand(this.world.locations[this.player.locationId], position)) return false;
        this.player = { ...this.player, ...position };
        this.refreshNearby();
        return true;
    }
    private nearest(): Interaction | null {
        const facingPenalty = (target: Interaction) => (target.x - this.player.x) * this.player.facing < 0 ? 1 : 0;
        return this.world.locations[this.player.locationId].interactions
            .filter(target => distance(target, this.player) <= INTERACTION_RADIUS)
            .slice().sort((a, b) => distance(a, this.player) - distance(b, this.player)
                || facingPenalty(a) - facingPenalty(b) || a.id.localeCompare(b.id))[0] ?? null;
    }
    private refreshNearby(): void {
        const nearby = this.nearest();
        if (nearby?.id !== this.view.nearby?.id) this.publish({ nearby });
    }
    private discover(id: string): void {
        if (this.discoveries.some(d => d.id === id)) return;
        const record = this.world.records[id];
        if (!record) return;
        const discovery = { id, recordedAt: Date.now() };
        this.discoveries = [...this.discoveries, discovery];
        this.publish({ entries: [...this.view.entries, { ...record, recordedAt: discovery.recordedAt }] });
    }
    interact(targetId: string): boolean {
        if (this.isBlocked()) return false;
        const target = this.nearest();
        if (!target || target.id !== targetId) return false;
        if (target.kind === 'exit') {
            const destination = this.world.locations[target.destination];
            const entry = destination?.entries[target.entry];
            if (!entry || !canStand(destination, entry)) return false;
            // All locations are procedural and already in memory: commit one complete transition.
            this.player = { locationId: target.destination, ...entry };
            this.publish({ locationId: target.destination, nearby: this.nearest(), message: target.travelText ?? destination.name });
        } else if (target.kind === 'examine') {
            this.discover(target.recordId);
            this.publish({ message: this.world.records[target.recordId].text });
        } else {
            const definition = this.world.conversations[target.conversationId];
            const name = npcDisplayName(definition, this.npcIdentities[definition.npcId]);
            this.activeConversationTopic = null;
            const remembers = this.npcMemories.some(event => event.npcId === definition.npcId && event.kind === 'accused');
            this.publish({ conversation: {
                id: target.conversationId, name, pending: false, error: '',
                history: [{ speaker: name, text: remembers
                    ? definition.rememberedAccusationGreeting
                    : definition.greeting }],
            } });
        }
        return true;
    }
    async submitMessage(raw: string): Promise<boolean> {
        const conversation = this.view.conversation;
        const text = raw.trim();
        if (!conversation || conversation.pending || this.view.pendingAction || !text || text.length > MAX_MESSAGE_LENGTH) return false;
        const definition = this.world.conversations[conversation.id];
        // This boundary precedes transcript, memory, authored testimony and responder dispatch.
        const route = routeConversationInput(text, definition.npcId, [], this.activeConversationTopic);
        if (route.kind === 'clarify') {
            this.publish({ conversation: { ...conversation, error: route.message } });
            return false;
        }
        if (route.kind === 'action') {
            this.proposeAction(route.request);
            return false; // A private proposal is never an NPC message.
        }
        const topic = route.topic;
        const authored = definition.topics[topic === 'follow-up'
            ? route.intent ? this.activeConversationTopic ?? '' : this.activeConversationTopic ?? lastDiscussedTopic(this.npcMemories, definition.npcId) ?? ''
            : topic];
        if (['account', 'room', 'assignment', 'introduction', 'follow-up'].includes(topic) && !authored) {
            this.publish({ conversation: { ...conversation, error: 'Not sent. Ask about a specific topic first.' } });
            return false;
        }
        const contextualReply = route.intent ? authored?.contextualReplies?.[route.intent] : null;
        if (route.intent && !contextualReply) {
            this.publish({ conversation: { ...conversation, error: `Not sent. ${conversation.name} has no established answer to that follow-up.` } });
            return false;
        }
        // The player's explicit statement is remembered even if the response fails or they leave.
        if (topic === 'accusation') {
            this.npcMemories = rememberOnce(this.npcMemories, { kind: 'accused', npcId: definition.npcId,
                locationId: this.player.locationId, recordedAt: Date.now() });
        }
        const oldFriction = frictionCount(this.npcMemories, definition.npcId);
        const irritation = topic === 'irrelevant' ? Math.min(oldFriction + 1, definition.patience + 2) : 0;
        if (topic === 'irrelevant' || oldFriction > 0 && (authored || topic === 'follow-up' || topic === 'rapport' || topic === 'small-talk')) {
            this.npcMemories = setFriction(this.npcMemories, definition.npcId, this.player.locationId, irritation, Date.now());
        }
        const history = [...conversation.history, { speaker: 'Detective', text }].slice(-MAX_HISTORY_LINES);
        const generation = ++this.requestGeneration;
        this.publish({ conversation: { ...conversation, history, pending: true, error: '' } });
        try {
            const scripted = contextualReply ?? (topic === 'introduction' && authored?.establishesIdentity ? authored.line.text
                : topic === 'irrelevant' ? irritation > definition.patience + 1 ? definition.silent
                : irritation > definition.patience ? definition.disengaged
                : irritation === definition.patience ? definition.warning : definition.irrelevant
                : topic === 'rapport' ? definition.rapport
                : topic === 'small-talk' ? definition.smallTalk
                : topic === 'accusation' ? definition.accusationReply
                : oldFriction > definition.patience && authored ? definition.reengaged : null);
            const adapterResponse = scripted && topic !== 'accusation' ? null : await this.responder.respond({ npcId: definition.npcId, text, topic,
                history: history.map(line => ({ speaker: line.speaker, text: line.text })),
                memories: this.npcMemories.filter(event => event.npcId === definition.npcId).map(event => ({ ...event })) });
            const response = scripted ?? adapterResponse;
            if (generation !== this.requestGeneration || !this.view.conversation) return true;
            if (typeof response !== 'string' || !response.trim() || response.length > 4000) throw new Error('Invalid response');
            // Only core-selected authored lines can grant knowledge. Adapter text is never evidence.
            if (topic === 'introduction' && authored?.establishesIdentity) {
                this.npcIdentities = establishNpcIdentity(this.npcIdentities, definition.npcId, Date.now());
            }
            const name = npcDisplayName(definition, this.npcIdentities[definition.npcId]);
            const isAuthoredStatement = !!authored && topic !== 'follow-up' && topic !== 'introduction' && !route.intent;
            const line = route.intent || topic === 'introduction' ? null : topic === 'follow-up' && authored ? { speaker: name, text: authored.followUp }
                : authored?.line && { ...authored.line, speaker: name };
            const lines = [...history, { speaker: name, text: response }, ...(line ? [line] : [])].slice(-MAX_HISTORY_LINES);
            this.publish({ conversation: { ...conversation, name, history: lines, pending: false, error: '' } });
            if (authored && topic !== 'follow-up') this.activeConversationTopic = authored.id;
            else if (!authored) this.activeConversationTopic = null;
            if (authored && topic !== 'follow-up') {
                this.npcMemories = rememberOnce(this.npcMemories, { kind: 'topic', npcId: definition.npcId,
                    topicId: authored.id, locationId: this.player.locationId, recordedAt: Date.now() });
            }
            if (isAuthoredStatement) {
                this.npcMemories = rememberOnce(this.npcMemories, { kind: 'statement', npcId: definition.npcId,
                    statementId: `${definition.npcId}:${authored.id}`, locationId: this.player.locationId, recordedAt: Date.now() });
            }
            if (line?.recordId) this.discover(line.recordId);
        } catch {
            if (generation === this.requestGeneration && this.view.conversation) {
                this.publish({ conversation: { ...conversation, history, pending: false,
                    error: 'No reply received. You can send another message or leave.' } });
            }
        }
        return true;
    }
    closeDialogue(): void {
        ++this.requestGeneration; // A late reply must not enter a later conversation or grant testimony.
        this.activeConversationTopic = null;
        if (this.view.conversation) {
            this.actions.clear();
            this.publish({ conversation: null, pendingAction: null, actionError: '' });
        }
    }
    openCaseOffer(id: string): boolean {
        if (this.view.pendingAction) return false;
        if (!this.view.notebookOpen || this.view.conversation || !Object.prototype.hasOwnProperty.call(this.world.cases, id)
            || this.cases[id]?.status === 'active') return false;
        this.publish({ caseOfferId: id, actionError: '' });
        return true;
    }
    private actionContext(): CaseActionContext {
        return { saved: this.getSave(), offerId: this.view.caseOfferId,
            notebookOpen: this.view.notebookOpen, inConversation: this.view.conversation !== null };
    }
    requestCaseAcceptance(id: string): boolean {
        if (!Object.prototype.hasOwnProperty.call(this.world.cases, id)) return false;
        return this.proposeAction({ kind: 'accept-assignment', caseId: id, recipientId: this.world.cases[id].clientId });
    }
    proposeAction(request: ActionRequest): boolean {
        if (this.view.pendingAction || this.view.conversation?.pending) return false;
        const result = this.actions.propose(this.actionContext(), request);
        if (!result.ok) { this.publish({ actionError: result.reason }); return false; }
        this.publish({ pendingAction: this.actions.getPending(), actionError: '' });
        return true;
    }
    confirmAction(token: symbol): boolean {
        if (this.view.pendingAction?.token !== token) return false;
        const result = this.actions.confirm(token, this.actionContext(), Date.now());
        if (!result.ok) {
            this.publish({ pendingAction: null, actionError: result.reason });
            return false;
        }
        // Prepare first, then commit every affected field synchronously before a single publish.
        // The policy returns a complete candidate snapshot; no partial effects or async writes.
        const next = result.state.saved;
        this.cases = next.cases; this.discoveries = next.discoveries;
        this.npcMemories = next.npcMemories; this.player = next.player;
        this.npcIdentities = next.npcIdentities;
        this.publish({ pendingAction: null, actionError: '', cases: casebookEntries(this.world.cases, this.cases), caseOfferId: null,
            message: 'Assignment accepted. Recorded in the casebook.' });
        return true;
    }
    cancelAction(token: symbol): boolean {
        if (!this.actions.cancel(token)) return false;
        this.publish({ pendingAction: null, actionError: '' });
        return true;
    }
    deferCase(id: string): boolean {
        if (this.view.pendingAction) return false;
        if (!this.view.notebookOpen || this.view.caseOfferId !== id || this.cases[id]?.status === 'active') return false;
        // Deferral is not withdrawal. No durable change; this offer remains available.
        this.publish({ notebookOpen: false, caseOfferId: null });
        return true;
    }
    toggleNotebook(): void {
        if (!this.view.conversation) {
            this.actions.clear();
            this.publish({ notebookOpen: !this.view.notebookOpen, caseOfferId: null, pendingAction: null, actionError: '' });
        }
    }
}
