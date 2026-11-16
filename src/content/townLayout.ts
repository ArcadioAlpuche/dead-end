import type { Rect } from '../core/model.ts';

export interface TownBuilding {
    readonly footprint: Rect;
    readonly wallHeight: number;
    readonly front: number;
    readonly side: number;
    readonly hotel?: boolean;
}

export const bellweatherEntrance = { x: 825, y: 455 } as const;

// Ground-contact rectangles are shared by collision and the temporary drawing.
// Their staggered positions leave a north/south lane, a cross street and a plaza.
export const townBuildings: readonly TownBuilding[] = [
    { footprint: { x: 100, y: 235, width: 250, height: 165 }, wallHeight: 115, front: 0x48545a, side: 0x303b42 },
    { footprint: { x: 680, y: 270, width: 300, height: 130 }, wallHeight: 125, front: 0x62594f, side: 0x3a3f40, hotel: true },
    { footprint: { x: 1190, y: 220, width: 260, height: 175 }, wallHeight: 115, front: 0x4c5655, side: 0x303c3d },
    { footprint: { x: 160, y: 755, width: 295, height: 230 }, wallHeight: 105, front: 0x555048, side: 0x373a38 },
    { footprint: { x: 1050, y: 790, width: 300, height: 220 }, wallHeight: 120, front: 0x4b5351, side: 0x303938 },
];
