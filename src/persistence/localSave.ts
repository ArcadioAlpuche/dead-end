import type { GameSession } from '../core/session.ts';
import type { SavedGame, WorldDefinition } from '../core/model.ts';
import { parseSave } from '../core/validation.ts';

// Keep the original slot key: envelope version controls migration, not the key suffix.
export const SAVE_KEY = 'dead-end.bellweather.v1';
export interface SaveStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
export interface LoadResult { saved?: SavedGame; warning: string; writable: boolean }

export function loadLocal(storage: SaveStorage, world: WorldDefinition): LoadResult {
    try {
        const raw = storage.getItem(SAVE_KEY);
        if (raw === null) return { warning: '', writable: true };
        const saved = parseSave(JSON.parse(raw), world);
        if (saved) return { saved, warning: '', writable: true };
    } catch { /* Keep an unreadable save intact, including when browser storage is unavailable. */ }
    return { warning: 'The local save could not be read. Playing without saving; the original save is preserved.', writable: false };
}

export function saveLocal(storage: SaveStorage, session: GameSession): boolean {
    try { storage.setItem(SAVE_KEY, JSON.stringify(session.getSave())); return true; }
    catch { return false; }
}
