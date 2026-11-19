import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { PhaserGame } from './PhaserGame';
import { initialSaveWarning, investigationListWarning, investigations, loadInvestigation, manualSave, newInvestigation, restartInvestigation, saveAvailabilityWarning, session, startSaving } from './runtime';
import type { InvestigationSummary, Slot } from './persistence/investigations';
import type { LocationId } from './core/model';
import { Notebook } from './ui/Notebook';
import { casebookKeyAction, nextFocusIndex } from './ui/casebookInput';
import { Dialogue } from './ui/Dialogue';
import { Confirmation } from './ui/Confirmation';
import { investigationChoices, saveSlotChoices } from './ui/saveMenuModel';
import { menuKeyAction, nextMenuIndex } from './ui/menuKeys';

const movementKeys = new Set(['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
type Panel = 'pause' | 'save' | 'load' | 'restart' | null;
const dateLabel = (value: number) => new Date(value).toLocaleString();
const locationLabel = (id: string) => session.world.locations[id as LocationId]?.name ?? id;

function MenuSurface({ children, className, label, focusKey, focusTarget, modal = false, onEscape }: {
    children: ReactNode; className: string; label: string; focusKey: string;
    focusTarget?: string; modal?: boolean; onEscape?: () => void;
}) {
    const root = useRef<HTMLElement>(null);
    const buttons = () => Array.from(root.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
    useLayoutEffect(() => {
        const available = buttons();
        (available.find(button => button.dataset.menuKey === focusTarget) ?? available[0])?.focus();
    }, [focusKey, focusTarget]);
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.ctrlKey || event.altKey || event.metaKey || event.isComposing) return;
            const action = menuKeyAction(event.key);
            if (action === 'back' && onEscape) {
                event.preventDefault(); event.stopImmediatePropagation(); onEscape(); return;
            }
            if (action === 'previous' || action === 'next' || action === 'tab' && modal) {
                const available = buttons();
                if (!available.length) return;
                event.preventDefault(); event.stopImmediatePropagation();
                const direction = action === 'previous' || action === 'tab' && event.shiftKey ? -1 : 1;
                available[nextMenuIndex(available.indexOf(document.activeElement as HTMLButtonElement), available.length, direction)]?.focus();
            }
            // Enter remains a native button activation. If tab switching lost focus,
            // first return it to the menu rather than activating a hidden control.
            if (action === 'activate' && !root.current?.contains(document.activeElement)) {
                event.preventDefault(); event.stopImmediatePropagation();
                buttons()[0]?.focus();
            }
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [modal, onEscape]);
    return <section ref={root} className={className} role={modal ? 'dialog' : undefined} aria-modal={modal || undefined}
        aria-label={label}>{children}</section>;
}

function GameView({ onPause, panel, onWarning }: { onPause: () => void; panel: Panel; onWarning: (value: string) => void }) {
    const view = useSyncExternalStore(session.subscribe, session.getSnapshot);
    const confirmationUnderlay = useRef<HTMLDivElement>(null);
    const location = session.world.locations[view.locationId];
    useEffect(() => startSaving(onWarning), [onWarning]);
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.ctrlKey || event.altKey || event.metaKey || panel) return;
            const state = session.getSnapshot();
            const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
            if (state.pendingAction) return;
            if (state.conversation) {
                if (key === 'Escape' && !event.isComposing) {
                    if (document.getElementById('conversation-history-panel')) return;
                    event.preventDefault(); event.stopImmediatePropagation();
                    if (!event.repeat) session.closeDialogue();
                }
                return;
            }
            if (state.notebookOpen) {
                const action = casebookKeyAction(event, state.caseOfferId !== null);
                if (action !== 'native') {
                    event.preventDefault(); event.stopImmediatePropagation();
                    if (action === 'close') session.toggleNotebook();
                    if (action === 'up' || action === 'down') document.getElementById('notebook-pages')?.scrollBy({ top: action === 'up' ? -50 : 50 });
                    if (action === 'next' || action === 'previous') {
                        const controls = Array.from(document.querySelectorAll<HTMLButtonElement>('#casebook-panel button:not(:disabled)'));
                        controls[nextFocusIndex(controls.indexOf(document.activeElement as HTMLButtonElement), controls.length,
                            action === 'next' ? 1 : -1)]?.focus();
                    }
                }
                return;
            }
            if (key === 'Escape' && !event.repeat) {
                event.preventDefault(); event.stopImmediatePropagation(); onPause(); return;
            }
            if (key === 'Tab' || (event.repeat && (movementKeys.has(key) || key === 'e'))) {
                event.preventDefault(); event.stopImmediatePropagation();
                if (!event.repeat && key === 'Tab') session.toggleNotebook();
            }
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [onPause, panel]);

    return <section className="game-shell" aria-label="Bellweather Hotel exploration" tabIndex={-1}>
        <PhaserGame />
        <div className="world-hud">
            <div><span className="eyebrow">{location.floor}</span><h2>{location.name}</h2></div>
            <div className="menu-controls">
                <button className="notebook-button" onClick={() => session.toggleNotebook()} disabled={!!view.conversation || !!view.pendingAction || !!panel} aria-keyshortcuts="Tab">
                    <span>Casebook <span className="entry-count">{view.entries.length}</span></span><kbd>Tab</kbd>
                </button>
                <button className="notebook-button" onClick={onPause} disabled={!!view.conversation || !!view.pendingAction || view.notebookOpen || !!panel} aria-keyshortcuts="Escape">Pause <kbd>Esc</kbd></button>
            </div>
        </div>
        <div className="world-caption" aria-live="polite">
            {view.nearby && !session.isBlocked()
                ? <p className="interaction"><kbd>E</kbd> {view.nearby.label}</p>
                : <p className="interaction quiet">{session.isBlocked() ? 'Investigation paused' : 'Walk closer to examine or speak'}</p>}
            <p className="observation">{view.message}</p>
        </div>
        <div ref={confirmationUnderlay}>
            {view.notebookOpen && <Notebook entries={view.entries} cases={view.cases} offerId={view.caseOfferId} actionError={view.actionError} />}
            {view.conversation && <Dialogue conversation={view.conversation} locationId={view.locationId} />}
        </div>
        {view.pendingAction && <Confirmation action={view.pendingAction} underlay={confirmationUnderlay}
            onConfirm={token => session.confirmAction(token)} onCancel={token => session.cancelAction(token)} />}
    </section>;
}

