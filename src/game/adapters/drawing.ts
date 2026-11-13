import type { GameObjects, Scene } from 'phaser';
import type { LocationDefinition, Prop } from '../../core/model.ts';

const ink = 0x10181e;
const brass = 0xb99a60;

function label(scene: Scene, x: number, y: number, text: string, size = 13, color = '#c7b895'): GameObjects.Text {
    return scene.add.text(x, y, text, { fontFamily: 'Georgia, serif', fontSize: size, color, align: 'center' }).setOrigin(0.5);
}

function drawProp(scene: Scene, prop: Prop): void {
    const { x, y, width: w, height: h } = prop;
    const g = scene.add.graphics();
    if (prop.kind === 'window') {
        g.fillStyle(0x080f18).fillRect(x - 8, y - 8, w + 16, h + 16);
        g.fillStyle(0x253d4a).fillRect(x, y, w, h);
        for (let i = 0; i < 8; i++) {
            const roof = h * (0.3 + (i % 3) * 0.12);
            g.fillStyle(i % 2 ? 0x15252f : 0x1a303c).fillRect(x + i * w / 8, y + roof, w / 8 - 2, h - roof);
        }
        g.lineStyle(1, 0x78929a, 0.3);
        for (let i = 0; i < 22; i++) {
            const rx = x + 6 + (i * 37) % (w - 18);
            const ry = y + 12 + (i * 53) % (h - 40);
            g.lineBetween(rx, ry, rx - 5, ry + 24);
        }
        g.fillStyle(ink).fillRect(x + w / 2 - 4, y, 8, h).fillRect(x, y + h / 2, w, 7);
        g.lineStyle(3, brass, 0.5).strokeRect(x, y, w, h);
    } else if (prop.kind === 'door') {
        g.fillStyle(0x0c1215).fillRect(x - 9, y - 9, w + 18, h + 9);
        g.fillStyle(0x382d2b).fillRect(x, y, w, h);
        g.lineStyle(2, brass, 0.45).strokeRect(x + 12, y + 22, w - 24, h - 38);
        g.fillStyle(brass).fillCircle(x + w - 20, y + h * 0.61, 4);
        g.fillStyle(0x171c1e).fillRect(x + w / 2 - 60, y - 40, 120, 24);
        label(scene, x + w / 2, y - 28, prop.label ?? '');
    } else if (prop.kind === 'stairs') {
        // A cutaway diagram gives all three flights a visible destination; travel itself is abbreviated.
        g.lineStyle(4, brass, 0.65);
        const floorNames = ['4  FOURTH', '3  THIRD', '2  SECOND', 'G  LOBBY'];
        for (let level = 0; level < 4; level++) {
            const yy = y + level * 100;
            g.lineBetween(x, yy, x + w, yy);
            label(scene, x + 55, yy - 18, floorNames[level], 12);
            if (level < 3) {
                const left = level % 2 === 0 ? x + 160 : x + 370;
                for (let stair = 0; stair < 10; stair++) {
                    const xx = left + stair * 20;
                    const sy = yy + (level % 2 === 0 ? stair : 9 - stair) * 10;
                    g.lineBetween(xx, sy, xx + 20, sy);
                    g.lineBetween(xx + 20, sy, xx + 20, sy + (level % 2 === 0 ? 10 : -10));
                }
            }
        }
        label(scene, x + w / 2, 690, 'THREE FLIGHTS  ·  INTERMEDIATE FLOORS CLOSED', 12);
    } else {
        // Prop art and the corresponding footprints in content use the same floor coordinates.
        g.fillStyle(0x050a0d, 0.35).fillEllipse(x + w / 2, y + h + 6, w + 34, 25);
        g.setDepth(y + h);
        if (prop.kind === 'bed') {
            g.fillStyle(0x493d35).fillRect(x, y, w, h);
            g.fillStyle(0xaaa18a).fillRect(x + 8, y + 25, w - 16, h - 34);
            g.fillStyle(0xccc1a6).fillRoundedRect(x + 19, y + 34, w - 38, 27, 4);
            g.fillStyle(0x4e6260).fillRect(x + 8, y + 85, w - 16, 42);
        } else {
            if (prop.kind === 'desk') {
                // Receptionist behind the counter, entirely placeholder geometry.
                g.fillStyle(0xbbb09a).fillCircle(x + w / 2, y - 42, 15);
                g.fillStyle(0x192a31).fillRoundedRect(x + w / 2 - 25, y - 25, 50, 65, 5);
                g.fillStyle(0x2b2423).fillRect(x + w / 2 - 16, y - 57, 32, 9);
            }
            g.fillStyle(0x3c2e29).fillRect(x, y + 10, w, h - 10);
            g.fillStyle(0x70523b).fillRect(x - 6, y, w + 12, 12);
            g.lineStyle(2, brass, 0.45).strokeRect(x + 12, y + 25, w - 24, h - 40);
            if (prop.label) label(scene, x + w / 2, y + 50, prop.label).setDepth(y + h + 1);
            if (prop.detail === 'glass') {
                g.lineStyle(2, 0xdad8bd).lineBetween(x + w / 2, y - 25, x + w / 2, y - 3);
                g.lineBetween(x + w / 2 - 8, y - 3, x + w / 2 + 8, y - 3);
                g.strokeEllipse(x + w / 2, y - 33, 19, 24);
                g.fillStyle(0x78433c).fillRect(x + w / 2 + 5, y - 43, 4, 5);
            }
            if (prop.detail === 'note') {
                g.fillStyle(0xdfd0a7).fillRect(x + w / 2 - 18, y - 10, 36, 12);
                g.lineStyle(1, 0x7e7460).lineBetween(x + w / 2 - 10, y - 5, x + w / 2 + 9, y - 5);
            }
        }
    }
}

