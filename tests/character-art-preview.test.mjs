import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveCharacterPreviewQuery } from '../src/game/characterPreviewQuery.ts';
import { simplifiedDetectiveSpriteConfig } from '../src/game/characters/detective.ts';
import { E_STYLE_IDLE_PREVIEW, E_STYLE_IDLE_SCALE, createEStyleIdlePreview, queueEStyleIdlePreview } from '../src/game/characters/eStyleIdlePreview.ts';
import { eStyleWalkPreviewConfig } from '../src/game/characters/eStyleWalkPreview.ts';
import { PlayerAnimationController } from '../src/game/characters/animation.ts';
import { queueCharacterSprites, validSpriteConfig } from '../src/game/characters/spriteAssets.ts';
import { resolveEStyleLobbyPreviewQuery } from '../src/game/eStyleLobbyPreviewQuery.ts';

test('character preview is development-only and cannot replace a lobby preview', () => {
    assert.equal(resolveCharacterPreviewQuery('?characterPreview=1', true, false), true);
    assert.equal(resolveCharacterPreviewQuery('?characterPreview=1', false, false), false);
    assert.equal(resolveCharacterPreviewQuery('?characterPreview=1&lobbyPreview=1', true, true), false);
    assert.equal(resolveCharacterPreviewQuery('', true, false), false);
});

test('E-style reference remains an opaque contact sheet, while V2 remains the live sprite', () => {
    const reference = readFileSync('public/assets/characters/kane/references/kane-style-e-reference.png');
    assert.deepEqual(reference.subarray(0, 8), Buffer.from('89504e470d0a1a0a', 'hex'));
    assert.equal(reference.readUInt32BE(16), 1536);
    assert.equal(reference.readUInt32BE(20), 1024);
    assert.equal(reference[25], 2, 'RGB reference has no alpha channel');
    assert.equal(simplifiedDetectiveSpriteConfig.assetPath, 'assets/characters/detective-v2/');
    assert.equal(simplifiedDetectiveSpriteConfig.scale, 162 / 220);
    assert.deepEqual(simplifiedDetectiveSpriteConfig.walk.frames, [0, 1, 2, 3, 4, 5, 6]);
});

test('E-style idle export is transparent and independently scaled to 145px with the V2 foot anchor', () => {
    const image = readFileSync('public/assets/characters/kane/references/kane-e-style-idle-preview.png');
    assert.deepEqual(image.subarray(0, 8), Buffer.from('89504e470d0a1a0a', 'hex'));
    assert.equal(image.readUInt32BE(16), 256);
    assert.equal(image.readUInt32BE(20), 256);
    assert.equal(image[24], 8);
    assert.equal(image[25], 6, 'RGBA color type');
    assert.equal(E_STYLE_IDLE_PREVIEW.scale, E_STYLE_IDLE_SCALE);
    assert.equal(162 * E_STYLE_IDLE_SCALE, 145);
    assert.ok(Math.abs(E_STYLE_IDLE_SCALE / simplifiedDetectiveSpriteConfig.scale - 1.22) < 0.01);
    assert.equal(E_STYLE_IDLE_PREVIEW.originY, simplifiedDetectiveSpriteConfig.origin.y);
    assert.equal(E_STYLE_IDLE_PREVIEW.originX, simplifiedDetectiveSpriteConfig.origin.x);
});

test('static idle is queued without changing the shared loader path or prefix', () => {
    const queued = [];
    const load = {
        path: 'assets', prefix: 'game.',
        setPath(value) { this.path = value; }, setPrefix(value) { this.prefix = value; },
        image(key, path) { queued.push([key, path, this.path, this.prefix]); },
    };
    queueEStyleIdlePreview({ load });
    assert.deepEqual(queued, [[E_STYLE_IDLE_PREVIEW.key, E_STYLE_IDLE_PREVIEW.path, '', '']]);
    assert.equal(load.path, 'assets');
    assert.equal(load.prefix, 'game.');
});

test('E-style image uses the provided foot position and rejects unavailable or wrong-sized textures', () => {
    const images = [];
    const scene = {
        textures: {
            exists: key => key === E_STYLE_IDLE_PREVIEW.key,
            get: () => ({ getSourceImage: () => ({ width: 256, height: 256 }) }),
        },
        add: { image(x, y, key) {
            const item = { x, y, key, origin: null, scale: null, depth: null };
            images.push(item);
            return { setOrigin(a, b) { item.origin = [a, b]; return this; },
                setScale(value) { item.scale = value; return this; },
                setDepth(value) { item.depth = value; return this; } };
        } },
    };
    assert.ok(createEStyleIdlePreview(scene, 700, 620));
    assert.deepEqual(images, [{ x: 700, y: 620, key: E_STYLE_IDLE_PREVIEW.key,
        origin: [0.5, 240 / 256], scale: E_STYLE_IDLE_SCALE, depth: 620 }]);
    scene.textures.exists = () => false;
    assert.equal(createEStyleIdlePreview(scene, 700, 620), null);
    scene.textures.exists = () => true;
    scene.textures.get = () => ({ getSourceImage: () => ({ width: 255, height: 256 }) });
    assert.equal(createEStyleIdlePreview(scene, 700, 620), null);
    assert.equal(images.length, 1);
});

