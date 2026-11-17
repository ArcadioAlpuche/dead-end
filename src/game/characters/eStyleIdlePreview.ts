import type { GameObjects, Scene } from 'phaser';

// E-style's visible art is 162 source pixels high; this targets 145 world pixels.
// Preview-only tuning, independent of the unchanged Detective V2 scale.
export const E_STYLE_IDLE_SCALE = 145 / 162;

export const E_STYLE_IDLE_PREVIEW = {
    key: 'kane.style-e.idle-preview',
    path: 'assets/characters/kane/references/kane-e-style-idle-preview.png',
    width: 256,
    height: 256,
    // Match V2's foot anchor; E-style uses its own visual scale.
    originX: 0.5,
    originY: 240 / 256,
    scale: E_STYLE_IDLE_SCALE,
} as const;

/** Preview-only image; it has no animation, physics body, or session state. */
export function queueEStyleIdlePreview(scene: Pick<Scene, 'load'>): void {
    const previousPath = scene.load.path;
    const previousPrefix = scene.load.prefix;
    scene.load.setPath('');
    scene.load.setPrefix('');
    try {
        scene.load.image(E_STYLE_IDLE_PREVIEW.key, E_STYLE_IDLE_PREVIEW.path);
    } finally {
        scene.load.setPath(previousPath);
        scene.load.setPrefix(previousPrefix);
    }
}

export function createEStyleIdlePreview(scene: Pick<Scene, 'add' | 'textures'>, x: number, y: number): GameObjects.Image | null {
    const { key, width, height, originX, originY, scale } = E_STYLE_IDLE_PREVIEW;
    if (!scene.textures.exists(key)) return null;
    const source = scene.textures.get(key).getSourceImage();
    if (source.width !== width || source.height !== height) return null;
    return scene.add.image(x, y, key).setOrigin(originX, originY).setScale(scale).setDepth(y);
}
