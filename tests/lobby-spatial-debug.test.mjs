import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveLobbyPreviewQuery } from '../src/game/lobbyPreviewQuery.ts';
import { createLobbySpatialDebug, LOBBY_PROPOSED_DEBUG_OBSTACLES,
    LOBBY_PROPOSED_STAIR_ANCHOR } from '../src/game/adapters/lobbySpatialDebug.ts';
import { FOOT_RADIUS, INTERACTION_RADIUS } from '../src/core/spatial.ts';
import { canStand } from '../src/core/spatial.ts';
import { stepMovement, INTERIOR_MOVEMENT } from '../src/game/adapters/movement.ts';
import { hotel } from '../src/content/hotel.ts';
import { LOBBY_PREVIEW_DESK } from '../src/game/adapters/lobbyProductionCollision.ts';

test('spatial debug requires development production preview and explicit debug flag', () => {
    assert.deepEqual(resolveLobbyPreviewQuery('?lobbyPreview=1&production=1&debug=1', true),
        { preview: true, reference: false, production: true, debug: true });
    for (const query of [
        '?lobbyPreview=1&production=1', '?lobbyPreview=1&debug=1',
        '?lobbyPreview=1&reference=1&production=1&debug=1', '?production=1&debug=1',
    ]) assert.equal(resolveLobbyPreviewQuery(query, true).debug, false, query);
    assert.equal(resolveLobbyPreviewQuery('?lobbyPreview=1&production=1&debug=1', false).debug, false);
});

test('overlay draws walk bounds, radius-inset foot-center bounds and updates world coordinates', () => {
    const calls = []; const items = [];
    const scene = { add: {
        graphics() {
            const item = {
                setDepth(n) { calls.push(['depth', n]); return this; },
                lineStyle(w, color) { calls.push(['lineStyle', w, color]); return this; },
                strokeRect(...args) { calls.push(['rect', ...args]); return this; },
                strokeCircle(...args) { calls.push(['circle', ...args]); return this; },
                fillStyle(color) { calls.push(['fillStyle', color]); return this; },
                fillRect(...args) { calls.push(['fillRect', ...args]); return this; },
                fillCircle(...args) { calls.push(['dot', ...args]); return this; },
                clear() { calls.push(['clear']); return this; },
                destroy() { calls.push(['destroy']); },
            };
            items.push(item); return item;
        },
        text() {
            const item = {
                setDepth() { return this; }, setScrollFactor(value) { calls.push(['scroll', value]); return this; },
                setText(value) { calls.push(['text', value]); return this; },
                destroy() { calls.push(['destroy']); },
            };
            items.push(item); return item;
        },
    } };
    const overlay = createLobbySpatialDebug(scene, { x: 30, y: 530, width: 1260, height: 238 }, { x: 245, y: 710 });
    assert.equal(FOOT_RADIUS, 13);
    assert.ok(calls.some(call => JSON.stringify(call) === JSON.stringify(['rect', 30, 530, 1260, 238])));
    assert.ok(calls.some(call => JSON.stringify(call) === JSON.stringify(['rect', 43, 543, 1234, 212])));
    assert.ok(calls.some(call => JSON.stringify(call) === JSON.stringify(['circle', 245, 710, 13])));
    assert.deepEqual(LOBBY_PROPOSED_DEBUG_OBSTACLES.map(({ label, x, y, width, height }) =>
        [label, x, y, width, height]), [
        ['Plant', 70, 540, 95, 75], ['West post', 320, 495, 32, 70],
        ['Left chair', 270, 625, 70, 50], ['Table', 425, 645, 70, 35],
        ['Right chair', 580, 625, 75, 50], ['Desk', 440, 530, 580, 60],
        ['East post', 1025, 495, 32, 70], ['Stair base', 1050, 530, 250, 40],
    ]);
    for (const obstacle of LOBBY_PROPOSED_DEBUG_OBSTACLES) {
        assert.ok(calls.some(call => JSON.stringify(call) === JSON.stringify([
            'rect', obstacle.x, obstacle.y, obstacle.width, obstacle.height,
        ])), obstacle.label);
    }
    assert.ok(calls.some(call => JSON.stringify(call) === JSON.stringify([
        'rect', LOBBY_PREVIEW_DESK.x, LOBBY_PREVIEW_DESK.y,
        LOBBY_PREVIEW_DESK.width, LOBBY_PREVIEW_DESK.height,
    ])), 'active preview desk must be shown separately');
    assert.deepEqual(LOBBY_PROPOSED_STAIR_ANCHOR, { x: 1175, y: 595 });
    assert.equal(INTERACTION_RADIUS, 86);
    assert.ok(calls.some(call => JSON.stringify(call) === JSON.stringify(['circle', 1175, 595, 86])));
    assert.ok(hotel.locations.lobby.obstacles.some(obstacle =>
        obstacle.x === 440 && obstacle.y === 530 && obstacle.width === 580 && obstacle.height === 60));
    overlay.update({ x: 1175.25, y: 700.5 });
    assert.ok(calls.some(call => JSON.stringify(call) === JSON.stringify(['circle', 1175.25, 700.5, 13])));
    assert.ok(calls.some(call => call[0] === 'text' && call[1].includes('x=1175.3 y=700.5  r=13')));
    assert.ok(calls.some(call => JSON.stringify(call) === JSON.stringify(['scroll', 0])));
    overlay.destroy();
    assert.equal(calls.filter(call => call[0] === 'destroy').length, items.length);
});

test('proposed stair base blocks painted step while leaving the anchor and lower route reachable', () => {
    const proposed = {
        ...hotel.locations.lobby,
        walkBounds: { x: 30, y: 530, width: 1260, height: 238 },
        obstacles: LOBBY_PROPOSED_DEBUG_OBSTACLES.map(({ x, y, width, height }) => ({ x, y, width, height })),
    };
    assert.equal(canStand(proposed, { x: 1194, y: 543 }), false);
    assert.equal(canStand(proposed, LOBBY_PROPOSED_STAIR_ANCHOR), true);
    assert.equal(canStand(proposed, { x: 1175, y: 700 }), true);
    for (let x = 180; x <= 1260; x++) assert.equal(canStand(proposed, { x, y: 710 }), true, `lower route x=${x}`);
    let position = { x: 1175, y: 700, facing: -1 };
    const motion = { vx: 0, vy: 0 };
    let passedAnchor = false;
    for (let frame = 0; frame < 120; frame++) {
        position = stepMovement(proposed, position, motion, 0, -1, 1 / 60, INTERIOR_MOVEMENT);
        if (Math.abs(position.y - LOBBY_PROPOSED_STAIR_ANCHOR.y) < 2) passedAnchor = true;
    }
    assert.equal(passedAnchor, true);
    assert.ok(position.y >= 583, 'foot center cannot cross the radius-expanded base');
    assert.ok(hotel.locations.lobby.obstacles.some(obstacle =>
        obstacle.x === 1050 && obstacle.y === 530 && obstacle.width === 250 && obstacle.height === 40));
});