function LoadMenu({ records, onSelect, onExit, className, modal }: {
    records: InvestigationSummary[]; onSelect: (id: string, slot: Slot) => void;
    onExit: () => void; className: string; modal?: boolean;
}) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [returnIndex, setReturnIndex] = useState(0);
    const choices = investigationChoices(records);
    const selected = records.find(record => record.id === selectedId);
    const selectedName = choices.find(choice => choice.id === selectedId)?.name;
    const back = () => selected ? setSelectedId(null) : onExit();
    return <MenuSurface className={className} label="Load Game" modal={modal}
        focusKey={selected ? `save-slots-${selected.id}` : 'investigation-selection'}
        focusTarget={selected ? 'autosave' : `investigation-${returnIndex}`} onEscape={back}>
        <h2>Load Game</h2>
        {!selected ? <><p>Select an investigation.</p><div className="investigation-list">
            {choices.length === 0 && <p>No investigations saved yet.</p>}
            {choices.map((choice, index) => <button className="investigation-choice" key={choice.id}
                data-menu-key={`investigation-${index}`} onClick={() => { setReturnIndex(index); setSelectedId(choice.id); }}>
                <strong>{choice.name}</strong>
                <span>{locationLabel(choice.locationId)} · Last played {dateLabel(choice.lastPlayedAt)}</span>
            </button>)}
        </div><button data-menu-key="back" onClick={onExit}>Back</button></>
            : <><h3>{selectedName}</h3><p>Select a save.</p><div className="investigation-list">
                {saveSlotChoices(selected).map(choice => <button key={choice.slot} data-menu-key={String(choice.slot)}
                    disabled={choice.disabled} onClick={() => onSelect(selected.id, choice.slot)}>
                    {choice.label} · {choice.savedAt === null ? 'Empty' : `${locationLabel(choice.locationId!)} · ${dateLabel(choice.savedAt)}`}
                </button>)}
            </div><button data-menu-key="back" onClick={() => setSelectedId(null)}>Back to Investigations</button></>}
    </MenuSurface>;
}