export function drawLocation(scene: Scene, location: LocationDefinition): void {
    const w = location.width;
    const g = scene.add.graphics();
    g.fillStyle(0x1c292e).fillRect(0, 0, w, 500);
    g.fillStyle(0x293637).fillRect(0, 150, w, 350);
    g.fillStyle(0x172126).fillRect(0, 385, w, 115);
    for (let x = 30; x < w; x += 90) {
        g.lineStyle(1, brass, 0.11).strokeRect(x, 165, 62, 210);
        g.lineStyle(1, brass, 0.18).strokeRect(x, 402, 62, 80);
    }
    g.fillStyle(0x574638).fillRect(0, 500, w, 165);
    g.lineStyle(1, 0xa08c6b, 0.17);
    for (let y = 512; y < 665; y += 29) g.lineBetween(0, y, w, y);
    for (let x = 0; x < w; x += 120) g.lineBetween(x, 500, x - 85, 665);
    g.fillStyle(0x483333).fillRect(35, 557, w - 70, 75);
    g.lineStyle(2, brass, 0.35).strokeRect(42, 564, w - 84, 61);
    g.fillStyle(0x0c141a).fillRect(0, 665, w, 103);
    g.fillStyle(brass, 0.45).fillRect(0, 496, w, 4);
    g.fillStyle(0x0c141a).fillRect(0, 0, w, 145);
    g.lineStyle(1, brass, 0.5).lineBetween(40, 142, w - 40, 142);
    label(scene, w / 2, 103, location.id === 'lobby' ? 'B E L L W E A T H E R' : location.name.toUpperCase(), 29);
    for (const prop of location.props) drawProp(scene, prop);
    for (const target of location.interactions) {
        scene.add.circle(target.x, target.y + 8, 3, brass, 0.7).setDepth(499);
    }
}

export function drawDetective(scene: Scene): { body: GameObjects.Container; legs: GameObjects.Rectangle[] } {
    const shadow = scene.add.ellipse(0, 0, 48, 15, 0x05090c, 0.5);
    const legs = [scene.add.rectangle(-9, -15, 12, 31, 0x11191e), scene.add.rectangle(9, -15, 12, 31, 0x11191e)];
    const coat = scene.add.graphics().fillStyle(0x8b795c)
        .fillTriangle(-19, -69, 18, -69, 25, -18).fillTriangle(-19, -69, 25, -18, -24, -18);
    const collar = scene.add.graphics().fillStyle(0xc8ba96).fillTriangle(-10, -69, 12, -69, 1, -49);
    const face = scene.add.rectangle(4, -84, 22, 25, 0xc0a486);
    const brim = scene.add.rectangle(0, -96, 49, 7, 0x302a26);
    const hat = scene.add.rectangle(-3, -105, 29, 18, 0x4c4031);
    const band = scene.add.rectangle(-3, -99, 29, 4, 0x171c20);
    return { body: scene.add.container(0, 0, [shadow, ...legs, coat, collar, face, brim, hat, band]), legs };
}
