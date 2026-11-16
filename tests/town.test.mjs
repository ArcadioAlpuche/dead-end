import test from 'node:test';
import assert from 'node:assert/strict';
import { hotel } from '../src/content/hotel.ts';
import { GameSession } from '../src/core/session.ts';
import { validateWorld, parseSave } from '../src/core/validation.ts';
import { loadLocal, saveLocal } from '../src/persistence/localSave.ts';
import { INTERIOR_MOVEMENT, OVERWORLD_MOVEMENT, stepMovement } from '../src/game/adapters/movement.ts';

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
