import test from 'node:test';
import assert from 'node:assert/strict';
import { hotel } from '../src/content/hotel.ts';
import { GameSession } from '../src/core/session.ts';
import { InvestigationStore } from '../src/persistence/investigations.ts';
import { SAVE_KEY } from '../src/persistence/localSave.ts';

function fixture() {
    const data = new Map();
    let fail = false;
    const storage = {
        getItem(key) { return data.get(key) ?? null; },
        setItem(key, value) { if (fail) throw new Error('quota'); data.set(key, value); },
    };
    let tick = 100;
    let sequence = 0;
    const repository = () => new InvestigationStore(storage, hotel, () => ++tick, () => `game-${++sequence}`);
    return { data, storage, repository, setFailure(value) { fail = value; } };
}
const fresh = () => new GameSession(hotel).getSave();

// Distinct states include every currently durable v5 field; neither case state nor
// identity knowledge is inferred from a different investigation's evidence.
test('investigations have isolated autosaves and three manual snapshots', () => {
    const f = fixture(); const store = f.repository();
    const a = store.create(fresh()); const b = store.create(fresh());
    assert.notEqual(a.id, b.id);
    const changed = { ...fresh(), player: { locationId: 'room407', x: 450, y: 630, facing: -1 },
        discoveries: [{ id: 'champagne-glass', recordedAt: 123 }],
        npcIdentities: { receptionist: { status: 'established', recordedAt: 124 } } };
    // Use valid room entry and an authored record so validation remains authoritative.
    const room = hotel.locations.room407.entries.fromHallway;
    const evidence = Object.keys(hotel.records)[0];
    changed.player = { locationId: 'room407', ...room };
    changed.discoveries = [{ id: evidence, recordedAt: 123 }];
    changed.cases = { 'case-001': { status: 'active', history: [{ kind: 'accepted', recordedAt: 125 }] } };
    changed.npcMemories = [{ npcId: 'receptionist', kind: 'accused', locationId: 'lobby', recordedAt: 126 }];
    store.save(a.id, 'autosave', changed);
    for (const slot of [1, 2, 3]) store.save(a.id, slot, changed);
    assert.deepEqual(store.load(a.id, 'autosave'), changed);
    assert.deepEqual(store.load(b.id, 'autosave'), fresh());
    assert.equal(store.list().find(item => item.id === a.id).manual.filter(Boolean).length, 3);
    assert.throws(() => store.load(b.id, 1), /empty/);
    assert.equal(store.load(a.id, 3).player.locationId, 'room407');
});

test('loading and restarting change autosave without modifying manual slots', () => {
    const f = fixture(); const store = f.repository(); const id = store.create(fresh()).id;
    const changed = { ...fresh(), player: { locationId: 'room407', ...hotel.locations.room407.entries.fromHallway } };
    store.save(id, 1, changed);
    store.save(id, 'autosave', changed);
    store.restart(id, fresh());
    assert.deepEqual(store.load(id, 'autosave'), fresh());
    assert.deepEqual(store.load(id, 1), changed);
    const reloaded = f.repository();
    assert.deepEqual(reloaded.load(id, 1), changed, 'manual snapshot survives a simulated refresh');
});

test('legacy v5 save imports once and leaves original bytes intact', () => {
    const f = fixture(); const original = JSON.stringify(fresh()); f.data.set(SAVE_KEY, original);
    const store = f.repository();
    assert.equal(store.importLegacy(), '');
    assert.equal(store.importLegacy(), '');
    assert.deepEqual(store.list().map(item => item.id), ['legacy-bellweather']);
    assert.deepEqual(store.load('legacy-bellweather', 'autosave'), fresh());
    assert.equal(f.data.get(SAVE_KEY), original);
});

test('invalid legacy and storage failures preserve existing saves', () => {
    const f = fixture(); f.data.set(SAVE_KEY, '{bad json');
    const store = f.repository();
    assert.match(store.importLegacy(), /could not be imported/);
    assert.equal(f.data.get(SAVE_KEY), '{bad json');
    const id = store.create(fresh()).id;
    const before = f.data.get(`dead-end.investigation.${id}.v1`);
    f.setFailure(true);
    assert.throws(() => store.save(id, 1, fresh()), /quota/);
    assert.equal(f.data.get(`dead-end.investigation.${id}.v1`), before);
});

test('an unreadable investigation is preserved while other investigations remain loadable', () => {
    const f = fixture(); const store = f.repository();
    const broken = store.create(fresh()).id;
    const healthy = store.create(fresh()).id;
    f.data.set(`dead-end.investigation.${broken}.v1`, '{damaged');
    assert.deepEqual(store.list().map(item => item.id), [healthy]);
    assert.deepEqual(store.unreadableIds, [broken]);
    assert.equal(f.data.get(`dead-end.investigation.${broken}.v1`), '{damaged');
    assert.deepEqual(store.load(healthy, 'autosave'), fresh());
});

test('legacy v1 migrates through existing parser without losing position or discoveries', () => {
    const f = fixture();
    const old = { version: 1, contentVersion: 'bellweather-1',
        player: { locationId: 'room407', ...hotel.locations.room407.entries.fromHallway },
        discoveries: [{ id: Object.keys(hotel.records)[0], recordedAt: 15 }] };
    f.data.set(SAVE_KEY, JSON.stringify(old));
    const store = f.repository();
    assert.equal(store.importLegacy(), '');
    const migrated = store.load('legacy-bellweather', 'autosave');
    assert.equal(migrated.version, 5);
    assert.deepEqual(migrated.player, old.player);
    assert.deepEqual(migrated.discoveries, old.discoveries);
    assert.equal(f.data.get(SAVE_KEY), JSON.stringify(old));
});

test('pause blocks movement and interaction, and resume restores both', () => {
    const session = new GameSession(hotel);
    const player = session.getPlayer();
    session.setPaused(true);
    assert.equal(session.isBlocked(), true);
    assert.equal(session.moveTo({ x: player.x + 1, y: player.y, facing: player.facing }), false);
    assert.equal(session.interact('receptionist'), false);
    session.setPaused(false);
    assert.equal(session.isBlocked(), false);
    assert.equal(session.moveTo({ x: player.x + 1, y: player.y, facing: player.facing }), true);
});
