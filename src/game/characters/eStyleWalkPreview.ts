import type { CharacterSpriteConfig } from './animation.ts';
import { E_STYLE_IDLE_SCALE } from './eStyleIdlePreview.ts';

/** Approved E-style sprite shared by the comparison and illustrated playable lobby. */
export const eStyleWalkPreviewConfig: CharacterSpriteConfig = {
    enabled: true,
    key: 'kane-e-style-walk-preview',
    assetPath: 'assets/characters/kane/',
    origin: { x: 0.5, y: 240 / 256 },
    scale: E_STYLE_IDLE_SCALE,
    sourceFacing: 1,
    // The approved three-quarter idle reads left; the six walking poses face right.
    idleSourceFacing: -1,
    mirrorX: true,
    movingSpeed: 2,
    idle: {
        file: 'references/kane-e-style-idle-preview.png',
        frameWidth: 256, frameHeight: 256, frames: [0], frameRate: 1,
    },
    walk: {
        file: 'style-e/walk.png',
        frameWidth: 256, frameHeight: 256, frames: [0, 1, 2, 3, 4, 5], frameRate: 12,
    },
    // Initial two-step stride estimate: 132 source px = 118 world px per cycle.
    // At 235 world px/s, the distance-matched controller plays about 12 FPS.
    walkCycleDistance: 132,
};
