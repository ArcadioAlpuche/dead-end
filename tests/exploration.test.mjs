// Node 22.18+ runs these TypeScript modules directly; no test dependency is needed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { hotel } from '../src/content/hotel.ts';
import { GameSession } from '../src/core/session.ts';
import { parseSave, validateWorld } from '../src/core/validation.ts';
import { canStand } from '../src/core/spatial.ts';
import { stepMovement } from '../src/game/adapters/movement.ts';
import { loadLocal, saveLocal, SAVE_KEY } from '../src/persistence/localSave.ts';

function approach(session, id) {
    const target = hotel.locations[session.getPlayer().locationId].interactions.find(t => t.id === id);
    assert.ok(target, `Target ${id} exists in current room`);
    assert.equal(session.moveTo({ x: target.x, y: target.y, facing: 1 }), true);
    assert.equal(session.interact(id), true);
}
function toRoom(session) {
    approach(session, 'lobby-stairs'); approach(session, 'stairs-fourth'); approach(session, 'hall-407');
}

test('content has safe entries, accessible anchors and reversible portal references', () => {
    assert.doesNotThrow(() => validateWorld(hotel));
    const invalid = structuredClone(hotel);
    invalid.locations.hallway.interactions[1].entry = 'missing';
    assert.throws(() => validateWorld(invalid), /Missing entry/);
});

test('every connection returns to its named entry with the authored facing', () => {
    const session = new GameSession(hotel);
    for (const [id, locationId, entry] of [
        ['lobby-stairs', 'staircase', 'fromLobby'], ['stairs-fourth', 'hallway', 'fromStairs'],
        ['hall-407', 'room407', 'fromHallway'], ['407-hall', 'hallway', 'from407'],
        ['fourth-stairs', 'staircase', 'fromFourth'], ['stairs-lobby', 'lobby', 'fromStairs'],
    ]) {
        approach(session, id);
        assert.deepEqual(session.getPlayer(), { locationId, ...hotel.locations[locationId].entries[entry] });
    }
});

test('distant and unknown interactions cannot grant discoveries or move the player', () => {
    const session = new GameSession(hotel);
    assert.equal(session.interact('lobby-stairs'), false);
    assert.equal(session.interact('glass'), false);
    assert.equal(session.interact('__proto__'), false);
    assert.equal(session.getSnapshot().entries.length, 0);
    assert.equal(session.getPlayer().locationId, 'lobby');
});

test('evidence is discoverable with no case and stays unique on repeat examination and revisit', () => {
    const session = new GameSession(hotel);
    toRoom(session);
    approach(session, 'glass'); approach(session, 'glass'); approach(session, 'note');
    approach(session, '407-hall'); approach(session, 'hall-407'); approach(session, 'glass');
    assert.deepEqual(session.getSnapshot().entries.map(e => e.id), ['champagne-glass', 'folded-note']);
    assert.ok(session.getSnapshot().entries.every(e => e.kind === 'observation'));
});

test('testimony is recorded only when heard and remains attributed after repeating dialogue', () => {
    const session = new GameSession(hotel);
    approach(session, 'receptionist');
    assert.equal(session.getSnapshot().entries.length, 0);
    session.closeDialogue();
    approach(session, 'receptionist');
    session.advanceDialogue(); session.advanceDialogue();
    const testimony = session.getSnapshot().entries[0];
    assert.equal(testimony.kind, 'testimony');
    assert.match(testimony.source, /Receptionist/);
    assert.match(testimony.eventTime, /according to/);
    session.closeDialogue(); approach(session, 'receptionist');
    session.advanceDialogue(); session.advanceDialogue();
    assert.equal(session.getSnapshot().entries.length, 1);
});

