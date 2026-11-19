import type { SavedGame, WorldDefinition } from '../core/model.ts';
import { parseSave } from '../core/validation.ts';
import { SAVE_KEY, type SaveStorage } from './localSave.ts';

const INDEX_KEY = 'dead-end.investigations.v1';
const recordKey = (id: string) => `dead-end.investigation.${id}.v1`;
export type Slot = 'autosave' | 1 | 2 | 3;
export interface SaveSlot { savedAt: number; locationId: string; game: SavedGame }
export interface Investigation {
    id: string;
    createdAt: number;
    lastPlayedAt: number;
    autosave: SaveSlot;
    manual: [SaveSlot | null, SaveSlot | null, SaveSlot | null];
}
export interface InvestigationSummary {
    id: string;
    createdAt: number;
    lastPlayedAt: number;
    autosave: Pick<SaveSlot, 'savedAt' | 'locationId'>;
    manual: readonly (Pick<SaveSlot, 'savedAt' | 'locationId'> | null)[];
}

export class InvestigationStore {
    unreadableIds: string[] = [];
    private storage: SaveStorage;
    private world: WorldDefinition;
    private now: () => number;
    private newId: () => string;
    constructor(storage: SaveStorage, world: WorldDefinition,
        now: () => number = Date.now, newId: () => string = () => crypto.randomUUID()) {
        this.storage = storage; this.world = world; this.now = now; this.newId = newId;
    }

    private ids(): string[] {
        const raw = this.storage.getItem(INDEX_KEY);
        if (raw === null) return [];
        const value: unknown = JSON.parse(raw);
        if (!value || typeof value !== 'object') throw new Error('Investigation index is unreadable. Existing data was preserved.');
        const index = value as { version?: unknown; ids?: unknown };
        if (index.version !== 1 || !Array.isArray(index.ids) || index.ids.some(id => typeof id !== 'string' || !/^[a-zA-Z0-9-]+$/.test(id)))
            throw new Error('Investigation index is unsupported. Existing data was preserved.');
        return index.ids;
    }

    private write(record: Investigation): void {
        this.storage.setItem(recordKey(record.id), JSON.stringify(record));
    }

    private read(id: string): Investigation {
        if (!this.ids().includes(id)) throw new Error('Investigation was not found.');
        const raw = this.storage.getItem(recordKey(id));
        if (!raw) throw new Error('Investigation save is missing. Existing data was preserved.');
        let value: unknown;
        try { value = JSON.parse(raw); } catch { throw new Error('Investigation save is unreadable. Existing data was preserved.'); }
        if (!value || typeof value !== 'object') throw new Error('Investigation save is invalid.');
        const record = value as Investigation;
        if (record.id !== id || !Number.isFinite(record.createdAt) || !Number.isFinite(record.lastPlayedAt)
            || !Array.isArray(record.manual) || record.manual.length !== 3 || !this.validSlot(record.autosave)
            || !record.manual.every(slot => slot === null || this.validSlot(slot)))
            throw new Error('Investigation save is invalid or unsupported. Existing data was preserved.');
        return record;
    }

    private validSlot(slot: SaveSlot | undefined): boolean {
        if (!slot || !Number.isFinite(slot.savedAt) || typeof slot.locationId !== 'string') return false;
        const game = parseSave(slot.game, this.world);
        return !!game && game.player.locationId === slot.locationId;
    }

    // The original single-slot key is never removed or overwritten. A failed import leaves
    // it available for a later retry; an invalid legacy save does not block a new game.
    importLegacy(): string {
        if (this.storage.getItem(INDEX_KEY) !== null) return '';
        const raw = this.storage.getItem(SAVE_KEY);
        if (raw === null) return '';
        let game: SavedGame | null = null;
        try { game = parseSave(JSON.parse(raw), this.world); } catch { /* preserve raw data */ }
        if (!game) return 'The older save could not be imported. It remains untouched.';
        const id = 'legacy-bellweather';
        const stamp = this.now();
        this.write({ id, createdAt: stamp, lastPlayedAt: stamp,
            autosave: { game, savedAt: stamp, locationId: game.player.locationId }, manual: [null, null, null] });
        this.storage.setItem(INDEX_KEY, JSON.stringify({ version: 1, ids: [id] }));
        return '';
    }

    list(): InvestigationSummary[] {
        this.unreadableIds = [];
        const records: InvestigationSummary[] = [];
        for (const id of this.ids()) {
            let record: Investigation;
            try { record = this.read(id); }
            catch { this.unreadableIds.push(id); continue; }
            const metadata = (slot: SaveSlot) => ({ savedAt: slot.savedAt, locationId: slot.locationId });
            records.push({ id, createdAt: record.createdAt, lastPlayedAt: record.lastPlayedAt,
                autosave: metadata(record.autosave), manual: record.manual.map(slot => slot && metadata(slot)) });
        }
        return records.sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);
    }

    create(game: SavedGame): InvestigationSummary {
        if (!parseSave(game, this.world)) throw new Error('Invalid initial game snapshot.');
        const ids = this.ids();
        const id = this.newId();
        if (!/^[a-zA-Z0-9-]+$/.test(id) || ids.includes(id)) throw new Error('Could not create a unique investigation.');
        const stamp = this.now();
        this.write({ id, createdAt: stamp, lastPlayedAt: stamp,
            autosave: { game, savedAt: stamp, locationId: game.player.locationId }, manual: [null, null, null] });
        this.storage.setItem(INDEX_KEY, JSON.stringify({ version: 1, ids: [...ids, id] }));
        return this.list().find(item => item.id === id)!;
    }

    load(id: string, slot: Slot): SavedGame {
        const record = this.read(id);
        const saved = slot === 'autosave' ? record.autosave : record.manual[slot - 1];
        if (!saved) throw new Error(`Manual slot ${slot} is empty.`);
        return parseSave(saved.game, this.world)!;
    }

    save(id: string, slot: Slot, game: SavedGame): void {
        if (slot !== 'autosave' && slot !== 1 && slot !== 2 && slot !== 3) throw new Error('Invalid save slot.');
        if (!parseSave(game, this.world)) throw new Error('Invalid game snapshot.');
        const record = this.read(id);
        const stamp = this.now();
        const snapshot: SaveSlot = { game, savedAt: stamp, locationId: game.player.locationId };
        if (slot === 'autosave') record.autosave = snapshot;
        else record.manual[slot - 1] = snapshot;
        record.lastPlayedAt = stamp;
        this.write(record);
    }

    restart(id: string, initial: SavedGame): void {
        const record = this.read(id);
        const stamp = this.now();
        record.autosave = { game: initial, savedAt: stamp, locationId: initial.player.locationId };
        record.lastPlayedAt = stamp;
        this.write(record);
    }
}
