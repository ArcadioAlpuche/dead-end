import { PhaserGame } from './PhaserGame.tsx';

const referencePath = 'assets/characters/kane/references/kane-style-e-reference.png';

export function CharacterPreviewApp() {
    return <main id="app" className="character-preview-app">
        <header className="masthead">
            <div><span className="eyebrow">DEVELOPMENT CHARACTER TEST</span><h1>THOMAS KANE<span className="title-dot">.</span></h1></div>
            <div className="edition">STYLE E COMPARISON<br /><span>Read-only art study · No save changes</span></div>
        </header>
        <div className="character-preview-grid">
            <section aria-label="Live Detective V2 animation">
                <div className="game-shell"><PhaserGame /></div>
                <p>Move both detectives together to compare walking, stopping, and direction changes. E-style Kane uses the approved static idle when stopped.</p>
            </section>
            <section aria-label="Approved E-style visual reference">
                <div className="character-reference-frame">
                    <img src={referencePath} alt="Approved E-style Kane design reference with portrait, facing studies, and walking pose studies" />
                </div>
                <p>The original contact sheet remains a design reference. It is not an animation.</p>
            </section>
        </div>
        <footer className="controls"><span><kbd>WASD</kbd> / <kbd>↑ ↓ ← →</kbd> Move both · Stop for idle</span>
            <span>Development preview only · Playable game unchanged</span></footer>
    </main>;
}
