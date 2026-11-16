import type { Scene } from 'phaser';
import type { LocationDefinition } from '../../core/model.ts';
import { bellweatherEntrance, townBuildings } from '../../content/townLayout.ts';
import type { TownBuilding } from '../../content/townLayout.ts';

function drawBuilding(scene: Scene, building: TownBuilding): void {
    const { x, y, width, height } = building.footprint;
    const bottom = y + height;
    const top = y - building.wallHeight;
    const sideWidth = 38;
    const frontWidth = width - sideWidth;
    const g = scene.add.graphics().setDepth(bottom);
    g.fillStyle(0x101b1d, 0.35).fillEllipse(x + width / 2, bottom + 7, width + 28, 32);
    g.fillStyle(building.front).fillRect(x, top, frontWidth, bottom - top);
    g.fillStyle(building.side).fillTriangle(x + frontWidth, top, x + width, top - 29, x + width, bottom - 26)
        .fillTriangle(x + frontWidth, top, x + width, bottom - 26, x + frontWidth, bottom);
    g.fillStyle(0x253138).fillTriangle(x - 11, top, x + 25, top - 29, x + width, top - 29)
        .fillTriangle(x - 11, top, x + width, top - 29, x + frontWidth, top);
    g.lineStyle(2, 0x9d967d, 0.3).lineBetween(x, bottom, x + frontWidth, bottom);

    const windows = building.hotel ? [x + 40, x + frontWidth - 82] : [x + 30, x + frontWidth - 70];
    for (const wx of windows) for (const wy of [top + 68, top + 142]) {
        if (wy + 37 >= bottom - 105) continue;
        g.fillStyle(0x1b3037).fillRect(wx, wy, 38, 37);
        g.lineStyle(2, 0xa9a084, 0.7).strokeRect(wx, wy, 38, 37);
        g.lineBetween(wx + 19, wy, wx + 19, wy + 37);
    }
    if (building.hotel) {
        const doorCenter = bellweatherEntrance.x;
        g.fillStyle(0x19242a).fillRect(doorCenter - 33, bottom - 106, 66, 106);
        g.fillStyle(0x584636).fillRect(doorCenter - 27, bottom - 99, 54, 99);
        g.fillStyle(0xb9a471).fillCircle(doorCenter + 17, bottom - 45, 3);
        g.fillStyle(0x9b907a).fillTriangle(doorCenter - 37, bottom, doorCenter + 37, bottom, doorCenter + 68, bottom + 28)
            .fillTriangle(doorCenter - 37, bottom, doorCenter + 68, bottom + 28, doorCenter - 65, bottom + 28);
        scene.add.text(bellweatherEntrance.x, top + 39, 'BELLWEATHER HOTEL', {
            fontFamily: 'Georgia, serif', fontSize: '18px', color: '#e0d0a8',
        }).setOrigin(0.5).setDepth(bottom + 1);
    }
}

/** Elevated block with staggered footprints and connected streets on a tall map. */
export function drawTown(scene: Scene, location: LocationDefinition): void {
    const w = location.width;
    const h = location.height ?? 768;
    const g = scene.add.graphics().setDepth(-1000);
    g.fillStyle(0x34423d).fillRect(0, 0, w, h);
    g.fillStyle(0x414f49).fillRect(0, 185, w, 375);
    g.fillStyle(0x303e43).fillRect(415, 0, 145, 750).fillRect(1060, 0, 135, 750);
    g.fillStyle(0x303e43).fillRect(0, 560, w, 190).fillRect(500, 750, 540, h - 750);
    g.fillStyle(0x7a7e70).fillRect(0, 520, w, 40).fillRect(0, 750, w, 45);
    g.fillRect(375, 0, 40, 560).fillRect(560, 0, 42, 560);
    g.fillRect(1020, 0, 40, 560).fillRect(1195, 0, 38, 560);
    g.fillRect(455, 750, 45, h - 750).fillRect(1040, 750, 45, h - 750);
    g.lineStyle(2, 0xa4a58b, 0.35);
    for (let x = 0; x < w; x += 120) {
        g.lineBetween(x, 520, x - 28, 560);
        g.lineBetween(x, 750, x - 24, 795);
    }
    for (let y = 0; y < h; y += 112) {
        g.lineBetween(375, y, 415, y - 20);
        g.lineBetween(1040, y, 1085, y - 20);
    }
    g.lineStyle(3, 0xb6aa82, 0.4);
    for (let x = 70; x < w; x += 175) g.lineBetween(x, 655, x + 83, 655);
    for (let y = 815; y < h; y += 155) g.lineBetween(770, y, 770, y + 75);
    // A paved open court provides room to travel around the lower building row.
    g.fillStyle(0x68746b).fillEllipse(770, 900, 300, 190);
    g.lineStyle(2, 0xaab09a, 0.45).strokeEllipse(770, 900, 300, 190);

    for (const building of townBuildings) drawBuilding(scene, building);
    for (const target of location.interactions) {
        scene.add.circle(target.x, target.y + 8, 3, 0xd1ba85, 0.8).setDepth(target.y + 1);
    }
}
