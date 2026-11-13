import type { CharacterSpriteConfig } from './animation.ts';

// Tight-grid supplied sheets with per-clip widths, facing right.
export const originalDetectiveSpriteConfig: CharacterSpriteConfig = {
    enabled: true,
    key: 'detective-v3',
    assetPath: 'assets/characters/detective/',
    // Soles reach row 113, leaving six rows of bottom padding in the 120px cells.
    origin: { x: 0.5, y: 114 / 120 },
    // Preserve the current scale: roughly 162px visible height against 200px door panels.
    scale: 1.5,
    sourceFacing: 1,
    mirrorX: true,
    movingSpeed: 2,
    idle: { file: 'idle.png', frameWidth: 55, frameHeight: 120, frames: [0, 1, 2, 3, 4, 5], frameRate: 5 },
    walk: {
        file: 'walk.png', frameWidth: 76, frameHeight: 120,
        // The eighth source cell is deliberately excluded from playback.
        frames: [0, 1, 2, 3, 4, 5, 6], frameRate: 9,
    },
    // Omit distance-based rate adjustment to honor the requested fixed 9 FPS walk loop.
    specialIdle: {
        file: 'special-idle.png', frameWidth: 61, frameHeight: 120,
        frames: [0, 1, 2, 3, 4, 5, 6, 7], frameRate: 8, afterMs: 8000,
    },
};

/** Approved simplified art, used unchanged for the initial hotel walking test. */
export const simplifiedDetectiveSpriteConfig: CharacterSpriteConfig = {
    enabled: true,
    key: 'detective-simplified-v2',
    assetPath: 'assets/characters/detective-v2/',
    // All eight frames have nontransparent bounds y=20..239 (220px tall).
    origin: { x: 0.5, y: 240 / 256 },
    scale: 162 / 220,
    sourceFacing: 1,
    mirrorX: true,
    movingSpeed: 2,
    idle: { file: 'walk.png', frameWidth: 256, frameHeight: 256, frames: [0], frameRate: 1 },
    // Frame 7 repeats frame 0's planted stance across the loop seam, causing a double hold.
    // Keep frame 6's distinct leg pose and wrap directly to 0; retain 125ms per pose.
    walk: { file: 'walk.png', frameWidth: 256, frameHeight: 256, frames: [0, 1, 2, 3, 4, 5, 6], frameRate: 8 },
};

// Change only this setting and fully reload the browser to restore the original detective.
export const detectiveVariant: 'original' | 'simplified' = 'simplified';
export const detectiveSpriteConfig = {
    original: originalDetectiveSpriteConfig,
    simplified: simplifiedDetectiveSpriteConfig,
}[detectiveVariant];
