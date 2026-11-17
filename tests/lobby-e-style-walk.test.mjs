import test from 'node:test';
import assert from 'node:assert/strict';
import { hotel } from '../src/content/hotel.ts';
import { canStand, FOOT_RADIUS } from '../src/core/spatial.ts';
import { INTERIOR_MOVEMENT, stepMovement } from '../src/game/adapters/movement.ts';
import { PlayerAnimationController } from '../src/game/characters/animation.ts';
import { eStyleWalkPreviewConfig } from '../src/game/characters/eStyleWalkPreview.ts';
import { LOBBY_PRODUCTION_CANVAS, LOBBY_PRODUCTION_OPTIONAL_LAYERS } from '../src/game/adapters/lobbyProductionArt.ts';
import { resolveLobbyPreviewQuery } from '../src/game/lobbyPreviewQuery.ts';
import { resolveEStyleLobbyPreviewQuery } from '../src/game/eStyleLobbyPreviewQuery.ts';

test('legacy kaneIdle flag enables E-style walk only in the development production preview', () => {
    const url = '?lobbyPreview=1&production=1&kaneIdle=1';
    assert.equal(resolveEStyleLobbyPreviewQuery(url, resolveLobbyPreviewQuery(url, true).production), true);
    for (const search of ['?kaneIdle=1', '?lobbyPreview=1&kaneIdle=1',
        '?lobbyPreview=1&reference=1&production=1&kaneIdle=1']) {
        assert.equal(resolveEStyleLobbyPreviewQuery(search, resolveLobbyPreviewQuery(search, true).production), false);
    }
    assert.equal(resolveEStyleLobbyPreviewQuery(url, resolveLobbyPreviewQuery(url, false).production), false);
});

test('production floor movement keeps the same foot position and drives right, left, stop, and reversal', () => {
    const location = { ...hotel.locations.lobby,
        walkBounds: { x: 30, y: LOBBY_PRODUCTION_CANVAS.floorY, width: 1260, height: 238 }, obstacles: [] };
    const config = eStyleWalkPreviewConfig;
    const clips = [], flips = [], rates = [];
    const controller = new PlayerAnimationController({
        sourceFacing: config.sourceFacing, idleSourceFacing: config.idleSourceFacing,
        mirrorX: config.mirrorX, movingSpeed: config.movingSpeed,
        walkReferenceSpeed: config.walkCycleDistance * config.scale * config.walk.frameRate / config.walk.frames.length,
    }, {
        play: clip => clips.push(clip), setMirrored: flip => flips.push(flip),
        setTimeScale: rate => rates.push(rate), setPaused: () => {},
    });
    let player = { x: 850, y: 710, facing: 1 };
    const motion = { vx: 0, vy: 0 };
    function advance(axisX, frames) {
        for (let frame = 0; frame < frames; frame++) {
            const previous = player;
            player = stepMovement(location, player, motion, axisX, 0, 1 / 60, INTERIOR_MOVEMENT);
            const speed = Math.hypot(player.x - previous.x, player.y - previous.y) * 60;
            controller.update({ speed, facing: player.facing, deltaMs: 1000 / 60, paused: false });
        }
    }
    assert.equal(FOOT_RADIUS, 13);
    assert.equal(config.scale * 162, 145);
    assert.deepEqual(config.origin, { x: 0.5, y: 240 / 256 });
    assert.equal(config.walk.frameRate, 12);
    assert.deepEqual(config.walk.frames, [0, 1, 2, 3, 4, 5]);
    advance(1, 35);
    assert.equal(controller.animation, 'walk');
    assert.equal(player.facing, 1);
    assert.ok(Math.abs(rates.at(-1) - 1) < 0.03);
    advance(0, 35);
    assert.equal(controller.animation, 'idle');
    assert.equal(player.facing, 1);
    advance(-1, 35);
    assert.equal(controller.animation, 'walk');
    assert.equal(player.facing, -1);
    advance(0, 35);
    assert.equal(controller.animation, 'idle');
    assert.equal(player.facing, -1);
    advance(1, 1);
    assert.equal(player.facing, 1, 'direction reverses on the first opposing input');
    assert.deepEqual(clips.slice(0, 5), ['idle', 'walk', 'idle', 'walk', 'idle']);
    assert.deepEqual(flips, [true, false, true, false],
        'clip changes and reversal reuse the correct mirror state without redundant flips');
    assert.equal(player.y, 710, 'visual changes do not move the foot anchor');
    assert.equal(canStand(location, player), true);
});

test('E-style foot depth still sorts around the reception desk without changing obstacles', () => {
    const desk = LOBBY_PRODUCTION_OPTIONAL_LAYERS.find(layer => layer.id === 'desk');
    assert.equal(desk.depth, 590);
    assert.ok(575 < desk.depth, 'Kane behind the desk at a back-floor foot position');
    assert.ok(710 > desk.depth, 'Kane in front of the desk on the lower route');
    assert.deepEqual(hotel.locations.lobby.obstacles, [{ x: 560, y: 500, width: 220, height: 45 }]);
});
