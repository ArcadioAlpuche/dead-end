import type { Discovery, Entry, Interaction, Player, SavedGame, ViewState, WorldDefinition } from './model.ts';
import { canStand, distance, INTERACTION_RADIUS } from './spatial.ts';

export class GameSession {
    readonly world: WorldDefinition;
    private player: Player;
    private discoveries: readonly Discovery[];
    private view: ViewState;
    private readonly listeners = new Set<() => void>();

    constructor(world: WorldDefinition, saved?: SavedGame) {
        this.world = world;
        this.player = saved?.player ?? { locationId: 'lobby', ...world.locations.lobby.entries.arrival };
        this.discoveries = saved?.discoveries ?? [];
        this.view = {
            locationId: this.player.locationId, nearby: null, notebookOpen: false, conversation: null,
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
        return { version: 1, contentVersion: 'bellweather-1', player: { ...this.player }, discoveries: this.discoveries.map(d => ({ ...d })) };
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
            this.showLine(target.conversationId, 0);
        }
        return true;
    }
    private showLine(id: string, lineIndex: number): void {
        const line = this.world.conversations[id]?.[lineIndex];
        if (!line) { this.publish({ conversation: null }); return; }
        // First block input, then record only testimony actually shown to the player.
        this.publish({ conversation: { id, lineIndex, line } });
        if (line.recordId) this.discover(line.recordId);
    }
    advanceDialogue(): void {
        const conversation = this.view.conversation;
        if (conversation) this.showLine(conversation.id, conversation.lineIndex + 1);
    }
    closeDialogue(): void { if (this.view.conversation) this.publish({ conversation: null }); }
    toggleNotebook(): void {
        if (!this.view.conversation) this.publish({ notebookOpen: !this.view.notebookOpen });
    }
}
