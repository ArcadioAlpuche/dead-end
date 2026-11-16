import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { PhaserGame } from './PhaserGame';
import { initialSaveWarning, session, startSaving } from './runtime';
import { Notebook } from './ui/Notebook';
import { casebookKeyAction, nextFocusIndex } from './ui/casebookInput';
import { Dialogue } from './ui/Dialogue';
import { Confirmation } from './ui/Confirmation';

const movementKeys = new Set(['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

function App() {
    const view = useSyncExternalStore(session.subscribe, session.getSnapshot);
    const [saveWarning, setSaveWarning] = useState(initialSaveWarning);
    const confirmationUnderlay = useRef<HTMLDivElement>(null);
    const location = session.world.locations[view.locationId];

    useEffect(() => startSaving(setSaveWarning), []);
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.ctrlKey || event.altKey || event.metaKey) return;
            const state = session.getSnapshot();
            const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
            // The top confirmation owns all keys; underlying UI is inert and Phaser stays blocked.
            if (state.pendingAction) return;
            // Let the conversation own typing, repeats, Tab and Enter. Phaser input is disabled.
            if (state.conversation) {
                if (key === 'Escape' && !event.isComposing) {
                    event.preventDefault(); event.stopImmediatePropagation();
                    if (!event.repeat) session.closeDialogue();
                }
                return;
            }
            if (state.notebookOpen) {
                const action = casebookKeyAction(event, state.caseOfferId !== null);
                // Capture also prevents a closing Tab/Escape from reaching the world that same frame.
                if (action !== 'native') {
                    event.preventDefault(); event.stopImmediatePropagation();
                    if (action === 'close') session.toggleNotebook();
                    if (action === 'up' || action === 'down') {
                        document.getElementById('notebook-pages')?.scrollBy({ top: action === 'up' ? -50 : 50 });
                    }
                    if (action === 'next' || action === 'previous') {
                        const controls = Array.from(document.querySelectorAll<HTMLButtonElement>('#casebook-panel button:not(:disabled)'));
                        controls[nextFocusIndex(controls.indexOf(document.activeElement as HTMLButtonElement), controls.length,
                            action === 'next' ? 1 : -1)]?.focus();
                    }
                }
                return;
            }
            if (key === 'Tab' || (event.repeat && (movementKeys.has(key) || key === 'e'))) {
                event.preventDefault(); event.stopImmediatePropagation();
                if (!event.repeat && key === 'Tab') session.toggleNotebook();
            }
        };
        // Capture prevents an E used to dismiss UI from reaching Phaser in the same event.
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, []);

    return (
        <main id="app">
            <header className="masthead">
                <div><span className="eyebrow">A DETECTIVE ADVENTURE</span><h1>DEAD END<span className="title-dot">.</span></h1></div>
                <div className="edition">THE BELLWEATHER HOTEL<br /><span>Exploration study · No. 01</span></div>
            </header>
            <section className="game-shell" aria-label="Bellweather Hotel exploration">
                <PhaserGame />
                <div className="world-hud">
                    <div><span className="eyebrow">{location.floor}</span><h2>{location.name}</h2></div>
                    <button className="notebook-button" onClick={() => session.toggleNotebook()} disabled={!!view.conversation || !!view.pendingAction} aria-keyshortcuts="Tab">
                        <span>Casebook <span className="entry-count">{view.entries.length}</span></span><kbd>Tab</kbd>
                    </button>
                </div>
                <div className="world-caption" aria-live="polite">
                    {view.nearby && !session.isBlocked()
                        ? <p className="interaction"><kbd>E</kbd> {view.nearby.label}</p>
                        : <p className="interaction quiet">{session.isBlocked() ? 'Investigation paused' : 'Walk closer to examine or speak'}</p>}
                    <p className="observation">{view.message}</p>
                </div>
                <div ref={confirmationUnderlay}>
                    {view.notebookOpen && <Notebook entries={view.entries} cases={view.cases} offerId={view.caseOfferId} actionError={view.actionError} />}
                    {view.conversation && <Dialogue conversation={view.conversation} />}
                </div>
                {view.pendingAction && <Confirmation action={view.pendingAction} underlay={confirmationUnderlay}
                    onConfirm={token => session.confirmAction(token)} onCancel={token => session.cancelAction(token)} />}
            </section>
            <footer className="controls"><span><kbd>WASD</kbd> / <kbd>↑ ↓ ← →</kbd> Move <i>·</i> <kbd>E</kbd> Interact <i>·</i> <kbd>Tab</kbd> Casebook</span><span>Local autosave · Keyboard play</span></footer>
            {saveWarning && <p className="save-warning" role="status">{saveWarning}</p>}
        </main>
    );
}
export default App;
