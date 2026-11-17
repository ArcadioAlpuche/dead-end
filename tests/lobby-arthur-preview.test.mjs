import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ARTHUR_OPTION_B, arthurOptionBPlacement, drawArthurOptionB,
    hasArthurOptionB, queueArthurOptionB, resolveArthurPreviewQuery } from '../src/game/adapters/lobbyArthurPreview.ts';
import { drawLobbyProductionArt, LOBBY_PRODUCTION_OPTIONAL_LAYERS } from '../src/game/adapters/lobbyProductionArt.ts';
import { resolveLobbyPreviewQuery } from '../src/game/lobbyPreviewQuery.ts';

test('Option B selection and tuning are confined to the development production preview', () => {
    const defaultQuery = '?lobbyPreview=1&production=1';
    assert.deepEqual(resolveArthurPreviewQuery(defaultQuery, resolveLobbyPreviewQuery(defaultQuery, true).production),
        { variant: 'optionB', x: 730, footY: 535, height: 170 });
    assert.equal(resolveArthurPreviewQuery(`${defaultQuery}&arthur=original`, true).variant, 'original');
    const query = '?lobbyPreview=1&production=1&arthur=optionB&arthurX=845&arthurY=535&arthurHeight=180';
    assert.deepEqual(resolveArthurPreviewQuery(query, resolveLobbyPreviewQuery(query, true).production),
        { variant: 'optionB', x: 845, footY: 535, height: 180 });
    for (const blocked of ['?arthur=optionB', '?lobbyPreview=1&arthur=optionB',
        '?lobbyPreview=1&reference=1&production=1&arthur=optionB']) {
        assert.equal(resolveArthurPreviewQuery(blocked, resolveLobbyPreviewQuery(blocked, true).production).variant,
            'original');
    }
    assert.equal(resolveArthurPreviewQuery(query, resolveLobbyPreviewQuery(query, false).production).variant,
        'original');
    assert.deepEqual(resolveArthurPreviewQuery('?lobbyPreview=1&production=1&arthur=optionB&arthurX=NaN&arthurY=999&arthurHeight=0', true),
        { variant: 'optionB', x: 730, footY: 535, height: 170 });
});

test('Option B maps its measured visible bounds to the selected world height and foot anchor', () => {
    const selection = resolveArthurPreviewQuery('?lobbyPreview=1&production=1', true);
    const placement = arthurOptionBPlacement(selection);
    const sourceHeight = ARTHUR_OPTION_B.visible.bottom - ARTHUR_OPTION_B.visible.top + 1;
    assert.equal(sourceHeight, 1470);
    assert.equal(placement.scale * sourceHeight, 170);
    assert.equal(placement.x, 730);
    assert.equal(placement.y, 535);
    assert.equal(placement.depth, 500);
    assert.ok(Math.abs(placement.originX * 1024 - 502.5) < 0.001);
    assert.ok(Math.abs(placement.originY * 1536 - 1498) < 0.001);
    assert.ok(placement.depth < LOBBY_PRODUCTION_OPTIONAL_LAYERS.find(layer => layer.id === 'desk').depth);
    const tuned = arthurOptionBPlacement({ variant: 'optionB', x: 850, footY: 525, height: 190 });
    assert.equal(tuned.x, 850);
    assert.equal(tuned.y, 525);
    assert.equal(tuned.scale * sourceHeight, 190);
});

test('Option B loads separately and keeps original Arthur as a fallback', () => {
    const queued = [];
    const load = { path: 'assets', prefix: 'template.',
        setPath(value) { this.path = value; }, setPrefix(value) { this.prefix = value; },
        image(key, path) { queued.push([key, path, this.path, this.prefix]); } };
    queueArthurOptionB({ load });
    assert.deepEqual(queued, [[ARTHUR_OPTION_B.key, ARTHUR_OPTION_B.file, '', '']]);
    assert.equal(load.path, 'assets');
    assert.equal(load.prefix, 'template.');
    const textures = { exists: key => key === ARTHUR_OPTION_B.key,
        get: () => ({ getSourceImage: () => ({ width: 1024, height: 1536 }) }) };
    assert.equal(hasArthurOptionB({ textures }), true);
    assert.equal(hasArthurOptionB({ textures: { ...textures, exists: () => false } }), false);
    assert.equal(hasArthurOptionB({ textures: { ...textures,
        get: () => ({ getSourceImage: () => ({ width: 1024, height: 1024 }) }) } }), false);
    const drawn = [];
    const scene = { textures: { exists: () => true,
        get: () => ({ getSourceImage: () => ({ width: 1320, height: 768 }) }) },
        add: { image(x, y, key) {
            drawn.push({ x, y, key });
            return { setOrigin() { return this; }, setDepth() { return this; } };
        } } };
    drawLobbyProductionArt(scene, true);
    assert.ok(!drawn.some(item => item.key === 'lobby-production.arthur'));
    assert.ok(drawn.some(item => item.key === 'lobby-production.desk'));
});

test('Option B drawing applies only placement scale and depth to the preview sprite', () => {
    const calls = [];
    const scene = { add: { image(x, y, key) {
        calls.push(['image', x, y, key]);
        return { setOrigin(a, b) { calls.push(['origin', a, b]); return this; },
            setScale(value) { calls.push(['scale', value]); return this; },
            setDepth(value) { calls.push(['depth', value]); return this; } };
    } } };
    const selection = resolveArthurPreviewQuery('?arthur=optionB&arthurHeight=175', true);
    drawArthurOptionB(scene, selection);
    assert.deepEqual(calls[0], ['image', 730, 535, ARTHUR_OPTION_B.key]);
    assert.equal(calls.find(call => call[0] === 'scale')[1], 175 / 1470);
    assert.deepEqual(calls.at(-1), ['depth', 500]);
});

test('processed Option B is a separate RGBA asset with the expected canvas', () => {
    const source = readFileSync('public/assets/characters/arthur-finch/arthur-option-b-approved.png');
    const cutout = readFileSync('public/assets/characters/arthur-finch/arthur-option-b-cutout.png');
    const signature = Buffer.from('89504e470d0a1a0a', 'hex');
    for (const png of [source, cutout]) {
        assert.deepEqual(png.subarray(0, 8), signature);
        assert.equal(png.readUInt32BE(16), 1024);
        assert.equal(png.readUInt32BE(20), 1536);
        assert.equal(png[24], 8);
        assert.equal(png[25], 6);
    }
    assert.notDeepEqual(source, cutout);
});
