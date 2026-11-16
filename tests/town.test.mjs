import test from 'node:test';
import assert from 'node:assert/strict';
import { hotel } from '../src/content/hotel.ts';
import { GameSession } from '../src/core/session.ts';
import { validateWorld, parseSave } from '../src/core/validation.ts';
import { loadLocal, saveLocal } from '../src/persistence/localSave.ts';
import { INTERIOR_MOVEMENT, OVERWORLD_MOVEMENT, stepMovement } from '../src/game/adapters/movement.ts';
import { canStand } from '../src/core/spatial.ts';
import { townBuildings } from '../src/content/townLayout.ts';

function use(session, id) {
    const target = hotel.locations[session.getPlayer().locationId].interactions.find(item => item.id === id);
    assert.ok(target, id);
    assert.ok(session.moveTo({ x: target.x, y: target.y, facing: session.getPlayer().facing }));
    assert.ok(session.interact(id));
}

test('town and hotel have validated reciprocal entrances and named, safe arrival points', () => {
    assert.doesNotThrow(() => validateWorld(hotel));
    assert.equal(hotel.locations.town.presentation, 'overworld');
    const session = new GameSession(hotel);
    assert.equal(session.getPlayer().locationId, 'lobby', 'existing starting point is retained');
    use(session, 'lobby-town');
    assert.deepEqual(session.getPlayer(), { locationId: 'town', ...hotel.locations.town.entries.fromHotel });
    assert.equal(session.interact('town-hotel'), false, 'arrival remains outside the E interaction radius');
    use(session, 'town-hotel');
    assert.deepEqual(session.getPlayer(), { locationId: 'lobby', ...hotel.locations.lobby.entries.fromTown });
    use(session, 'lobby-town');
    assert.deepEqual(session.getPlayer(), { locationId: 'town', ...hotel.locations.town.entries.fromHotel });
});

test('case, discovery and NPC memory survive both crossings and a saved town reload', () => {
    const baseline = new GameSession(hotel).getSave();
    const old = { ...baseline,
        cases: { 'case-001': { status: 'active', history: [{ kind: 'accepted', recordedAt: 41 }] } },
        discoveries: [{ id: 'folded-note', recordedAt: 52 }],
        npcMemories: [{ kind: 'accused', npcId: 'receptionist', locationId: 'lobby', recordedAt: 63 }] };
    const session = new GameSession(hotel, parseSave(old, hotel));
    use(session, 'lobby-town');
    const outside = session.getSave();
    assert.deepEqual(outside.cases, old.cases);
    assert.deepEqual(outside.discoveries, old.discoveries);
    assert.deepEqual(outside.npcMemories, old.npcMemories);
    const data = new Map();
    const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
    assert.ok(saveLocal(storage, session));
    const restored = new GameSession(hotel, loadLocal(storage, hotel).saved);
    assert.deepEqual(restored.getPlayer(), outside.player);
    assert.deepEqual(restored.getSave().cases, old.cases);
    assert.deepEqual(restored.getSave().discoveries, old.discoveries);
    assert.deepEqual(restored.getSave().npcMemories, old.npcMemories);
    use(restored, 'town-hotel');
    assert.deepEqual(restored.getSave().cases, old.cases);
    assert.deepEqual(restored.getSave().npcMemories, old.npcMemories);
});

test('pending consequential confirmation blocks the exterior door and cancellation changes no case state', () => {
    const session = new GameSession(hotel);
    session.toggleNotebook();
    assert.ok(session.openCaseOffer('case-001'));
    assert.ok(session.requestCaseAcceptance('case-001'));
    const token = session.getSnapshot().pendingAction.token;
    assert.equal(session.interact('lobby-town'), false);
    assert.equal(session.moveTo({ ...hotel.locations.lobby.interactions.find(item => item.id === 'lobby-town'), facing: 1 }), false);
    assert.ok(session.cancelAction(token));
    session.toggleNotebook();
    assert.deepEqual(session.getSave().cases, {});
    use(session, 'lobby-town');
    assert.deepEqual(session.getSave().cases, {});
});

