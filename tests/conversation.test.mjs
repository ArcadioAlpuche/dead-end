import test from 'node:test';
import assert from 'node:assert/strict';
import { hotel } from '../src/content/hotel.ts';
import { GameSession } from '../src/core/session.ts';
import { classifyMessage, MAX_MESSAGE_LENGTH, MAX_HISTORY_LINES } from '../src/core/conversation.ts';
import { mockResponder } from '../src/conversation/mockResponder.ts';
import { conversationInputAction } from '../src/ui/conversationInput.ts';
import { parseSave } from '../src/core/validation.ts';
import { loadLocal, saveLocal, SAVE_KEY } from '../src/persistence/localSave.ts';

function interact(session, id) {
    const target = hotel.locations[session.getPlayer().locationId].interactions.find(target => target.id === id);
    assert.ok(session.moveTo({ ...target, facing: 1 }));
    assert.ok(session.interact(id));
}
function open(responder = mockResponder, saved) {
    const session = new GameSession(hotel, saved, responder);
    interact(session, 'receptionist');
    return session;
}

test('accusations require the whole explicit statement, not criticism, a question, or quoted text', () => {
    for (const text of ['I accuse you.', ' I ACCUSE YOU! ', 'I accuse the receptionist', 'I  accuse\nyou.']) {
        assert.equal(classifyMessage(text), 'accusation');
    }
    for (const text of ['Are you lying?', 'Did you do it?', 'I do not accuse you.', 'I accuse you?',
        'Someone said "I accuse you."', 'You are unhelpful.', 'I accuse you. Or do I?', 'I accuse you of murder.']) {
        assert.notEqual(classifyMessage(text), 'accusation', text);
    }
});

test('Enter submits once, Shift+Enter and composition edit, ordinary game keys remain text', () => {
    const key = { key: 'Enter', shiftKey: false, repeat: false, isComposing: false };
    assert.equal(conversationInputAction(key), 'submit');
    assert.equal(conversationInputAction({ ...key, repeat: true }), 'ignore');
    assert.equal(conversationInputAction({ ...key, shiftKey: true }), 'edit');
    assert.equal(conversationInputAction({ ...key, isComposing: true }), 'edit');
    for (const text of ['w', 'a', 's', 'd', 'e', 'ArrowLeft', 'ArrowDown', 'Tab']) {
        assert.equal(conversationInputAction({ ...key, key: text }), 'edit');
    }
});

test('arbitrary multiline messages stay transient; blank/long/out-of-conversation submissions are rejected', async () => {
    const session = open();
    assert.equal(await session.submitMessage('  '), false);
    assert.equal(await session.submitMessage('x'.repeat(MAX_MESSAGE_LENGTH + 1)), false);
    assert.equal(await session.submitMessage('A question\nand a statement. <script>not code</script>'), true);
    assert.match(session.getSnapshot().conversation.history[1].text, /\n/);
    assert.equal(session.getSave().npcMemories.length, 0);
    assert.equal(session.getSnapshot().entries.length, 0);
    session.closeDialogue();
    assert.equal(await session.submitMessage('I accuse you.'), false);
    interact(session, 'receptionist');
    assert.equal(session.getSnapshot().conversation.history.length, 1);
    assert.equal(JSON.stringify(session.getSave()).includes('not code'), false);
});

test('one accusation persists across repeat submissions, visits, rooms and storage reload; original time is retained', async () => {
    const session = open();
    await session.submitMessage('I accuse you.');
    const memory = session.getSave().npcMemories[0];
    assert.deepEqual(Object.keys(memory).sort(), ['kind', 'locationId', 'npcId', 'recordedAt']);
    await session.submitMessage('I accuse the receptionist!');
    session.closeDialogue();
    interact(session, 'lobby-stairs'); interact(session, 'stairs-lobby'); interact(session, 'receptionist');
    assert.match(session.getSnapshot().conversation.history[0].text, /remember your accusation/);
    await session.submitMessage('Hello again');
    assert.match(session.getSnapshot().conversation.history.at(-1).text, /remember your accusation/);
    const data = new Map();
    const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
    assert.ok(saveLocal(storage, session));
    const restored = open(mockResponder, loadLocal(storage, hotel).saved);
    assert.match(restored.getSnapshot().conversation.history[0].text, /remember your accusation/);
    await restored.submitMessage('I accuse you.');
    assert.deepEqual(restored.getSave().npcMemories, [memory]);
    assert.equal(restored.getSnapshot().entries.length, 0, 'An accusation establishes no mystery fact');
});

