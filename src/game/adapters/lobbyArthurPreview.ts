import type { Scene } from 'phaser';

export const ARTHUR_OPTION_B = {
    key: 'lobby-production.arthur-option-b',
    file: 'assets/characters/arthur-finch/arthur-option-b-cutout.png',
    canvas: { width: 1024, height: 1536 },
    visible: { left: 253, top: 29, right: 752, bottom: 1498 },
    depth: 500,
    defaultX: 730,
    defaultFootY: 535,
    defaultHeight: 170,
} as const;

export type ArthurPreviewSelection = {
    variant: 'original' | 'optionB';
    x: number;
    footY: number;
    height: number;
};

function boundedNumber(params: URLSearchParams, key: string, fallback: number, min: number, max: number): number {
    const text = params.get(key);
    if (text === null || text.trim() === '') return fallback;
    const value = Number(text);
    return Number.isFinite(value) && value >= min && value <= max ? value : fallback;
}

/** Only the isolated production preview may select or reposition Option B Arthur. */
export function resolveArthurPreviewQuery(search: string, productionPreview: boolean): ArthurPreviewSelection {
    const params = new URLSearchParams(search);
    return {
        variant: productionPreview && params.get('arthur') !== 'original' ? 'optionB' : 'original',
        x: boundedNumber(params, 'arthurX', ARTHUR_OPTION_B.defaultX, 700, 1000),
        footY: boundedNumber(params, 'arthurY', ARTHUR_OPTION_B.defaultFootY, 500, 650),
        height: boundedNumber(params, 'arthurHeight', ARTHUR_OPTION_B.defaultHeight, 120, 240),
    };
}

export function queueArthurOptionB(scene: Pick<Scene, 'load'>): void {
    const previousPath = scene.load.path;
    const previousPrefix = scene.load.prefix;
    scene.load.setPath('');
    scene.load.setPrefix('');
    try {
        scene.load.image(ARTHUR_OPTION_B.key, ARTHUR_OPTION_B.file);
    } finally {
        scene.load.setPath(previousPath);
        scene.load.setPrefix(previousPrefix);
    }
}

export function hasArthurOptionB(scene: Pick<Scene, 'textures'>): boolean {
    if (!scene.textures.exists(ARTHUR_OPTION_B.key)) return false;
    const source = scene.textures.get(ARTHUR_OPTION_B.key).getSourceImage();
    return source?.width === ARTHUR_OPTION_B.canvas.width
        && source?.height === ARTHUR_OPTION_B.canvas.height;
}

export function arthurOptionBPlacement(selection: ArthurPreviewSelection) {
    const visibleWidth = ARTHUR_OPTION_B.visible.right - ARTHUR_OPTION_B.visible.left + 1;
    const visibleHeight = ARTHUR_OPTION_B.visible.bottom - ARTHUR_OPTION_B.visible.top + 1;
    const scale = selection.height / visibleHeight;
    return {
        x: selection.x,
        y: selection.footY,
        scale,
        originX: (ARTHUR_OPTION_B.visible.left + (visibleWidth - 1) / 2) / ARTHUR_OPTION_B.canvas.width,
        originY: ARTHUR_OPTION_B.visible.bottom / ARTHUR_OPTION_B.canvas.height,
        depth: ARTHUR_OPTION_B.depth,
    };
}

export function drawArthurOptionB(scene: Pick<Scene, 'add'>, selection: ArthurPreviewSelection): void {
    const placement = arthurOptionBPlacement(selection);
    scene.add.image(placement.x, placement.y, ARTHUR_OPTION_B.key)
        .setOrigin(placement.originX, placement.originY)
        .setScale(placement.scale).setDepth(placement.depth);
}
