import { useEffect, useState, useSyncExternalStore } from 'react';
import { PhaserGame } from './PhaserGame';
import { initialSaveWarning, session, startSaving } from './runtime';
import { Notebook } from './ui/Notebook';
import { Dialogue } from './ui/Dialogue';

const movementKeys = new Set(['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

function App() {
    const view = useSyncExternalStore(session.subscribe, session.getSnapshot);
    const [saveWarning, setSaveWarning] = useState(initialSaveWarning);
    const location = session.world.locations[view.locationId];

    useEffect(() => startSaving(setSaveWarning), []);
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.ctrlKey || event.altKey || event.metaKey) return;
            const state = session.getSnapshot();
            const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
            const dialogueKey = state.conversation && (key === 'e' || key === 'Escape');
            const notebookKey = key === 'Tab' && !state.conversation;
            const closeNotebook = state.notebookOpen && key === 'Escape';
            if (state.notebookOpen && (key === 'ArrowUp' || key === 'ArrowDown')) {
                event.preventDefault(); event.stopImmediatePropagation();
                document.getElementById('notebook-pages')?.scrollBy({ top: key === 'ArrowUp' ? -50 : 50 });
                return;
            }
            const blockedMovement = session.isBlocked() && (movementKeys.has(key) || key === 'e');
            const repeat = event.repeat && (movementKeys.has(key) || key === 'e');
            if (dialogueKey || notebookKey || closeNotebook || blockedMovement || repeat) {
                event.preventDefault(); event.stopImmediatePropagation();
                if (event.repeat) return;
                if (dialogueKey) {
                    if (key === 'Escape') session.closeDialogue(); else session.advanceDialogue();
                } else if (notebookKey || closeNotebook) session.toggleNotebook();
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
                    <button className="notebook-button" onClick={() => session.toggleNotebook()} disabled={!!view.conversation} aria-keyshortcuts="Tab">
                        <span>Notebook <span className="entry-count">{view.entries.length}</span></span><kbd>Tab</kbd>
                    </button>
                </div>
                <div className="world-caption" aria-live="polite">
                    {view.nearby && !session.isBlocked()
                        ? <p className="interaction"><kbd>E</kbd> {view.nearby.label}</p>
                        : <p className="interaction quiet">{session.isBlocked() ? 'Investigation paused' : 'Walk closer to examine or speak'}</p>}
                    <p className="observation">{view.message}</p>
                </div>
                {view.notebookOpen && <Notebook entries={view.entries} />}
                {view.conversation && <Dialogue conversation={view.conversation} />}
            </section>
            <footer className="controls"><span><kbd>WASD</kbd> / <kbd>↑ ↓ ← →</kbd> Move <i>·</i> <kbd>E</kbd> Interact <i>·</i> <kbd>Tab</kbd> Notebook</span><span>Local autosave · Keyboard play</span></footer>
            {saveWarning && <p className="save-warning" role="status">{saveWarning}</p>}
        </main>
    );
}
export default App;