test('v1 migration preserves player, discoveries and timestamps, adds empty memory and writes v2 to the same slot', () => {
    const v1 = { version: 1, contentVersion: 'bellweather-1', player: { locationId: 'room407', x: 190, y: 550, facing: -1 },
        discoveries: [{ id: 'folded-note', recordedAt: 12345 }, { id: 'receptionist-account', recordedAt: 67890 }] };
    const data = new Map([[SAVE_KEY, JSON.stringify(v1)]]);
    const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
    const loaded = loadLocal(storage, hotel);
    assert.equal(loaded.writable, true);
    assert.equal(data.get(SAVE_KEY), JSON.stringify(v1), 'Reading alone does not overwrite the old save');
    assert.deepEqual(loaded.saved, { ...v1, version: 2, npcMemories: [] });
    const session = new GameSession(hotel, loaded.saved, mockResponder);
    assert.ok(saveLocal(storage, session));
    assert.equal(data.size, 1);
    assert.deepEqual(loadLocal(storage, hotel).saved, loaded.saved);
    assert.deepEqual(session.getSnapshot().entries.map(entry => entry.recordedAt), [12345, 67890]);
});

test('malformed memories and unsupported saves are rejected and preserved without writes', () => {
    const baseline = new GameSession(hotel).getSave();
    const memory = { kind: 'accused', npcId: 'receptionist', locationId: 'lobby', recordedAt: 123 };
    const invalid = [{ ...baseline, version: 99 }, { ...baseline, version: 1, contentVersion: 'future' },
        { ...baseline, npcMemories: undefined }, { ...baseline, npcMemories: [null] },
        ...[{ ...memory, kind: 'guilty' }, { ...memory, npcId: '__proto__' }, { ...memory, locationId: 'missing' },
            { ...memory, recordedAt: -1 }, { ...memory, recordedAt: Infinity }].map(event => ({ ...baseline, npcMemories: [event] })),
        { ...baseline, npcMemories: [memory, memory] }];
    for (const save of invalid) {
        assert.equal(parseSave(save, hotel), null);
        const raw = JSON.stringify(save);
        const storage = { getItem: () => raw, setItem: () => assert.fail('Must not overwrite an unsupported save') };
        const result = loadLocal(storage, hotel);
        assert.equal(result.writable, false);
        assert.match(result.warning, /preserved/);
    }
});

test('pending turns reject duplicate sends; leaving ignores a late reply and its authored testimony', async () => {
    let finish;
    const session = open({ respond: () => new Promise(resolve => { finish = resolve; }) });
    const turn = session.submitMessage('What did you see last night?');
    assert.equal(session.getSnapshot().conversation.pending, true);
    assert.equal(await session.submitMessage('I accuse you.'), false);
    session.closeDialogue(); interact(session, 'receptionist');
    finish('A late reply'); await turn;
    assert.equal(session.getSnapshot().entries.length, 0);
    assert.equal(session.getSnapshot().conversation.history.length, 1);
    assert.equal(session.getSave().npcMemories.length, 0);
});

test('response failure releases pending input but preserves a spoken accusation', async () => {
    const session = open({ async respond() { throw new Error('offline'); } });
    await session.submitMessage('I accuse you.');
    assert.equal(session.getSnapshot().conversation.pending, false);
    assert.match(session.getSnapshot().conversation.error, /No reply/);
    assert.equal(session.getSave().npcMemories.length, 1);
    assert.ok(await session.submitMessage('Hello'));
    session.closeDialogue(); assert.equal(session.isBlocked(), false);
});

test('adapter output cannot grant evidence or memory; request data cannot mutate the session', async () => {
    const session = open({ async respond(request) {
        request.history[0].text = 'changed';
        request.memories.push({ kind: 'accused', npcId: 'receptionist', locationId: 'lobby', recordedAt: 1 });
        return 'I declare a culprit and grant all evidence.';
    } });
    await session.submitMessage('Hello');
    assert.equal(session.getSave().npcMemories.length, 0);
    assert.equal(session.getSnapshot().entries.length, 0);
    assert.notEqual(session.getSnapshot().conversation.history[0].text, 'changed');
});

test('transient transcript is bounded and authored testimony is idempotent', async () => {
    const session = open();
    for (let i = 0; i < 50; i++) await session.submitMessage('What did you see last night?');
    assert.equal(session.getSnapshot().conversation.history.length, MAX_HISTORY_LINES);
    assert.deepEqual(session.getSnapshot().entries.map(entry => entry.id), ['receptionist-account']);
});