test('E-style substitution requires the isolated production preview and explicit flag', () => {
    assert.equal(resolveEStyleLobbyPreviewQuery('?lobbyPreview=1&production=1&kaneIdle=1', true), true);
    assert.equal(resolveEStyleLobbyPreviewQuery('?lobbyPreview=1&production=1', true), false);
    assert.equal(resolveEStyleLobbyPreviewQuery('?kaneIdle=1', false), false);
});

test('E-style walk is six consecutive cells using the approved idle, scale and sole anchor', () => {
    const sheet = readFileSync('public/assets/characters/kane/style-e/walk.png');
    assert.deepEqual(sheet.subarray(0, 8), Buffer.from('89504e470d0a1a0a', 'hex'));
    assert.deepEqual([sheet.readUInt32BE(16), sheet.readUInt32BE(20), sheet[24], sheet[25]], [1536, 256, 8, 6]);
    assert.equal(validSpriteConfig(eStyleWalkPreviewConfig), true);
    assert.deepEqual(eStyleWalkPreviewConfig.walk.frames, [0, 1, 2, 3, 4, 5]);
    assert.deepEqual([eStyleWalkPreviewConfig.walk.frameWidth, eStyleWalkPreviewConfig.walk.frameHeight], [256, 256]);
    assert.equal(eStyleWalkPreviewConfig.idle.file, 'references/kane-e-style-idle-preview.png');
    assert.equal(eStyleWalkPreviewConfig.scale, E_STYLE_IDLE_SCALE);
    assert.equal(eStyleWalkPreviewConfig.sourceFacing, 1);
    assert.equal(eStyleWalkPreviewConfig.idleSourceFacing, -1);
    assert.deepEqual(eStyleWalkPreviewConfig.origin, { x: 0.5, y: 240 / 256 });
});

test('preview queues only its own E-style idle and six-frame walk textures', () => {
    const queued = [];
    const load = {
        path: 'assets/', prefix: 'prior.',
        setPath(value) { this.path = value; }, setPrefix(value) { this.prefix = value; },
        spritesheet(key, path, dimensions) { queued.push([key, path, dimensions, this.path, this.prefix]); },
    };
    queueCharacterSprites({ load, textures: { exists: () => false } }, eStyleWalkPreviewConfig);
    assert.deepEqual(queued.map(row => [row[1], row[2]]), [
        ['assets/characters/kane/references/kane-e-style-idle-preview.png', { frameWidth: 256, frameHeight: 256 }],
        ['assets/characters/kane/style-e/walk.png', { frameWidth: 256, frameHeight: 256 }],
    ]);
    assert.ok(queued.every(row => row[3] === '' && row[4] === ''));
    assert.equal(load.path, 'assets/');
    assert.equal(load.prefix, 'prior.');
});

test('preview walk follows resolved travel, loops without resets, and returns to static idle', () => {
    const config = eStyleWalkPreviewConfig;
    const referenceSpeed = config.walkCycleDistance * config.scale * config.walk.frameRate / config.walk.frames.length;
    assert.ok(Math.abs(referenceSpeed - 235) < 2);
    const calls = { clips: [], rates: [], flips: [] };
    const controller = new PlayerAnimationController({
        sourceFacing: config.sourceFacing, mirrorX: config.mirrorX,
        movingSpeed: config.movingSpeed, walkReferenceSpeed: referenceSpeed,
    }, {
        play: clip => calls.clips.push(clip),
        setMirrored: value => calls.flips.push(value),
        setTimeScale: value => calls.rates.push(value),
        setPaused: () => {},
    });
    for (let i = 0; i < 30; i++) controller.update({ speed: 235, facing: 1, deltaMs: 16, paused: false });
    assert.deepEqual(calls.clips, ['idle', 'walk']);
    assert.ok(Math.abs(calls.rates.at(-1) - 1) < 0.01);
    controller.update({ speed: 145, facing: -1, deltaMs: 16, paused: false });
    assert.deepEqual(calls.flips, [true]);
    assert.ok(Math.abs(calls.rates.at(-1) - 145 / referenceSpeed) < 0.001);
    controller.update({ speed: 0, facing: -1, deltaMs: 16, paused: false });
    assert.deepEqual(calls.clips, ['idle', 'walk', 'idle']);
    assert.equal(calls.rates.at(-1), 1);
});
