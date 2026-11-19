import test from 'node:test';
import assert from 'node:assert/strict';
import { hotel } from '../src/content/hotel.ts';
import { GameSession } from '../src/core/session.ts';
import { canStand, distance, FOOT_RADIUS, INTERACTION_RADIUS } from '../src/core/spatial.ts';
import { parseSave, validateWorld } from '../src/core/validation.ts';
import { loadLocal, saveLocal, SAVE_KEY } from '../src/persistence/localSave.ts';
import { stepMovement } from '../src/game/adapters/movement.ts';
import { LOBBY_PREVIEW_DESK } from '../src/game/adapters/lobbyProductionCollision.ts';
import { ARTHUR_OPTION_B } from '../src/game/adapters/lobbyArthurPreview.ts';

const lobby = hotel.locations.lobby;
const target = id => lobby.interactions.find(item => item.id === id);

function walk(start, axisX, axisY, frames) {
    const motion = { vx: 0, vy: 0 };
    let position = { ...start };
    for (let i = 0; i < frames; i++) {
        position = stepMovement(lobby, position, motion, axisX, axisY, 1 / 60);
        assert.ok(canStand(lobby, position), `unsafe foot at frame ${i}`);
    }
    return position;
}

test('illustrated lobby geometry matches the desk, stair art and approved Arthur placement', () => {
    assert.doesNotThrow(() => validateWorld(hotel));
    assert.deepEqual(lobby.walkBounds, { x: 30, y: 550, width: 1260, height: 218 });
    assert.ok(lobby.obstacles.some(o => JSON.stringify(o) === JSON.stringify(LOBBY_PREVIEW_DESK)));
    assert.ok(lobby.obstacles.some(o => o.x === 1050 && o.y === 530 && o.width === 250 && o.height === 40));
    assert.equal(lobby.obstacles.length, 2, 'only painted desk and stair base block the floor');
    assert.equal(canStand(lobby, { x: 230, y: 543 }), false, 'feet stay away from wall');
    assert.equal(canStand(lobby, { x: 335, y: 570 }), true, 'no invisible post on open floor');
    assert.equal(canStand(lobby, { x: 1040, y: 570 }), false, 'painted stair base still blocks this corner');
    assert.equal(FOOT_RADIUS, 13);
    assert.equal(canStand(lobby, { x: 730, y: 590 }), false);
    assert.equal(canStand(lobby, { x: 730, y: 603 }), true);
    assert.equal(canStand(lobby, { x: 1194, y: 543 }), false);
    assert.equal(canStand(lobby, target('lobby-stairs')), true);
    assert.deepEqual([ARTHUR_OPTION_B.defaultX, ARTHUR_OPTION_B.defaultFootY,
        ARTHUR_OPTION_B.defaultHeight, ARTHUR_OPTION_B.depth], [730, 535, 170, 500]);
    assert.deepEqual([target('receptionist').x, target('receptionist').y], [730, 660]);
});

test('all arrivals stay clear; street, Arthur and staircase remain reachable', () => {
    for (const entry of Object.values(lobby.entries)) assert.ok(canStand(lobby, entry));
    assert.ok(distance(lobby.entries.fromTown, target('lobby-town')) > INTERACTION_RADIUS);
    assert.ok(distance(lobby.entries.fromStairs, target('lobby-stairs')) > INTERACTION_RADIUS);
    for (let x = 180; x <= 1260; x += 10) assert.ok(canStand(lobby, { x, y: 710 }), `lower route ${x}`);
    const deskFront = walk({ x: 730, y: 710, facing: 1 }, 0, -1, 120);
    assert.ok(deskFront.y >= 603 && deskFront.y < 606);
    assert.ok(distance(deskFront, target('receptionist')) < INTERACTION_RADIUS);
    const side = walk(deskFront, 1, 0, 90);
    assert.ok(side.x > 900 && side.y === deskFront.y, 'counter front stays navigable');
    const fromLeft = walk({ x: 400, y: 575, facing: 1 }, 1, 0, 90);
    assert.ok(fromLeft.x <= 440 - FOOT_RADIUS, 'left end blocks a direct side approach');
    const aroundLeft = walk(fromLeft, 1, 1, 120);
    assert.ok(aroundLeft.x > 440 && aroundLeft.y >= 603, 'Kane slides around the left corner');
    const fromRight = walk({ x: 1040, y: 600, facing: -1 }, -1, 0, 90);
    assert.ok(fromRight.x >= 1020 + FOOT_RADIUS, 'right end blocks a direct side approach');
    const stairFront = walk(lobby.entries.fromStairs, 0, -1, 110);
    assert.ok(stairFront.y >= 583 && distance(stairFront, target('lobby-stairs')) < INTERACTION_RADIUS);
    const streetFront = walk(lobby.entries.fromTown, 0, -1, 110);
    assert.ok(distance(streetFront, target('lobby-town')) < INTERACTION_RADIUS);
});

test('town, stairs, fourth-floor hallway and Room 407 return through safe named entries', () => {
    const session = new GameSession(hotel);
    const use = id => {
        const interaction = hotel.locations[session.getPlayer().locationId].interactions.find(item => item.id === id);
        assert.ok(session.moveTo({ x: interaction.x, y: interaction.y, facing: 1 }), id);
        assert.ok(session.interact(id), id);
        assert.ok(canStand(hotel.locations[session.getPlayer().locationId], session.getPlayer()), id);
    };
    use('lobby-town'); use('town-hotel');
    assert.deepEqual(session.getPlayer(), { locationId: 'lobby', ...lobby.entries.fromTown });
    use('lobby-stairs'); use('stairs-fourth'); use('hall-407');
    use('407-hall'); use('fourth-stairs'); use('stairs-lobby');
    assert.deepEqual(session.getPlayer(), { locationId: 'lobby', ...lobby.entries.fromStairs });
    use('receptionist');
    assert.equal(session.getSnapshot().conversation?.id, 'reception');
});

