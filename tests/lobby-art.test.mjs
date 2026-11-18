import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hotel } from '../src/content/hotel.ts';
import { LOBBY_ART_LAYERS, LOBBY_ART_PATH, LOBBY_REFERENCE, drawLobbyArt, queueLobbyArt } from '../src/game/adapters/lobbyArt.ts';

test('temporary lobby layers are RGBA PNGs at their declared crop sizes', () => {
    for (const layer of LOBBY_ART_LAYERS) {
        const png = readFileSync(`public/${LOBBY_ART_PATH}${layer.file}`);
        assert.deepEqual(png.subarray(0, 8), Buffer.from('89504e470d0a1a0a', 'hex'));
        assert.equal(png.readUInt32BE(16), layer.width, layer.id);
        assert.equal(png.readUInt32BE(20), layer.height, layer.id);
        assert.equal(png[25], 6, `${layer.id} uses RGBA`);
        assert.ok(layer.x >= 0 && layer.y >= 0 && layer.x + layer.width <= 1320 && layer.y + layer.height <= 768);
    }
    assert.equal(LOBBY_ART_LAYERS.find(layer => layer.id === 'desk').depth, 545);
    assert.ok(hotel.locations.lobby.obstacles.some(obstacle =>
        obstacle.x === 440 && obstacle.y === 530 && obstacle.width === 580 && obstacle.height === 60));
});

test('preview loader queues only declared images and restores the template loader path', () => {
    const loaded = [];
    const load = {
        path: 'assets', prefix: 'template.',
        setPath(value) { this.path = value; }, setPrefix(value) { this.prefix = value; },
        image(key, path) { loaded.push({ key, path, loaderPath: this.path, prefix: this.prefix }); },
    };
    queueLobbyArt({ load });
    assert.equal(loaded.length, LOBBY_ART_LAYERS.length);
    assert.deepEqual(loaded.map(item => item.key), LOBBY_ART_LAYERS.map(layer => `lobby-preview.${layer.id}`));
    assert.ok(loaded.every(item => item.loaderPath === '' && item.prefix === '' && item.path.startsWith(LOBBY_ART_PATH)));
    assert.equal(load.path, 'assets');
    assert.equal(load.prefix, 'template.');
});

test('opaque architectural reference fits fully without changing its aspect ratio', () => {
    const png = readFileSync(`public/${LOBBY_REFERENCE.file}`);
    assert.deepEqual(png.subarray(0, 8), Buffer.from('89504e470d0a1a0a', 'hex'));
    assert.equal(png.readUInt32BE(16), 1448);
    assert.equal(png.readUInt32BE(20), 1086);
    assert.equal(png[25], 2, 'RGB source has no alpha and is not a transparent layer');
    assert.equal(LOBBY_REFERENCE.width * LOBBY_REFERENCE.scale, 1024);
    assert.equal(LOBBY_REFERENCE.height * LOBBY_REFERENCE.scale, 768);
    assert.equal(LOBBY_REFERENCE.x, (1320 - 1024) / 2);
    const queued = [];
    const load = {
        path: 'assets', prefix: '',
        setPath(value) { this.path = value; }, setPrefix(value) { this.prefix = value; },
        image(key, path) { queued.push([key, path]); },
    };
    queueLobbyArt({ load }, 'reference');
    assert.deepEqual(queued, [['lobby-preview.reference', LOBBY_REFERENCE.file]]);
    assert.equal(load.path, 'assets');
});

test('reference comparison draws one uniformly scaled image, never the temporary layer set', () => {
    const images = [];
    const scene = {
        textures: {
            exists: key => key === 'lobby-preview.reference',
            get: () => ({ getSourceImage: () => ({ width: 1448, height: 1086 }) }),
        },
        add: {
            image(x, y, key) {
                const item = { x, y, key, origin: null, scale: null, depth: null };
                images.push(item);
                return { setOrigin(a, b) { item.origin = [a, b]; return this; },
                    setScale(value) { item.scale = value; return this; },
                    setDepth(value) { item.depth = value; return this; } };
            },
        },
    };
    assert.deepEqual(drawLobbyArt(scene, 'reference'), []);
    assert.deepEqual(images, [{ x: 148, y: 0, key: 'lobby-preview.reference',
        origin: [0, 0], scale: 768 / 1086, depth: -300 }]);
});

test('renderer places images at manifest origins and reports a wrong-sized layer', () => {
    const images = []; const failures = [];
    const scene = {
        textures: {
            exists: key => key !== 'lobby-preview.floor',
            get: key => ({ getSourceImage: () => {
                const layer = LOBBY_ART_LAYERS.find(item => key === `lobby-preview.${item.id}`);
                return { width: layer.width, height: layer.height };
            } }),
        },
        add: {
            image(x, y, key) {
                const item = { x, y, key, origin: null, depth: null };
                images.push(item);
                return { setOrigin(a, b) { item.origin = [a, b]; return this; }, setDepth(value) { item.depth = value; return this; } };
            },
            rectangle(x, y, width, height) {
                failures.push({ x, y, width, height });
                return { setDepth() { return this; } };
            },
        },
    };
    assert.deepEqual(drawLobbyArt(scene), ['floor']);
    assert.equal(failures.length, 1);
    for (const item of images) {
        const layer = LOBBY_ART_LAYERS.find(entry => item.key === `lobby-preview.${entry.id}`);
        assert.deepEqual([item.x, item.y, item.depth, item.origin], [layer.x, layer.y, layer.depth, [0, 0]]);
    }
});
