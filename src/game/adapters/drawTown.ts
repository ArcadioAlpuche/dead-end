import type { Scene } from 'phaser';
import type { LocationDefinition } from '../../core/model.ts';

/** Small, untextured three-quarter-view block. Coordinates match the walk bounds. */
export function drawTown(scene: Scene, location: LocationDefinition): void {
    const g = scene.add.graphics();
    const w = location.width;
    g.fillStyle(0x1b2a32).fillRect(0, 0, w, 430);
    g.fillStyle(0x34464a).fillTriangle(0, 310, w, 250, w, 430).fillTriangle(0, 310, w, 430, 0, 430);
    for (let x = 35; x < w; x += 195) {
        g.fillStyle(0x15242b).fillRect(x, 230 + x % 55, 140, 200);
        g.fillStyle(0x41545a).fillTriangle(x, 230 + x % 55, x + 140, 230 + x % 55, x + 175, 205 + x % 55);
        g.fillStyle(0x0b171e).fillRect(x + 25, 335, 42, 65).fillRect(x + 88, 335, 42, 65);
    }
    g.fillStyle(0x68716b).fillRect(0, 430, w, 125);
    g.fillStyle(0x9a9681).fillTriangle(0, 430, w, 430, w, 445).fillTriangle(0, 430, w, 445, 0, 445);
    g.lineStyle(2, 0x4e5854, 0.65);
    for (let x = 0; x < w; x += 130) g.lineBetween(x, 445, x - 36, 555);
    g.fillStyle(0x252f36).fillRect(0, 555, w, 213);
    g.lineStyle(3, 0xb7a47a, 0.5);
    for (let x = 65; x < w; x += 165) g.lineBetween(x, 663, x + 86, 663);

    // Bellweather facade: front, shaded right wall, sloping roof and recessed entry.
    g.fillStyle(0x584f48).fillRect(690, 190, 270, 248);
    g.fillStyle(0x343a3a).fillTriangle(960, 190, 1035, 155, 1035, 400)
        .fillTriangle(960, 190, 1035, 400, 960, 438);
    g.fillStyle(0x242d32).fillTriangle(675, 190, 750, 153, 1035, 153)
        .fillTriangle(675, 190, 1035, 153, 960, 190);
    g.fillStyle(0x1a252b).fillRect(805, 325, 66, 113);
    g.fillStyle(0x604d3a).fillRect(810, 334, 55, 104);
    g.fillStyle(0xa28e61).fillRect(854, 389, 5, 5);
    for (const x of [720, 900]) for (const y of [230, 301]) {
        g.fillStyle(0x172b32).fillRect(x, y, 42, 45);
        g.lineStyle(2, 0xb59d6b, 0.6).strokeRect(x, y, 42, 45);
        g.lineBetween(x + 21, y, x + 21, y + 45);
    }
    g.fillStyle(0x918775).fillTriangle(805, 438, 871, 438, 898, 465)
        .fillTriangle(805, 438, 898, 465, 780, 465);
    scene.add.text(825, 204, 'BELLWEATHER HOTEL', {
        fontFamily: 'Georgia, serif', fontSize: '17px', color: '#e1d4ad',
    }).setOrigin(0.5);

    for (const x of [460, 1260]) {
        g.fillStyle(0x0d171c).fillRect(x - 4, 350, 8, 122);
        g.fillStyle(0xc8b27c).fillEllipse(x, 348, 21, 27);
        g.fillStyle(0x293139).fillRect(x - 13, 464, 26, 10);
    }
    for (const target of location.interactions) {
        scene.add.circle(target.x, target.y + 8, 3, 0xd1ba85, 0.8).setDepth(499);
    }
}
