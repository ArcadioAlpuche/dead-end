import type { Scene } from 'phaser';

export const LOBBY_ART_PATH = 'assets/locations/bellweather/lobby/preview/';
export const LOBBY_REFERENCE = {
    file: 'assets/locations/bellweather/lobby/reference/approved-architectural-reference.png',
    width: 1448, height: 1086,
    // Fit the full 4:3 frame inside the 1320 × 768 world without stretching or cropping.
    scale: 768 / 1086,
    x: 148, y: 0, depth: -300,
} as const;

// World pixels. Each PNG has its own transparent canvas and this top-left position.
// Depth 545 is the desk's existing floor contact; Kane sorts at his foot y.
export const LOBBY_ART_LAYERS = [
    { id: 'architecture', file: 'preview-architecture.png', x: 0, y: 0, width: 1320, height: 500, depth: -300 },
    { id: 'floor', file: 'preview-floor.png', x: 0, y: 500, width: 1320, height: 268, depth: -200 },
    { id: 'arthur', file: 'preview-arthur.png', x: 635, y: 350, width: 70, height: 110, depth: 500 },
    { id: 'desk', file: 'preview-desk.png', x: 540, y: 390, width: 260, height: 165, depth: 545 },
    { id: 'foreground', file: 'preview-foreground.png', x: 900, y: 475, width: 90, height: 210, depth: 680 },
    { id: 'lighting', file: 'preview-lighting.png', x: 0, y: 0, width: 1320, height: 768, depth: 900 },
] as const;

export function queueLobbyArt(scene: Pick<Scene, 'load'>, mode: 'layers' | 'reference' = 'layers'): void {
    // Absolute-to-page asset paths work with Vite's relative base and the template loader path.
    const previousPath = scene.load.path;
    const previousPrefix = scene.load.prefix;
    scene.load.setPath('');
    scene.load.setPrefix('');
    try {
        if (mode === 'reference') {
            scene.load.image('lobby-preview.reference', LOBBY_REFERENCE.file);
        } else {
            for (const layer of LOBBY_ART_LAYERS) {
                scene.load.image(`lobby-preview.${layer.id}`, `${LOBBY_ART_PATH}${layer.file}`);
            }
        }
    } finally {
        scene.load.setPath(previousPath);
        scene.load.setPrefix(previousPrefix);
    }
}

export function drawLobbyArt(scene: Pick<Scene, 'add' | 'textures'>, mode: 'layers' | 'reference' = 'layers'): string[] {
    if (mode === 'reference') {
        const key = 'lobby-preview.reference';
        const texture = scene.textures.exists(key) ? scene.textures.get(key) : null;
        const source = texture?.getSourceImage();
        if (!source || source.width !== LOBBY_REFERENCE.width || source.height !== LOBBY_REFERENCE.height) {
            return ['architectural reference'];
        }
        scene.add.image(LOBBY_REFERENCE.x, LOBBY_REFERENCE.y, key).setOrigin(0, 0)
            .setScale(LOBBY_REFERENCE.scale).setDepth(LOBBY_REFERENCE.depth);
        return [];
    }
    const unavailable: string[] = [];
    for (const layer of LOBBY_ART_LAYERS) {
        const key = `lobby-preview.${layer.id}`;
        const texture = scene.textures.exists(key) ? scene.textures.get(key) : null;
        const source = texture?.getSourceImage();
        if (!source || source.width !== layer.width || source.height !== layer.height) {
            unavailable.push(layer.id);
            // Visible failure indicator, never a misleading substitute for approved art.
            scene.add.rectangle(layer.x + layer.width / 2, layer.y + layer.height / 2,
                layer.width, layer.height, 0x65383d, 0.28).setDepth(layer.depth);
            continue;
        }
        scene.add.image(layer.x, layer.y, key).setOrigin(0, 0).setDepth(layer.depth);
    }
    return unavailable;
}
