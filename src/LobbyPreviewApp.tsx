import { PhaserGame } from './PhaserGame.tsx';

export function LobbyPreviewApp() {
    return <main id="app">
        <header className="masthead">
            <div><span className="eyebrow">DEVELOPMENT ART TEST</span><h1>BELLWEATHER<span className="title-dot">.</span></h1></div>
            <div className="edition">LOBBY LAYER PREVIEW<br /><span>Temporary PNGs · No save changes</span></div>
        </header>
        <section className="game-shell" aria-label="Isolated Bellweather lobby art preview">
            <PhaserGame />
        </section>
        <footer className="controls"><span><kbd>WASD</kbd> / <kbd>↑ ↓ ← →</kbd> Move · Existing lobby collision</span>
            <span>Preview only · Remove <kbd>?lobbyPreview=1</kbd> to play</span></footer>
    </main>;
}
