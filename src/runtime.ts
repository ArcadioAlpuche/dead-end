import { hotel } from './content/hotel.ts';
import { GameSession } from './core/session.ts';
import { validateWorld } from './core/validation.ts';
import { loadLocal, saveLocal } from './persistence/localSave.ts';
import type { LoadResult, SaveStorage } from './persistence/localSave.ts';

validateWorld(hotel);
let storage: SaveStorage | undefined;
let loaded: LoadResult = { warning: 'Local saving is unavailable in this browser. This session is still playable.', writable: false };
try { storage = window.localStorage; loaded = loadLocal(storage, hotel); } catch { /* Browser denied storage access. */ }

// One session survives React Strict Mode's lifecycle probe; Phaser holds no second copy.
export const session = new GameSession(hotel, loaded.saved);
export const initialSaveWarning = loaded.warning;

export function startSaving(reportWarning: (warning: string) => void): () => void {
    if (!storage || !loaded.writable) return () => {};
    const availableStorage = storage;
    let lastSaved = '';
    const save = () => {
        const snapshot = JSON.stringify(session.getSave());
        if (snapshot === lastSaved) return;
        if (saveLocal(availableStorage, session)) { lastSaved = snapshot; reportWarning(''); }
        else reportWarning('Saving failed. You can keep playing, but progress may be lost on reload.');
    };
    const unsubscribe = session.subscribe(save);
    const interval = window.setInterval(save, 2000);
    const onVisibility = () => { if (document.hidden) save(); };
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
        save(); unsubscribe(); window.clearInterval(interval);
        window.removeEventListener('pagehide', save);
        document.removeEventListener('visibilitychange', onVisibility);
    };
}
