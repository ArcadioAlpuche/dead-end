import test from 'node:test';
import assert from 'node:assert/strict';
import { hotel } from '../src/content/hotel.ts';
import { canStand, FOOT_RADIUS } from '../src/core/spatial.ts';
import { INTERIOR_MOVEMENT, stepMovement } from '../src/game/adapters/movement.ts';
import { LOBBY_PREVIEW_DESK, LOBBY_PREVIEW_WALK_BOUNDS } from '../src/game/adapters/lobbyProductionCollision.ts';
import { LOBBY_PRODUCTION_OPTIONAL_LAYERS } from '../src/game/adapters/lobbyProductionArt.ts';

const preview = { ...hotel.locations.lobby, walkBounds: LOBBY_PREVIEW_WALK_BOUNDS,
    obstacles: [LOBBY_PREVIEW_DESK] };

function walk(start, x, y, frames = 120) {
    let player = { ...start, facing: 1 };
    const motion = { vx: 0, vy: 0 };
    for (let i = 0; i < frames; i++) {
        player = stepMovement(preview, player, motion, x, y, 1 / 60, INTERIOR_MOVEMENT);
        assert.equal(canStand(preview, player), true, `invalid position at frame ${i}`);
    }
    return player;
}

test('desk body uses its painted bounds and the existing foot radius in preview and playable lobby', () => {
    assert.deepEqual(LOBBY_PREVIEW_DESK, { x: 440, y: 530, width: 580, height: 60 });
    assert.equal(FOOT_RADIUS, 13);
    assert.equal(canStand(preview, { x: 870, y: 589 }), false);
    assert.equal(canStand(preview, { x: 870, y: 600 }), false);
    assert.equal(canStand(preview, { x: 870, y: 603 }), true);
    assert.ok(hotel.locations.lobby.obstacles.some(obstacle =>
        obstacle.x === 440 && obstacle.y === 530 && obstacle.width === 580 && obstacle.height === 60));
});

test('Kane approaches the front, then walks horizontally along both directions', () => {
    const front = walk({ x: 870, y: 710 }, 0, -1);
    assert.ok(front.y >= 603 && front.y < 606, `front foot ${front.y}`);
    assert.equal(front.x, 870);
    const right = walk(front, 1, 0, 30);
    const left = walk(right, -1, 0, 60);
    assert.ok(right.x > front.x + 60);
    assert.ok(left.x < right.x - 60);
    assert.equal(right.y, front.y);
    assert.equal(left.y, front.y);
    assert.ok(LOBBY_PRODUCTION_OPTIONAL_LAYERS.find(layer => layer.id === 'desk').depth < front.y,
        'Kane in front of the painted desk after foot collision');
});

test('side approaches, corners, reversals and lower staircase route remain navigable', () => {
    const left = walk({ x: 380, y: 575 }, 1, 0);
    assert.ok(left.x <= LOBBY_PREVIEW_DESK.x - FOOT_RADIUS);
    const right = walk({ x: 1080, y: 575 }, -1, 0);
    assert.ok(right.x >= LOBBY_PREVIEW_DESK.x + LOBBY_PREVIEW_DESK.width + FOOT_RADIUS);
    const roundLeftCorner = walk(left, 1, 1, 120);
    assert.ok(roundLeftCorner.x > LOBBY_PREVIEW_DESK.x, 'diagonal input slides around corner');
    assert.ok(roundLeftCorner.y >= 603);
    const away = walk({ x: 1010, y: 604 }, 0, 1, 35);
    const reverse = walk(away, 0, -1, 35);
    assert.ok(away.y > 604);
    assert.ok(reverse.y < away.y);
    for (let x = 180; x <= 1260; x += 20) assert.equal(canStand(preview, { x, y: 710 }), true);
    assert.equal(canStand(preview, { x: 1175, y: 595 }), true);
});
