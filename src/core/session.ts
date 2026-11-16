import type { CaseState, Discovery, Entry, Interaction, NpcMemoryEvent, Player, SavedGame, ViewState, WorldDefinition } from './model.ts';
import { casebookEntries, copyCaseStates } from './cases.ts';
import { classifyMessage, MAX_HISTORY_LINES, MAX_MESSAGE_LENGTH } from './conversation.ts';
import type { ConversationResponder } from './conversation.ts';
import { canStand, distance, INTERACTION_RADIUS } from './spatial.ts';

export class GameSession {
    readonly world: WorldDefinition;
    private player: Player;
    private cases: Readonly<Record<string, CaseState>>;
    private discoveries: readonly Discovery[];
    private view: ViewState;
    private npcMemories: readonly NpcMemoryEvent[];
    private requestGeneration = 0;
    private readonly responder: ConversationResponder;
    private readonly listeners = new Set<() => void>();

    constructor(world: WorldDefinition, saved?: SavedGame, responder?: ConversationResponder) {
        this.world = world;
        this.cases = copyCaseStates(saved?.cases ?? {});
        this.responder = responder ?? { async respond() { throw new Error('No conversation responder configured'); } };
        this.npcMemories = saved?.npcMemories ?? [];
        this.player = saved?.player ?? { locationId: 'lobby', ...world.locations.lobby.entries.arrival };
        this.discoveries = saved?.discoveries ?? [];
        this.view = {
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
    isBlocked(): boolean { return this.view.notebookOpen || this.view.conversation !== null; }
    getSave(): SavedGame {
        return { version: 3, cases: copyCaseStates(this.cases), contentVersion: 'bellweather-1', player: { ...this.player }, discoveries: this.discoveries.map(d => ({ ...d })), npcMemories: this.npcMemories.map(event => ({ ...event })) };
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
            const remembers = this.npcMemories.some(event => event.npcId === definition.npcId);
            this.publish({ conversation: {
                id: target.conversationId, name: definition.name, pending: false, error: '',
                history: [{ speaker: definition.name, text: remembers
                    ? definition.rememberedAccusationGreeting
                    : definition.greeting }],
            } });
        }
        return true;
    }
    async submitMessage(raw: string): Promise<boolean> {
        const conversation = this.view.conversation;
        const text = raw.trim();
        if (!conversation || conversation.pending || !text || text.length > MAX_MESSAGE_LENGTH) return false;
        const definition = this.world.conversations[conversation.id];
        const topic = classifyMessage(text);
        // The player's explicit statement is remembered even if the response fails or they leave.
        if (topic === 'accusation' && !this.npcMemories.some(event => event.npcId === definition.npcId && event.kind === 'accused')) {
            this.npcMemories = [...this.npcMemories, { kind: 'accused', npcId: definition.npcId,
                locationId: this.player.locationId, recordedAt: Date.now() }];
        }
        const history = [...conversation.history, { speaker: 'Detective', text }].slice(-MAX_HISTORY_LINES);
        const generation = ++this.requestGeneration;
        this.publish({ conversation: { ...conversation, history, pending: true, error: '' } });
        try {
            const response = await this.responder.respond({ npcId: definition.npcId, text, topic,
                history: history.map(line => ({ speaker: line.speaker, text: line.text })),
                memories: this.npcMemories.filter(event => event.npcId === definition.npcId).map(event => ({ ...event })) });
            if (generation !== this.requestGeneration || !this.view.conversation) return true;
            if (typeof response !== 'string' || !response.trim() || response.length > 4000) throw new Error('Invalid response');
            // Only core-selected authored lines can grant knowledge. Adapter text is never evidence.
            const authored = topic === 'account' ? definition.account : topic === 'room' ? definition.room : undefined;
            const lines = [...history, { speaker: definition.name, text: response }, ...(authored ? [authored] : [])].slice(-MAX_HISTORY_LINES);
            this.publish({ conversation: { ...conversation, history: lines, pending: false, error: '' } });
            if (authored?.recordId) this.discover(authored.recordId);
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
        if (this.view.conversation) this.publish({ conversation: null });
    }
    openCaseOffer(id: string): boolean {
        if (!this.view.notebookOpen || this.view.conversation || !Object.prototype.hasOwnProperty.call(this.world.cases, id)
            || this.cases[id]?.status === 'active') return false;
        this.publish({ caseOfferId: id });
        return true;
    }
    acceptCase(id: string): boolean {
        if (!this.view.notebookOpen || this.view.conversation || !Object.prototype.hasOwnProperty.call(this.world.cases, id)) return false;
        if (this.cases[id]?.status === 'active') return true; // Repeated clicks preserve the original acceptance.
        if (this.view.caseOfferId !== id) return false;
        this.cases = { ...this.cases, [id]: { status: 'active', history: [{ kind: 'accepted', recordedAt: Date.now() }] } };
        this.publish({ cases: casebookEntries(this.world.cases, this.cases), caseOfferId: null,
            message: 'Assignment accepted. Recorded in the casebook.' });
        return true;
    }
    deferCase(id: string): boolean {
        if (!this.view.notebookOpen || this.view.caseOfferId !== id || this.cases[id]?.status === 'active') return false;
        // Deferral is not withdrawal. No durable change; this offer remains available.
        this.publish({ notebookOpen: false, caseOfferId: null });
        return true;
    }
    toggleNotebook(): void {
        if (!this.view.conversation) this.publish({ notebookOpen: !this.view.notebookOpen, caseOfferId: null });
    }
}
