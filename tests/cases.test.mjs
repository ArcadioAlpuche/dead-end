import test from 'node:test';
import assert from 'node:assert/strict';
import { hotel } from '../src/content/hotel.ts';
import { GameSession } from '../src/core/session.ts';
import { casebookEntries } from '../src/core/cases.ts';
import { parseSave, validateWorld } from '../src/core/validation.ts';
import { loadLocal, saveLocal, SAVE_KEY } from '../src/persistence/localSave.ts';
import { casebookKeyAction, nextFocusIndex } from '../src/ui/casebookInput.ts';

function accept(session, id) {
    if (!session.requestCaseAcceptance(id)) return false;
    return session.confirmAction(session.getSnapshot().pendingAction.token);
}
function offer(session, id = 'case-001') {
    if (!session.getSnapshot().notebookOpen) session.toggleNotebook();
    assert.equal(session.openCaseOffer(id), true);
}
function interact(session, id) {
    const target = session.world.locations[session.getPlayer().locationId].interactions.find(item => item.id === id);
    assert.ok(session.moveTo({ x: target.x, y: target.y, facing: 1 }));
    assert.ok(session.interact(id));
}
function storageWith(value) {
    const data = new Map(value === undefined ? [] : [[SAVE_KEY, JSON.stringify(value)]]);
    return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}

test('a request is explicit and deferring leaves exploration and the offer available', () => {
    const session = new GameSession(hotel);
    const before = session.getSave();
    assert.equal(session.getSnapshot().cases[0].status, 'available');
    assert.equal(accept(session, 'case-001'), false);
    assert.equal(session.openCaseOffer('case-001'), false);
    session.toggleNotebook();
    assert.equal(accept(session, 'case-001'), false, 'Must read the offer first');
    assert.equal(session.openCaseOffer('missing'), false);
    offer(session);
    assert.equal(session.isBlocked(), true);
    assert.equal(session.moveTo({ x: 220, y: 590, facing: 1 }), false);
    assert.equal(session.interact('receptionist'), false);
    assert.deepEqual(session.getSave(), before, 'Reading does not mutate durable state');
    assert.equal(session.deferCase('missing'), false);
    assert.equal(session.deferCase('case-001'), true);
    assert.equal(session.isBlocked(), false);
    assert.deepEqual(session.getSave(), before);
    assert.equal(session.moveTo({ x: 220, y: 590, facing: 1 }), true);
    offer(session);
    session.toggleNotebook();
    assert.equal(session.getSnapshot().caseOfferId, null);
    assert.deepEqual(session.getSave().cases, {}, 'Closing is not acceptance');
    const restored = new GameSession(hotel, parseSave(session.getSave(), hotel));
    assert.equal(restored.getSnapshot().cases[0].status, 'available');
    assert.equal(restored.isBlocked(), false);
});

test('acceptance records exactly one timestamped event, even on repeated commands', () => {
    const session = new GameSession(hotel);
    offer(session);
    const start = Date.now();
    assert.equal(session.requestCaseAcceptance('case-001'), true);
    const token = session.getSnapshot().pendingAction.token;
    assert.equal(session.confirmAction(token), true);
    const saved = session.getSave();
    const state = saved.cases['case-001'];
    assert.equal(state.status, 'active');
    assert.equal(state.history.length, 1);
    assert.equal(state.history[0].kind, 'accepted');
    assert.ok(state.history[0].recordedAt >= start && state.history[0].recordedAt <= Date.now());
    let publishes = 0;
    session.subscribe(() => publishes++);
    for (let i = 0; i < 3; i++) assert.equal(session.confirmAction(token), false);
    assert.equal(publishes, 0);
    assert.deepEqual(session.getSave(), saved);
    assert.equal(session.openCaseOffer('case-001'), false);
    assert.equal(session.deferCase('case-001'), false, 'Deferral cannot withdraw an active assignment');
    saved.cases['case-001'].history[0].recordedAt = 0;
    assert.notEqual(session.getSave().cases['case-001'].history[0].recordedAt, 0, 'Save snapshots cannot mutate core history');
});

test('evidence exists before acceptance and stays unique, unchanged and visible afterward', () => {
    const session = new GameSession(hotel);
    offer(session); session.deferCase('case-001');
    for (const id of ['lobby-stairs', 'stairs-fourth', 'hall-407', 'glass']) interact(session, id);
    const discoveries = session.getSave().discoveries;
    const entries = session.getSnapshot().entries;
    offer(session); accept(session, 'case-001');
    assert.deepEqual(session.getSave().discoveries, discoveries);
    assert.deepEqual(session.getSnapshot().entries, entries);
    session.toggleNotebook();
    interact(session, 'glass'); interact(session, 'note');
    interact(session, '407-hall'); interact(session, 'hall-407'); interact(session, 'glass');
    assert.deepEqual(session.getSave().discoveries[0], discoveries[0]);
    assert.deepEqual(session.getSnapshot().entries.map(entry => entry.id), ['champagne-glass', 'folded-note']);
});

