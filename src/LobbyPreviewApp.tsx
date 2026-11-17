import { PhaserGame } from './PhaserGame.tsx';
import { lobbyReferenceMode } from './game/lobbyPreviewMode.ts';

export function LobbyPreviewApp() {
    return <main id="app">
        <header className="masthead">
            <div><span className="eyebrow">DEVELOPMENT ART TEST</span><h1>BELLWEATHER<span className="title-dot">.</span></h1></div>
            <div className="edition">{lobbyReferenceMode ? 'ARCHITECTURAL REFERENCE' : 'LOBBY LAYER PREVIEW'}<br />
                <span>{lobbyReferenceMode ? 'Opaque source image · Composition test only' : 'Temporary PNGs · No save changes'}</span></div>
        </header>
        <section className="game-shell" aria-label="Isolated Bellweather lobby art preview">
            <PhaserGame />
        </section>
        <footer className="controls"><span><kbd>WASD</kbd> / <kbd>↑ ↓ ← →</kbd> Move · {lobbyReferenceMode ? 'Old collision is not aligned to this reference' : 'Existing lobby collision'}</span>
            <span>{lobbyReferenceMode ? 'Full image fitted without crop; openings and objects remain baked in' : 'Temporary layer test'} · Preview only</span></footer>
    </main>;
}
