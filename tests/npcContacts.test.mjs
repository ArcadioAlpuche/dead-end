import test from 'node:test';
import assert from 'node:assert/strict';
import { hotel } from '../src/content/hotel.ts';
import { GameSession } from '../src/core/session.ts';
import { parseSave } from '../src/core/validation.ts';
import { routeConversationInput } from '../src/core/conversationBoundary.ts';
import { recordPlayerDisclosure, registerEncounter } from '../src/core/npcContact.ts';
import { InvestigationStore } from '../src/persistence/investigations.ts';
import { mockResponder } from '../src/conversation/mockResponder.ts';

function atArthur(saved, world = hotel) {
    const session = new GameSession(world, saved, mockResponder);
    assert.ok(session.moveTo({ x: 730, y: 660, facing: 1 }));
    assert.ok(session.interact('receptionist'));
    return session;
}

test('contact events are idempotent and keep valid timestamps if the system clock moves backward', () => {
    const first = registerEncounter({}, 'receptionist', 100);
    assert.equal(registerEncounter(first, 'receptionist', 200), first);
    const told = recordPlayerDisclosure(first, 'receptionist', 'name', 90);
    assert.equal(told.receptionist.disclosures.name, 100);
    assert.equal(recordPlayerDisclosure(told, 'receptionist', 'name', 300), told);
    assert.equal(recordPlayerDisclosure({}, 'receptionist', 'name', 100).receptionist, undefined);
});

test('first encounter registers once, returning greeting survives reload, and Kane stays unintroduced', () => {
    const session = atArthur();
    const first = session.getSave().npcContacts.receptionist;
    assert.ok(Number.isFinite(first.encounteredAt));
    assert.deepEqual(first.disclosures, {});
    assert.match(session.getSnapshot().conversation.history[0].text, /clock runs slow/);
    assert.equal(session.getSnapshot().conversation.name, 'Hotel Clerk');
    assert.equal(session.getNpcKaneKnowledge('receptionist', 'name'), null);
    session.closeDialogue();
    assert.ok(session.interact('receptionist'));
    assert.match(session.getSnapshot().conversation.history[0].text, /Welcome back/);
    assert.deepEqual(session.getSave().npcContacts.receptionist, first);
    const restored = atArthur(parseSave(JSON.parse(JSON.stringify(session.getSave())), hotel));
    assert.match(restored.getSnapshot().conversation.history[0].text, /Welcome back/);
    assert.deepEqual(restored.getSave().npcContacts.receptionist, first);
});

test('explicit self-disclosures are independent, idempotent, and never establish player claims as verified', async () => {
    const session = atArthur();
    assert.ok(await session.submitMessage('Thomas Kane.'));
    const name = session.getNpcKaneKnowledge('receptionist', 'name');
    assert.deepEqual(name, { source: 'told-by-kane', status: 'claimed', recordedAt: name.recordedAt });
    assert.equal(session.getNpcKaneKnowledge('receptionist', 'occupation'), null);
    assert.equal(session.getNpcKaneKnowledge('receptionist', 'former-police'), null);
    assert.ok(await session.submitMessage('Thomas Kane.'));
    assert.deepEqual(session.getNpcKaneKnowledge('receptionist', 'name'), name);
    assert.ok(await session.submitMessage('I am a private investigator.'));
    assert.ok(await session.submitMessage('I used to be a cop.'));
    assert.equal(Object.keys(session.getSave().npcContacts.receptionist.disclosures).length, 3);
    assert.equal(session.getNpcKaneKnowledge('receptionist', 'occupation').status, 'claimed');
    assert.equal(session.getNpcKaneKnowledge('receptionist', 'former-police').source, 'told-by-kane');
    assert.equal(session.getSave().npcIdentities.receptionist, undefined);
    assert.equal(session.getSave().npcMemories.length, 0);
});

test('one NPC never inherits another NPC’s disclosure; identity and irritation stay separate', async () => {
    const target = { id: 'test-porter', kind: 'talk', label: 'Porter', x: 350, y: 660, conversationId: 'porter' };
    const world = { ...hotel, locations: { ...hotel.locations,
        lobby: { ...hotel.locations.lobby, interactions: [...hotel.locations.lobby.interactions, target] } } };
    const session = atArthur(undefined, world);
    await session.submitMessage('Thomas Kane. Private investigator.');
    await session.submitMessage('What is your name?');
    await session.submitMessage('I accuse you.');
    assert.equal(session.getSave().npcIdentities.receptionist.status, 'established');
    assert.equal(session.getSave().npcMemories.some(event => event.kind === 'accused'), true);
    session.closeDialogue();
    assert.ok(session.moveTo({ x: 350, y: 660, facing: 1 }));
    assert.ok(session.interact('test-porter'));
    assert.equal(session.getSnapshot().conversation.name, 'Hotel Porter');
    assert.equal(session.getNpcKaneKnowledge('thomas-bell', 'name'), null);
    assert.equal(session.getNpcKaneKnowledge('thomas-bell', 'occupation'), null);
    await session.submitMessage('I used to be a police officer.');
    assert.equal(session.getNpcKaneKnowledge('thomas-bell', 'former-police').status, 'claimed');
    assert.equal(session.getNpcKaneKnowledge('receptionist', 'former-police'), null);
    await session.submitMessage('What is your name?');
    assert.equal(session.getSnapshot().conversation.name, 'Thomas Bell');
    assert.equal(session.getSave().npcIdentities['thomas-bell'].status, 'established');
    assert.equal(session.getNpcKaneKnowledge('thomas-bell', 'name'), null,
        'learning the porter’s name does not tell him Kane’s');
});