test('dialogue and notebook block movement and world interaction; closing restores control', () => {
    const session = new GameSession(hotel);
    approach(session, 'receptionist');
    const player = session.getPlayer();
    assert.equal(session.moveTo({ x: 900, y: 600, facing: 1 }), false);
    assert.equal(session.interact('receptionist'), false);
    session.toggleNotebook(); assert.equal(session.getSnapshot().notebookOpen, false);
    session.closeDialogue(); session.toggleNotebook();
    assert.equal(session.moveTo({ x: 900, y: 600, facing: 1 }), false);
    assert.deepEqual(session.getPlayer(), player);
    session.toggleNotebook();
    assert.equal(session.moveTo({ x: 900, y: 600, facing: 1 }), true);
});

test('movement stops at furniture and walls, slides along obstacles, and handles long frames', () => {
    const location = hotel.locations.room407;
    let player = { x: 390, y: 520, facing: 1 };
    const motion = { vx: 0, vy: 0 };
    for (let i = 0; i < 120; i++) player = stepMovement(location, player, motion, 1, 0, 1 / 60);
    assert.ok(player.x <= 407); assert.ok(canStand(location, player));
    for (let i = 0; i < 120; i++) player = stepMovement(location, player, motion, 1, 1, 1 / 60);
    assert.ok(player.x > 540, 'Can walk around the table');
    for (let i = 0; i < 500; i++) player = stepMovement(location, player, motion, 1, 1, 2);
    assert.ok(canStand(location, player));
    assert.ok(player.x <= 1197 && player.y <= 652);
    assert.equal(canStand(location, { x: NaN, y: 520 }), false);
});

test('resolved movement avoids per-frame React notifications when the nearby target stays unchanged', () => {
    const session = new GameSession(hotel);
    let notifications = 0;
    const unsubscribe = session.subscribe(() => notifications++);
    for (let i = 0; i < 30; i++) session.moveTo({ x: 200 + i, y: 590, facing: 1 });
    assert.equal(notifications, 0);
    unsubscribe(); session.toggleNotebook();
    assert.equal(notifications, 0);
});

test('save round trip restores position and discoveries, without reopening transient UI', () => {
    const session = new GameSession(hotel);
    approach(session, 'receptionist'); session.advanceDialogue(); session.advanceDialogue(); session.closeDialogue();
    toRoom(session); approach(session, 'glass'); session.toggleNotebook();
    const saved = parseSave(JSON.parse(JSON.stringify(session.getSave())), hotel);
    assert.ok(saved);
    const restored = new GameSession(hotel, saved);
    assert.deepEqual(restored.getPlayer(), session.getPlayer());
    assert.deepEqual(restored.getSnapshot().entries, session.getSnapshot().entries);
    assert.equal(restored.isBlocked(), false);
});

test('invalid versions, missing records, duplicate evidence and unsafe saved positions are rejected', () => {
    const baseline = new GameSession(hotel).getSave();
    const invalid = [null, {}, { ...baseline, version: 2 }, { ...baseline, contentVersion: 'other' },
        { ...baseline, player: { ...baseline.player, locationId: '__proto__' } },
        { ...baseline, player: { ...baseline.player, x: 600, y: 520 } },
        { ...baseline, discoveries: [{ id: 'missing', recordedAt: 1 }] },
        { ...baseline, discoveries: [{ id: 'folded-note', recordedAt: NaN }] },
        { ...baseline, discoveries: [{ id: 'folded-note', recordedAt: 1 }, { id: 'folded-note', recordedAt: 2 }] },
    ];
    invalid.forEach(value => assert.equal(parseSave(value, hotel), null));
});

test('local persistence preserves corrupt saves and reports storage failures', () => {
    const memory = new Map([[SAVE_KEY, '{broken']]);
    const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
    const result = loadLocal(storage, hotel);
    assert.equal(result.writable, false); assert.match(result.warning, /preserved/);
    assert.equal(memory.get(SAVE_KEY), '{broken');
    assert.equal(saveLocal({ ...storage, setItem: () => { throw new Error('quota'); } }, new GameSession(hotel)), false);
    memory.clear(); assert.equal(loadLocal(storage, hotel).writable, true);
    assert.equal(saveLocal(storage, new GameSession(hotel)), true);
    assert.ok(loadLocal(storage, hotel).saved);
});