test('interior movement keeps its prior defaults while overworld tuning is separate', () => {
    const motionA = { vx: 0, vy: 0 };
    const motionB = { vx: 0, vy: 0 };
    const start = hotel.locations.lobby.entries.arrival;
    assert.deepEqual(stepMovement(hotel.locations.lobby, start, motionA, 1, 0, 1 / 60),
        stepMovement(hotel.locations.lobby, start, motionB, 1, 0, 1 / 60, INTERIOR_MOVEMENT));
    assert.notDeepEqual(INTERIOR_MOVEMENT, OVERWORLD_MOVEMENT);
    const town = hotel.locations.town;
    const moved = stepMovement(town, town.entries.arrival, { vx: 0, vy: 0 }, 1, 1, 1 / 60, OVERWORLD_MOVEMENT);
    assert.ok(moved.x > town.entries.arrival.x && moved.y > town.entries.arrival.y);
});

test('staggered footprints match collision and leave a route around a lower building', () => {
    const town = hotel.locations.town;
    assert.equal(town.height, 1200);
    assert.deepEqual(town.obstacles, townBuildings.map(building => building.footprint));
    assert.ok(new Set(townBuildings.map(building => building.footprint.y)).size > 2);
    const footprint = townBuildings[3].footprint;
    assert.equal(canStand(town, { x: footprint.x + 40, y: footprint.y + 40 }), false);
    let position = { x: 140, y: 850, facing: 1 };
    const motion = { vx: 0, vy: 0 };
    for (let i = 0; i < 90; i++) position = stepMovement(town, position, motion, 1, 0, 1 / 60, OVERWORLD_MOVEMENT);
    assert.ok(position.x < footprint.x, 'the building blocks direct horizontal travel');
    for (const [axisX, axisY, frames] of [[0, -1, 110], [1, 0, 105], [0, 1, 170], [-1, 0, 105]]) {
        for (let i = 0; i < frames; i++) {
            position = stepMovement(town, position, motion, axisX, axisY, 1 / 60, OVERWORLD_MOVEMENT);
            assert.ok(canStand(town, position));
        }
    }
    assert.ok(position.y > footprint.y + footprint.height, 'Kane can circle the building vertically');
});

test('positions from the previous exterior walk strip remain loadable', () => {
    const base = new GameSession(hotel).getSave();
    for (const point of [{ x: 260, y: 565 }, { x: 820, y: 455 }, { x: 820, y: 565 }, { x: 1250, y: 600 }]) {
        const save = { ...base, player: { locationId: 'town', ...point, facing: 1 } };
        assert.deepEqual(parseSave(save, hotel)?.player, save.player);
    }
});

test('hotel entrance sits below its blocked facade and can be reached from the street', () => {
    const town = hotel.locations.town;
    const building = townBuildings.find(item => item.hotel).footprint;
    const entrance = town.interactions.find(item => item.id === 'town-hotel');
    assert.equal(entrance.x, 825);
    assert.equal(entrance.y, building.y + building.height + 55);
    assert.equal(canStand(town, entrance), true);
    assert.equal(canStand(town, { x: entrance.x, y: building.y + building.height - 20 }), false);
    const session = new GameSession(hotel);
    use(session, 'lobby-town');
    const motion = { vx: 0, vy: 0 };
    for (let i = 0; i < 70; i++) {
        assert.ok(session.moveTo(stepMovement(town, session.getPlayer(), motion, 0, -1, 1 / 60, OVERWORLD_MOVEMENT)));
    }
    assert.equal(session.getSnapshot().nearby?.id, 'town-hotel');
    assert.ok(session.interact('town-hotel'));
    assert.equal(session.getPlayer().locationId, 'lobby');
});

test('world validation rejects a town height that clips walkable ground', () => {
    const world = { ...hotel, locations: { ...hotel.locations, town: { ...hotel.locations.town, height: 768 } } };
    assert.throws(() => validateWorld(world), /Invalid world bounds/);
});