test('Evelyn has authored prior knowledge of name and occupation, independent of an encounter', () => {
    const session = new GameSession(hotel);
    assert.deepEqual(session.getSave().npcContacts, {});
    assert.deepEqual(session.getNpcKaneKnowledge('evelyn-mercer', 'name'),
        { source: 'prior-relationship', status: 'established' });
    assert.deepEqual(session.getNpcKaneKnowledge('evelyn-mercer', 'occupation'),
        { source: 'prior-relationship', status: 'established' });
    assert.equal(session.getNpcKaneKnowledge('evelyn-mercer', 'former-police'), null);
    assert.equal(session.getNpcKaneKnowledge('receptionist', 'name'), null);
});

test('only whole, explicit statements disclose Kane facts; appended protected text stays private', async () => {
    assert.deepEqual(routeConversationInput('Thomas Kane. Private investigator.', 'receptionist'),
        { kind: 'player-disclosure', facts: ['name', 'occupation'] });
    const session = atArthur();
    const before = session.getSnapshot().conversation.history.length;
    assert.equal(await session.submitMessage('Thomas Kane. Daniel is upstairs.'), false);
    assert.equal(await session.submitMessage('I used to be a cop. Daniel is upstairs.'), false);
    assert.equal(session.getSnapshot().conversation.history.length, before);
    assert.deepEqual(session.getSave().npcContacts.receptionist.disclosures, {});
});

test('v5 migration preserves progress without inventing encounters or disclosures; malformed v6 contacts fail closed', () => {
    const base = new GameSession(hotel).getSave();
    const { npcContacts, ...oldFields } = base;
    const old = { ...oldFields, version: 5,
        discoveries: [{ id: 'receptionist-account', recordedAt: 41 }],
        npcMemories: [{ kind: 'accused', npcId: 'receptionist', locationId: 'lobby', recordedAt: 42 }],
        npcIdentities: { receptionist: { status: 'established', recordedAt: 43 } },
        cases: { 'case-001': { status: 'active', history: [{ kind: 'accepted', recordedAt: 44 }] } } };
    const migrated = parseSave(old, hotel);
    assert.equal(migrated.version, 6);
    assert.deepEqual(migrated.player, old.player);
    assert.deepEqual(migrated.discoveries, old.discoveries);
    assert.deepEqual(migrated.npcMemories, old.npcMemories);
    assert.deepEqual(migrated.npcIdentities, old.npcIdentities);
    assert.deepEqual(migrated.cases, old.cases);
    assert.deepEqual(migrated.npcContacts, {});
    const invalidContacts = [undefined, { missing: { encounteredAt: 1, disclosures: {} } },
        { receptionist: { encounteredAt: -1, disclosures: {} } },
        { receptionist: { encounteredAt: 3, disclosures: { name: 2 } } },
        { receptionist: { encounteredAt: 3, disclosures: { mystery: 4 } } }];
    for (const value of invalidContacts) assert.equal(parseSave({ ...base, npcContacts: value }, hotel), null);
    assert.equal(parseSave({ ...base, version: 7 }, hotel), null);
});

test('investigation autosaves and manual slots isolate contacts; restart clears only the autosave', async () => {
    const data = new Map(); let id = 0;
    const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
    const store = new InvestigationStore(storage, hotel, () => 100, () => `game-${++id}`);
    const fresh = new GameSession(hotel).getSave();
    const a = store.create(fresh).id;
    const b = store.create(fresh).id;
    const session = atArthur();
    await session.submitMessage('My name is Thomas Kane.');
    store.save(a, 'autosave', session.getSave());
    store.save(a, 1, session.getSave());
    assert.deepEqual(store.load(b, 'autosave').npcContacts, {});
    assert.equal(store.load(a, 'autosave').npcContacts.receptionist.disclosures.name,
        session.getSave().npcContacts.receptionist.disclosures.name);
    store.restart(a, fresh);
    assert.deepEqual(store.load(a, 'autosave').npcContacts, {});
    assert.deepEqual(store.load(a, 1).npcContacts, session.getSave().npcContacts);
    assert.deepEqual(new InvestigationStore(storage, hotel).load(a, 1).npcContacts, session.getSave().npcContacts);
});