function App() {
    const [playing, setPlaying] = useState(false);
    const [generation, setGeneration] = useState(0);
    const [panel, setPanel] = useState<Panel>(null);
    const [titleLoad, setTitleLoad] = useState(false);
    const [titleFocus, setTitleFocus] = useState('continue');
    const [pauseFocus, setPauseFocus] = useState('resume');
    const pauseTrigger = useRef<HTMLElement | null>(null);
    const [warning, setWarning] = useState(initialSaveWarning);
    const [records, setRecords] = useState<InvestigationSummary[]>(() => {
        try { return investigations(); } catch { return []; }
    });
    const refresh = () => { try { setRecords(investigations()); const issue = investigationListWarning(); if (issue) setWarning(issue); } catch (error) { setWarning(String(error)); } };
    const run = (action: () => void) => {
        try { action(); setWarning(''); refresh(); return true; }
        catch (error) { setWarning(error instanceof Error ? error.message : 'Storage operation failed.'); return false; }
    };
    const openGame = () => { setPanel(null); setTitleLoad(false); setPlaying(true); setGeneration(value => value + 1); };
    const beginNew = () => { if (run(newInvestigation)) { setWarning(saveAvailabilityWarning()); openGame(); } };
    const load = (id: string, slot: Slot) => { if (run(() => loadInvestigation(id, slot))) openGame(); };
    const pause = () => {
        pauseTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        setPauseFocus('resume'); session.setPaused(true); setPanel('pause');
    };
    const resume = () => setPanel(null);
    useLayoutEffect(() => {
        if (!playing || panel) return;
        session.setPaused(false);
        const target = pauseTrigger.current;
        if (target && target !== document.body && target.isConnected && !('disabled' in target && target.disabled)) target.focus();
        else document.querySelector<HTMLElement>('.game-shell')?.focus();
        pauseTrigger.current = null;
    }, [playing, panel, generation]);
    return <main id="app" className="playable-app">
        <header className="masthead"><div><span className="eyebrow">A DETECTIVE ADVENTURE</span><h1>DEAD END<span className="title-dot">.</span></h1></div>
            <div className="edition">THE BELLWEATHER HOTEL<br /><span>Exploration study · No. 01</span></div></header>
        {!playing ? titleLoad
            ? <LoadMenu records={records} onSelect={load} onExit={() => { setTitleFocus('load'); setTitleLoad(false); }}
                className="game-menu title-menu" />
            : <MenuSurface className="game-menu title-menu" label="Title screen" focusKey="title" focusTarget={titleFocus}>
                <h2>Dead End</h2><div className="menu-buttons">
                    <button data-menu-key="continue" disabled={!records.length} onClick={() => load(records[0].id, 'autosave')}>Continue</button>
                    <button data-menu-key="new" onClick={beginNew}>New Game</button>
                    <button data-menu-key="load" onClick={() => { refresh(); setTitleLoad(true); }}>Load Game</button>
                </div>
            </MenuSurface>
            : <GameView key={generation} panel={panel} onPause={pause} onWarning={setWarning} />}
        {playing && panel && <div className="game-menu-overlay" role="presentation">
            {panel === 'pause' && <MenuSurface className="game-menu pause-menu" label="Pause menu" modal
                focusKey="pause" focusTarget={pauseFocus} onEscape={resume}>
                <h2>Paused</h2><div className="menu-buttons">
                    <button data-menu-key="resume" onClick={resume}>Resume Game</button>
                    <button data-menu-key="save" onClick={() => { setPauseFocus('save'); setPanel('save'); }}>Save Game</button>
                    <button data-menu-key="load" onClick={() => { setPauseFocus('load'); refresh(); setPanel('load'); }}>Load Game</button>
                    <button data-menu-key="restart" onClick={() => { setPauseFocus('restart'); setPanel('restart'); }}>Restart Investigation</button>
                    <button data-menu-key="title" onClick={() => { setTitleFocus('continue'); setPanel(null); setPlaying(false); refresh(); }}>Return to Title</button>
                </div>
            </MenuSurface>}
            {panel === 'save' && <MenuSurface className="game-menu pause-menu" label="Save Game" modal
                focusKey="save" onEscape={() => setPanel('pause')}>
                <h2>Save Game</h2><p>Choose one of three manual slots.</p>
                {[1, 2, 3].map(slot => <button key={slot} onClick={() => { if (run(() => manualSave(slot as 1 | 2 | 3))) setPanel('pause'); }}>Save to Slot {slot}</button>)}
                <button onClick={() => setPanel('pause')}>Back</button>
            </MenuSurface>}
            {panel === 'load' && <LoadMenu records={records} onSelect={load} onExit={() => setPanel('pause')}
                className="game-menu pause-menu" modal />}
            {panel === 'restart' && <MenuSurface className="game-menu pause-menu" label="Restart investigation" modal
                focusKey="restart" onEscape={() => setPanel('pause')}>
                <h2>Restart Investigation?</h2><p>This resets the autosave. Existing manual saves remain available.</p>
                <button onClick={() => { if (run(restartInvestigation)) openGame(); }}>Confirm Restart</button>
                <button onClick={() => setPanel('pause')}>Cancel</button>
            </MenuSurface>}
        </div>}
        <footer className="controls"><span><kbd>WASD</kbd> / <kbd>↑ ↓ ← →</kbd> Move <i>·</i> <kbd>E</kbd> Interact <i>·</i> <kbd>Tab</kbd> Casebook <i>·</i> <kbd>Esc</kbd> Pause</span><span>Local autosave · Keyboard play</span></footer>
        {warning && <p className="save-warning" role="status">{warning}</p>}
    </main>;
}
export default App;
