import type { Scene } from 'phaser';

export const LOBBY_PRODUCTION_PATH = 'assets/locations/bellweather/lobby/production/';
export const LOBBY_PRODUCTION_CANVAS = { width: 1320, height: 768, floorY: 530 } as const;

// Every export is a full-canvas RGBA PNG with the same (0, 0) origin.
// Exterior views sit behind transparent openings in architecture; the floor starts at y=530.
export const LOBBY_PRODUCTION_LAYERS = [
    { id: 'exterior-door', file: 'exterior-door.png', depth: -400 },
    { id: 'exterior-window', file: 'exterior-window.png', depth: -390 },
    { id: 'architecture', file: 'architecture.png', depth: -300 },
    { id: 'floor', file: 'floor.png', depth: -200 },
] as const;

// Optional character/furniture exports use the same full-canvas origin.
// Arthur stays behind the desk; Kane sorts against the desk at its painted base y=590.
export const LOBBY_PRODUCTION_OPTIONAL_LAYERS = [
    { id: 'arthur', file: 'arthur.png', depth: 500 },
    { id: 'desk', file: 'desk.png', depth: 590 },
] as const;

export function queueLobbyProductionArt(scene: Pick<Scene, 'load'>): void {
    const previousPath = scene.load.path;
    const previousPrefix = scene.load.prefix;
    scene.load.setPath('');
    scene.load.setPrefix('');
    try {
        for (const layer of LOBBY_PRODUCTION_LAYERS) {
            scene.load.image(`lobby-production.${layer.id}`, `${LOBBY_PRODUCTION_PATH}${layer.file}`);
        }
        for (const layer of LOBBY_PRODUCTION_OPTIONAL_LAYERS) {
            scene.load.image(`lobby-production.${layer.id}`, `${LOBBY_PRODUCTION_PATH}${layer.file}`);
        }
    } finally {
        scene.load.setPath(previousPath);
        scene.load.setPrefix(previousPrefix);
    }
}

export function hasLobbyProductionDesk(scene: Pick<Scene, 'textures'>): boolean {
    const key = 'lobby-production.desk';
    if (!scene.textures.exists(key)) return false;
    const source = scene.textures.get(key).getSourceImage();
    return source?.width === LOBBY_PRODUCTION_CANVAS.width
        && source?.height === LOBBY_PRODUCTION_CANVAS.height;
}

export function drawLobbyProductionArt(scene: Pick<Scene, 'add' | 'textures'>, omitOriginalArthur = false): string[] {
    const unavailable: string[] = [];
    const drawLayer = (layer: { id: string; file: string; depth: number }): boolean => {
        const key = `lobby-production.${layer.id}`;
        const texture = scene.textures.exists(key) ? scene.textures.get(key) : null;
        const source = texture?.getSourceImage();
        if (!source || source.width !== LOBBY_PRODUCTION_CANVAS.width || source.height !== LOBBY_PRODUCTION_CANVAS.height) {
            return false;
        }
        scene.add.image(0, 0, key).setOrigin(0, 0).setDepth(layer.depth);
        return true;
    };
    for (const layer of LOBBY_PRODUCTION_LAYERS) {
        if (!drawLayer(layer)) unavailable.push(layer.file);
    }
    for (const layer of LOBBY_PRODUCTION_OPTIONAL_LAYERS) {
        if (omitOriginalArthur && layer.id === 'arthur') continue;
        drawLayer(layer);
    }
    return unavailable;
}
