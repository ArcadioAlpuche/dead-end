import { mockResponder } from './conversation/mockResponder.ts';
import { hotel } from './content/hotel.ts';
import { GameSession } from './core/session.ts';
import { validateWorld } from './core/validation.ts';
import { InvestigationStore, type Slot } from './persistence/investigations.ts';
import type { InvestigationSummary } from './persistence/investigations.ts';
import type { SaveStorage } from './persistence/localSave.ts';

validateWorld(hotel);
let store: InvestigationStore | undefined;
let warning = '';
try {
    const storage: SaveStorage = window.localStorage;
    store = new InvestigationStore(storage, hotel);
    warning = store.importLegacy();
    store.list();
    if (store.unreadableIds.length) warning = `${store.unreadableIds.length} investigation save(s) could not be read. Their data was preserved.`;
} catch { warning = 'Local saving is unavailable. Existing saves were preserved.'; }

// This live binding lets Phaser and React share one active session.
// The game canvas is remounted when an investigation or slot is loaded.
export let session = new GameSession(hotel, undefined, mockResponder);
export let activeInvestigationId: string | null = null;
let activePersistent = false;
let unsavedWarning = '';
export const initialSaveWarning = warning;
export function saveAvailabilityWarning(): string { return unsavedWarning; }

export function investigations(): InvestigationSummary[] { return store?.list() ?? []; }
export function investigationListWarning(): string {
    return store?.unreadableIds.length ? `${store.unreadableIds.length} investigation save(s) could not be read. Their data was preserved.` : '';
}
export function newInvestigation(): string {
    const initial = new GameSession(hotel, undefined, mockResponder);
    let id: string;
    try {
        if (!store) throw new Error('Storage unavailable');
        id = store.create(initial.getSave()).id;
        activePersistent = true;
        unsavedWarning = '';
    } catch {
        id = `unsaved-${crypto.randomUUID()}`;
        activePersistent = false;
        unsavedWarning = 'This investigation is playable but cannot be saved. Browser storage is unavailable or full.';
    }
    session = initial;
    activeInvestigationId = id;
    return id;
}
export function loadInvestigation(id: string, slot: Slot): void {
    if (!store) throw new Error('Local storage is unavailable.');
    const saved = store.load(id, slot);
    // The selected snapshot becomes the next Continue point, without touching its manual slot.
    store.save(id, 'autosave', saved);
    session = new GameSession(hotel, saved, mockResponder);
    activeInvestigationId = id;
    activePersistent = true;
    unsavedWarning = '';
}
export function manualSave(slot: 1 | 2 | 3): void {
    if (!store || !activeInvestigationId || !activePersistent) throw new Error('This investigation cannot be saved because browser storage is unavailable.');
    store.save(activeInvestigationId, slot, session.getSave());
}
export function restartInvestigation(): void {
    const initial = new GameSession(hotel, undefined, mockResponder);
    if (activePersistent) {
        if (!store || !activeInvestigationId) throw new Error('No investigation is active.');
        store.restart(activeInvestigationId, initial.getSave());
    }
    session = initial;
}

export function startSaving(reportWarning: (warning: string) => void): () => void {
    const id = activeInvestigationId;
    const current = session;
    if (!store || !id || !activePersistent) return () => {};
    const availableStore = store;
    let lastSaved = JSON.stringify(current.getSave());
    let lastDurable = JSON.stringify({ ...current.getSave(), player: { locationId: current.getPlayer().locationId } });
    const save = () => {
        if (session !== current || activeInvestigationId !== id) return;
        const game = current.getSave();
        const snapshot = JSON.stringify(game);
        if (snapshot === lastSaved) return;
        try { availableStore.save(id, 'autosave', game); lastSaved = snapshot; reportWarning(''); }
        catch { reportWarning('Autosave failed. Progress may be lost on reload.'); }
    };
    const onChange = () => {
        const game = current.getSave();
        const durable = JSON.stringify({ ...game, player: { locationId: game.player.locationId } });
        if (durable !== lastDurable) { lastDurable = durable; save(); }
    };
    const unsubscribe = current.subscribe(onChange);
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