test('independent case fixtures survive reload without overwriting each other', () => {
    const world = { ...hotel, cases: { ...hotel.cases,
        'fixture-002': { id: 'fixture-002', title: 'Test assignment', clientId: 'test-client', client: 'Test client', offer: 'Test offer', assignment: 'Test only' } } };
    assert.doesNotThrow(() => validateWorld(world));
    const session = new GameSession(world);
    offer(session); accept(session, 'case-001');
    const first = session.getSave().cases['case-001'];
    offer(session, 'fixture-002'); session.deferCase('fixture-002');
    assert.equal(session.getSnapshot().cases[1].status, 'available');
    assert.deepEqual(session.getSave().cases['case-001'], first);
    offer(session, 'fixture-002'); accept(session, 'fixture-002');
    const storage = storageWith();
    assert.ok(saveLocal(storage, session));
    const restored = new GameSession(world, loadLocal(storage, world).saved);
    assert.deepEqual(restored.getSave(), session.getSave());
    assert.deepEqual(restored.getSnapshot().cases.map(entry => entry.status), ['active', 'active']);
    assert.equal(restored.isBlocked(), false);
    assert.equal(restored.getSnapshot().caseOfferId, null);
});

for (const version of [1, 2]) test(`v${version} migration preserves existing state and never infers acceptance`, () => {
    const old = { version, contentVersion: 'bellweather-1',
        player: { locationId: 'room407', x: 190, y: 550, facing: -1 },
        discoveries: [{ id: 'folded-note', recordedAt: 12345 }, { id: 'receptionist-account', recordedAt: 67890 }],
        ...(version === 2 ? { npcMemories: [{ kind: 'accused', npcId: 'receptionist', locationId: 'lobby', recordedAt: 24680 }] } : {}) };
    const storage = storageWith(old);
    const loaded = loadLocal(storage, hotel);
    assert.equal(loaded.writable, true);
    assert.equal(storage.data.get(SAVE_KEY), JSON.stringify(old), 'Reading does not write');
    assert.deepEqual(loaded.saved, { ...old, version: 4, contentVersion: 'bellweather-3', npcMemories: old.npcMemories ?? [], cases: {} });
    const session = new GameSession(hotel, loaded.saved);
    offer(session); accept(session, 'case-001');
    assert.ok(saveLocal(storage, session));
    const restored = new GameSession(hotel, loadLocal(storage, hotel).saved);
    assert.deepEqual(restored.getPlayer(), old.player);
    assert.deepEqual(restored.getSave().discoveries, old.discoveries);
    assert.deepEqual(restored.getSave().npcMemories, old.npcMemories ?? []);
    assert.deepEqual(restored.getSave().cases, session.getSave().cases);
    assert.equal(restored.getSnapshot().cases[0].status, 'active');
});

test('invalid case saves and future schemas are protected without destructive writes', () => {
    const baseline = new GameSession(hotel).getSave();
    const accepted = { kind: 'accepted', recordedAt: 1234 };
    const invalidStates = [undefined, null, [], { missing: { status: 'active', history: [accepted] } },
        ...[null, { status: 'withdrawn', history: [] }, { status: 'active', history: [] },
            { status: 'active', history: [accepted, accepted] }, { status: 'available', history: [accepted] },
            { status: 'active', history: [{ ...accepted, kind: 'resolved' }] },
            ...[-1, Infinity, 'yesterday'].map(recordedAt => ({ status: 'active', history: [{ ...accepted, recordedAt }] }))]
            .map(state => ({ 'case-001': state }))];
    for (const value of [...invalidStates.map(cases => ({ ...baseline, cases })), { ...baseline, version: 99 }]) {
        assert.equal(parseSave(value, hotel), null);
        const storage = storageWith(value);
        const raw = storage.data.get(SAVE_KEY);
        storage.setItem = () => assert.fail('Unreadable save must not be overwritten');
        const loaded = loadLocal(storage, hotel);
        assert.equal(loaded.writable, false);
        assert.match(loaded.warning, /preserved/);
        assert.equal(storage.data.get(SAVE_KEY), raw);
    }
});

test('public casebook selector exposes only offer fields, status and acceptance history', () => {
    const definition = { ...hotel.cases['case-001'], hiddenSolution: 'Not player knowledge' };
    const entries = casebookEntries({ 'case-001': definition }, {});
    assert.deepEqual(Object.keys(entries[0]).sort(), ['assignment', 'client', 'clientId', 'history', 'id', 'offer', 'status', 'title']);
    const malformed = { ...hotel, cases: { wrong: definition } };
    assert.throws(() => validateWorld(malformed));
});

test('casebook keyboard policy isolates movement, preserves Tab close and traps offer focus', () => {
    const key = (value, offerOpen = false, extra = {}) => casebookKeyAction({ key: value, shiftKey: false, repeat: false, ...extra }, offerOpen);
    for (const value of ['w', 'A', 's', 'd', 'e']) assert.equal(key(value, true), 'block');
    assert.equal(key('ArrowUp'), 'up'); assert.equal(key('ArrowDown'), 'down');
    assert.equal(key('Tab'), 'close'); assert.equal(key('Escape', true), 'close');
    assert.equal(key('Tab', true), 'next'); assert.equal(key('Tab', true, { shiftKey: true }), 'previous');
    assert.equal(key('ArrowRight'), 'next'); assert.equal(key('ArrowLeft'), 'previous');
    assert.equal(key('Enter', true), 'native'); assert.equal(key(' ', true), 'native');
    for (const value of ['Tab', 'Escape', 'Enter', ' ']) assert.equal(key(value, true, { repeat: true }), 'block');
    assert.equal(nextFocusIndex(2, 3, 1), 0); assert.equal(nextFocusIndex(0, 3, -1), 2);
    assert.equal(nextFocusIndex(-1, 3, 1), 0); assert.equal(nextFocusIndex(-1, 3, -1), 2);
    assert.equal(nextFocusIndex(-1, 0, 1), -1);
});
