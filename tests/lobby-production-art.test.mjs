import test from 'node:test';
import assert from 'node:assert/strict';
import { hotel } from '../src/content/hotel.ts';
import { LOBBY_PRODUCTION_CANVAS, LOBBY_PRODUCTION_LAYERS, LOBBY_PRODUCTION_OPTIONAL_LAYERS, LOBBY_PRODUCTION_PATH,
    drawLobbyProductionArt, hasLobbyProductionDesk, queueLobbyProductionArt } from '../src/game/adapters/lobbyProductionArt.ts';

test('preview desk collision is enabled only for a loaded full-canvas desk texture', () => {
    const textures = { exists: key => key === 'lobby-production.desk',
        get: () => ({ getSourceImage: () => ({ width: 1320, height: 768 }) }) };
    assert.equal(hasLobbyProductionDesk({ textures }), true);
    assert.equal(hasLobbyProductionDesk({ textures: { ...textures, exists: () => false } }), false);
    assert.equal(hasLobbyProductionDesk({ textures: { ...textures,
        get: () => ({ getSourceImage: () => ({ width: 1320, height: 700 }) }) } }), false);
});

test('production manifest locks the approved full-canvas order and floor line', () => {
    assert.deepEqual(LOBBY_PRODUCTION_CANVAS, { width: 1320, height: 768, floorY: 530 });
    assert.deepEqual(LOBBY_PRODUCTION_LAYERS.map(layer => layer.file), [
        'exterior-door.png', 'exterior-window.png', 'architecture.png', 'floor.png',
    ]);
    assert.deepEqual(LOBBY_PRODUCTION_LAYERS.map(layer => layer.depth), [-400, -390, -300, -200]);
    assert.deepEqual(LOBBY_PRODUCTION_OPTIONAL_LAYERS.map(layer => [layer.file, layer.depth]),
        [['arthur.png', 500], ['desk.png', 590]]);
    assert.ok(LOBBY_PRODUCTION_LAYERS.at(-1).depth < LOBBY_PRODUCTION_OPTIONAL_LAYERS[0].depth);
    assert.ok(LOBBY_PRODUCTION_OPTIONAL_LAYERS[0].depth < LOBBY_PRODUCTION_OPTIONAL_LAYERS[1].depth);
    assert.deepEqual(hotel.locations.lobby.walkBounds, { x: 30, y: 500, width: 1260, height: 165 });
    assert.deepEqual(hotel.locations.lobby.obstacles, [{ x: 560, y: 500, width: 220, height: 45 }]);
});

test('production queue uses only its own paths and restores the loader configuration', () => {
    const queued = [];
    const load = {
        path: 'assets', prefix: 'template.',
        setPath(value) { this.path = value; }, setPrefix(value) { this.prefix = value; },
        image(key, path) { queued.push({ key, path, pathAtQueue: this.path, prefixAtQueue: this.prefix }); },
    };
    queueLobbyProductionArt({ load });
    const allLayers = [...LOBBY_PRODUCTION_LAYERS, ...LOBBY_PRODUCTION_OPTIONAL_LAYERS];
    assert.deepEqual(queued.map(item => item.key), allLayers.map(layer => `lobby-production.${layer.id}`));
    assert.deepEqual(queued.map(item => item.path), allLayers.map(layer => `${LOBBY_PRODUCTION_PATH}${layer.file}`));
    assert.ok(queued.every(item => item.pathAtQueue === '' && item.prefixAtQueue === ''));
    assert.equal(load.path, 'assets');
    assert.equal(load.prefix, 'template.');
});

test('production draw rejects missing or wrong-size layers without replacement artwork or resizing', () => {
    const images = [];
    const scene = {
        textures: {
            exists: key => key !== 'lobby-production.exterior-window' && !key.endsWith('.arthur') && !key.endsWith('.desk'),
            get: key => ({ getSourceImage: () => key === 'lobby-production.floor'
                ? { width: 1319, height: 768 } : { width: 1320, height: 768 } }),
        },
        add: {
            image(x, y, key) {
                const item = { x, y, key, origin: null, depth: null };
                images.push(item);
                return { setOrigin(a, b) { item.origin = [a, b]; return this; },
                    setDepth(value) { item.depth = value; return this; } };
            },
        },
    };
    assert.deepEqual(drawLobbyProductionArt(scene), ['exterior-window.png', 'floor.png']);
    assert.deepEqual(images, [
        { x: 0, y: 0, key: 'lobby-production.exterior-door', origin: [0, 0], depth: -400 },
        { x: 0, y: 0, key: 'lobby-production.architecture', origin: [0, 0], depth: -300 },
    ]);
});

test('optional Arthur and desk render at native origin and ordered depths when valid', () => {
    const images = [];
    const scene = {
        textures: {
            exists: () => true,
            get: () => ({ getSourceImage: () => ({ width: 1320, height: 768 }) }),
        },
        add: {
            image(x, y, key) {
                const item = { x, y, key, origin: null, depth: null, scaleCalled: false };
                images.push(item);
                return { setOrigin(a, b) { item.origin = [a, b]; return this; },
                    setDepth(value) { item.depth = value; return this; },
                    setScale() { item.scaleCalled = true; return this; } };
            },
        },
    };
    assert.deepEqual(drawLobbyProductionArt(scene), []);
    assert.deepEqual(images.map(({ key, depth }) => [key, depth]), [
        ['lobby-production.exterior-door', -400], ['lobby-production.exterior-window', -390],
        ['lobby-production.architecture', -300], ['lobby-production.floor', -200],
        ['lobby-production.arthur', 500], ['lobby-production.desk', 590],
    ]);
    assert.ok(images.every(item => item.x === 0 && item.y === 0
        && item.origin[0] === 0 && item.origin[1] === 0 && !item.scaleCalled));
});

test('wrong-sized optional art is skipped without a required-layer warning', () => {
    const images = [];
    const scene = {
        textures: {
            exists: () => true,
            get: key => ({ getSourceImage: () => key === 'lobby-production.desk'
                ? { width: 1319, height: 768 } : { width: 1320, height: 768 } }),
        },
        add: {
            image(_x, _y, key) {
                images.push(key);
                return { setOrigin() { return this; }, setDepth() { return this; } };
            },
        },
    };
    assert.deepEqual(drawLobbyProductionArt(scene), []);
    assert.ok(images.includes('lobby-production.arthur'));
    assert.ok(!images.includes('lobby-production.desk'));
});