test('old lobby saves relocate only newly blocked positions, preserving durable state', () => {
    const baseline = new GameSession(hotel).getSave();
    const state = { ...baseline, version: 4, contentVersion: 'bellweather-1',
        discoveries: [{ id: 'folded-note', recordedAt: 123 }],
        npcMemories: [{ kind: 'accused', npcId: 'receptionist', locationId: 'lobby', recordedAt: 456 }],
        cases: { 'case-001': { status: 'active', history: [{ kind: 'accepted', recordedAt: 789 }] } } };
    for (const point of [{ x: 670, y: 575 }, { x: 1130, y: 555 }, { x: 200, y: 515 }]) {
        const saved = parseSave({ ...state, player: { locationId: 'lobby', ...point, facing: -1 } }, hotel);
        assert.deepEqual(saved.player, { locationId: 'lobby', x: lobby.entries.arrival.x,
            y: lobby.entries.arrival.y, facing: -1 });
        assert.deepEqual(saved.discoveries, state.discoveries);
        assert.deepEqual(saved.npcMemories, state.npcMemories);
        assert.deepEqual(saved.cases, state.cases);
        assert.equal(saved.contentVersion, 'bellweather-3');
    }
    const valid = parseSave({ ...state, player: { locationId: 'lobby', x: 200, y: 590, facing: -1 } }, hotel);
    assert.deepEqual(valid.player, { locationId: 'lobby', x: 200, y: 590, facing: -1 });
    const other = parseSave({ ...state, player: { locationId: 'room407', x: 190, y: 550, facing: -1 } }, hotel);
    assert.equal(other.player.locationId, 'room407');
});

test('previous illustrated-lobby saves relocate only feet outside the revised floor', () => {
    const baseline = new GameSession(hotel).getSave();
    const previous = { ...baseline, version: 4, contentVersion: 'bellweather-2',
        player: { locationId: 'lobby', x: 230, y: 550, facing: -1 },
        discoveries: [{ id: 'folded-note', recordedAt: 123 }],
        npcMemories: [{ kind: 'accused', npcId: 'receptionist', locationId: 'lobby', recordedAt: 456 }] };
    const migrated = parseSave(previous, hotel);
    assert.deepEqual(migrated.player, { locationId: 'lobby', x: 245, y: 710, facing: -1 });
    assert.deepEqual(migrated.discoveries, previous.discoveries);
    assert.deepEqual(migrated.npcMemories, previous.npcMemories);
    assert.equal(migrated.contentVersion, 'bellweather-3');
    const valid = parseSave({ ...previous, player: { locationId: 'lobby', x: 230, y: 650, facing: -1 } }, hotel);
    assert.deepEqual(valid.player, { locationId: 'lobby', x: 230, y: 650, facing: -1 });
    assert.equal(parseSave({ ...previous, player: { locationId: 'lobby', x: 730, y: 575, facing: 1 } }, hotel), null);
});

test('invalid and unsupported saves stay unreadable without overwriting the original slot', () => {
    const baseline = new GameSession(hotel).getSave();
    for (const bad of [
        { ...baseline, version: 4, contentVersion: 'bellweather-1', player: { locationId: 'lobby', x: 670, y: 520, facing: 1 } },
        { ...baseline, player: { locationId: 'lobby', x: 730, y: 575, facing: 1 } },
        { ...baseline, contentVersion: 'bellweather-9' },
    ]) {
        assert.equal(parseSave(bad, hotel), null);
        const raw = JSON.stringify(bad);
        const storage = { getItem: key => key === SAVE_KEY ? raw : null,
            setItem: () => assert.fail('unreadable original must not be overwritten') };
        assert.equal(loadLocal(storage, hotel).writable, false);
    }
});

test('a legacy desk position loads safely and autosaves the upgraded lobby without losing progress', () => {
    const baseline = new GameSession(hotel).getSave();
    const old = { ...baseline, version: 4, contentVersion: 'bellweather-1',
        player: { locationId: 'lobby', x: 670, y: 575, facing: -1 },
        discoveries: [{ id: 'champagne-glass', recordedAt: 99 }],
        cases: { 'case-001': { status: 'active', history: [{ kind: 'accepted', recordedAt: 88 }] } } };
    const values = new Map([[SAVE_KEY, JSON.stringify(old)]]);
    const storage = { getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value) };
    const loaded = loadLocal(storage, hotel);
    assert.equal(loaded.writable, true);
    assert.equal(values.get(SAVE_KEY), JSON.stringify(old), 'reading never rewrites the original');
    const session = new GameSession(hotel, loaded.saved);
    assert.deepEqual(session.getPlayer(), { locationId: 'lobby', x: 245, y: 710, facing: -1 });
    assert.ok(saveLocal(storage, session));
    const restored = new GameSession(hotel, loadLocal(storage, hotel).saved);
    assert.deepEqual(restored.getSave(), session.getSave());
    assert.deepEqual(restored.getSave().discoveries, old.discoveries);
    assert.deepEqual(restored.getSave().cases, old.cases);
});
