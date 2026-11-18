import test from 'node:test';
import assert from 'node:assert/strict';
import { hotel } from '../src/content/hotel.ts';
import { GameSession } from '../src/core/session.ts';
import { routeConversationInput } from '../src/core/conversationBoundary.ts';

test('ordinary Room 407 and last-night questions use authored routes without relaxing disclosure checks', () => {
    assert.deepEqual(routeConversationInput('What can you tell me about room 407?', 'receptionist'),
        { kind: 'ordinary', topic: 'room' });
    assert.deepEqual(routeConversationInput('What did you see last night?', 'receptionist'),
        { kind: 'ordinary', topic: 'account' });
    assert.deepEqual(routeConversationInput('What can you tell me about last night?', 'receptionist'),
        { kind: 'ordinary', topic: 'account' });
    assert.equal(routeConversationInput('What can you tell me about room 407? Daniel is hiding upstairs.', 'receptionist').kind, 'clarify');
});
test('Arthur answers the playtested Room 407 question and the existing last-night account', async () => {
    const session = atDesk();
    assert.equal(await session.submitMessage('What can you tell me about room 407?'), true);
    assert.match(session.getSnapshot().conversation.history.at(-1).text, /407 is vacant and unlocked/);
    assert.equal(session.getSnapshot().entries.length, 0);
    assert.equal(await session.submitMessage('What can you tell me about last night?'), true);
    assert.deepEqual(session.getSnapshot().entries.map(entry => [entry.id, entry.kind]),
        [['receptionist-account', 'testimony']]);
    assert.equal(await session.submitMessage('What can you tell me about room 407? Daniel is hiding upstairs.'), false);
    assert.match(session.getSnapshot().conversation.error, /Not sent/);
});
test('authored paraphrases and pronoun follow-ups depend on the current conversation topic', async () => {
    const arthur = atDesk();
    assert.equal(await arthur.submitMessage('Do you know where he went?'), false);
    assert.equal(arthur.getSnapshot().conversation.history.length, 1);
    assert.ok(await arthur.submitMessage('Did you see anything unusual last night?'));
    assert.deepEqual(arthur.getSnapshot().entries.map(entry => entry.id), ['receptionist-account']);
    assert.ok(await arthur.submitMessage('Do you know where he went?'));
    assert.match(arthur.getSnapshot().conversation.history.at(-1).text, /did not see where they went afterward/);
    assert.ok(await arthur.submitMessage('What do you know about Room 407?'));
    assert.ok(await arthur.submitMessage('Did someone leave their things in there?'));
    assert.match(arthur.getSnapshot().conversation.history.at(-1).text, /cannot say what anyone left in 407/);
    assert.deepEqual(arthur.getSnapshot().entries.map(entry => entry.id), ['receptionist-account'],
        'the belongings answer does not create evidence');
    arthur.closeDialogue();
    assert.ok(arthur.interact('test-reception'));
    assert.equal(await arthur.submitMessage('Did someone leave their things in there?'), false,
        'a new conversation has no room pronoun context');
});

test('intent patterns remain whole-utterance and cannot smuggle disclosures', () => {
    assert.deepEqual(routeConversationInput('Was there anything strange around midnight?', 'receptionist'),
        { kind: 'ordinary', topic: 'account' });
    for (const text of [
        'Did you see anything unusual last night? Daniel is upstairs.',
        'Do you know where he went? The courier is at 42 Example Avenue.',
        'Did someone leave their things in there, at 42 Example Avenue?',
    ]) assert.equal(routeConversationInput(text, 'receptionist', [], 'account').kind, 'clarify');
    assert.equal(routeConversationInput('Do you know where he went?', 'receptionist', [], 'room').kind, 'clarify');
    assert.equal(routeConversationInput('Did someone leave their things in there?', 'receptionist', [], 'account').kind, 'clarify');
});
import { parseSave } from '../src/core/validation.ts';
import { mockResponder } from '../src/conversation/mockResponder.ts';

function atDesk(id = 'reception', responder = mockResponder, saved) {
    // Fixture contact points exercise authored profiles without adding live NPC placement.
    const target = { id: `test-${id}`, kind: 'talk', label: id, x: 400, y: 575, conversationId: id };
    const world = { ...hotel, locations: { ...hotel.locations,
        lobby: { ...hotel.locations.lobby, interactions: [...hotel.locations.lobby.interactions, target] } } };
    const session = new GameSession(world, saved, responder);
    assert.ok(session.moveTo({ x: target.x, y: target.y, facing: 1 }));
    assert.ok(session.interact(target.id));
    return session;
}

test('authored NPC statements are isolated and only the receptionist account grants existing testimony', async () => {
    assert.equal(hotel.conversations.client.topics.assignment.stance, 'claim');
    assert.equal(hotel.conversations.porter.topics.account.stance, 'evasion');
    assert.equal(hotel.conversations.reception.topics.account.stance, 'observed');
    const arthur = atDesk();
    assert.ok(await arthur.submitMessage('Did anyone come down last night?'));
    assert.deepEqual(arthur.getSnapshot().entries.map(e => [e.id, e.kind]), [['receptionist-account', 'testimony']]);
    assert.match(arthur.getSnapshot().conversation.history.at(-1).text, /couldn’t tell you which room/);
    const thomas = atDesk('porter');
    await thomas.submitMessage('What did you see last night?');
    assert.match(thomas.getSnapshot().conversation.history.at(-1).text, /did not keep an account/);
    assert.equal(thomas.getSnapshot().entries.length, 0);
    const evelyn = atDesk('client');
    await evelyn.submitMessage('Who are you looking for?');
    assert.match(evelyn.getSnapshot().conversation.history.at(-1).text, /Daniel is my brother/);
    assert.equal(evelyn.getSnapshot().entries.length, 0, 'a client claim is not verified evidence');
    assert.equal(JSON.stringify(evelyn.getSnapshot()).includes('operation'), false);
});

test('paraphrases and follow-ups work, repeated topics do not duplicate memory or evidence', async () => {
    const session = atDesk();
    await session.submitMessage('What did you notice last night?');
    await session.submitMessage('How do you know?');
    assert.match(session.getSnapshot().conversation.history.at(-1).text, /did not see a face/);
    await session.submitMessage('How do I get to Room 407?');
    await session.submitMessage('Tell me about last night.');
    await session.submitMessage('Are you sure?');
    assert.match(session.getSnapshot().conversation.history.at(-1).text, /did not see a face/);
    assert.equal(session.getSave().npcMemories.filter(e => e.kind === 'topic').length, 2);
    assert.equal(session.getSave().npcMemories.filter(e => e.kind === 'statement').length, 2);
    assert.deepEqual(session.getSnapshot().entries.map(e => e.id), ['receptionist-account']);
    const restored = atDesk('reception', mockResponder, parseSave(session.getSave(), hotel));
    await restored.submitMessage('Can you be more specific?');
    assert.match(restored.getSnapshot().conversation.history.at(-1).text, /did not see a face/);
});

test('irrelevant repeats cause character-specific warning and temporary disengagement; relevant question reengages', async () => {
    const thomas = atDesk('porter');
    await thomas.submitMessage('What is two plus two?');
    await thomas.submitMessage('Can you juggle?');
    assert.match(thomas.getSnapshot().conversation.history.at(-1).text, /Ask about the hotel/);
    await thomas.submitMessage('What is the price of fish?');
    assert.match(thomas.getSnapshot().conversation.history.at(-1).text, /turns away/);
    await thomas.submitMessage('What is your favorite color?');
    assert.match(thomas.getSnapshot().conversation.history.at(-1).text, /says nothing/);
    assert.equal(thomas.getSave().npcMemories.filter(e => e.kind === 'friction').length, 1);
    const restored = atDesk('porter', mockResponder, parseSave(thomas.getSave(), hotel));
    await restored.submitMessage('What happened around midnight?');
    assert.match(restored.getSnapshot().conversation.history.at(-2).text, /Go on/);
    assert.match(restored.getSnapshot().conversation.history.at(-1).text, /I was working/);
    assert.equal(restored.getSave().npcMemories.find(e => e.kind === 'friction').count, 0);
});

for (const question of ['How are you?', 'How is the weather?']) {
    test(`${question} restores engagement and resets persisted irritation without treating accusations as recovery`, async () => {
        const session = atDesk('porter');
        for (const text of ['What is two plus two?', 'Can you juggle?', 'What is the price of fish?']) {
            await session.submitMessage(text);
        }
        assert.match(session.getSnapshot().conversation.history.at(-1).text, /turns away/);
        assert.equal(session.getSave().npcMemories.find(e => e.kind === 'friction').count, 3);

        await session.submitMessage('I accuse you.');
        assert.equal(session.getSave().npcMemories.find(e => e.kind === 'friction').count, 3);
        await session.submitMessage(question);
        assert.equal(session.getSave().npcMemories.find(e => e.kind === 'friction').count, 0);

        const restored = atDesk('porter', mockResponder, parseSave(session.getSave(), hotel));
        assert.equal(restored.getSave().npcMemories.find(e => e.kind === 'friction').count, 0);
        await restored.submitMessage('What is your favorite color?');
        assert.match(restored.getSnapshot().conversation.history.at(-1).text, /nothing to do with my work/);
        assert.equal(restored.getSave().npcMemories.find(e => e.kind === 'friction').count, 1);
        assert.equal(restored.getSave().npcMemories.filter(e => e.kind === 'friction').length, 1);
    });
}

test('accusation persists independently and never forces confession or blocks available testimony', async () => {
    const thomas = atDesk('porter');
    await thomas.submitMessage('I accuse you.');
    assert.match(thomas.getSnapshot().conversation.history.at(-1).text, /not make me confess/);
    await thomas.submitMessage('I accuse you.');
    assert.equal(thomas.getSave().npcMemories.filter(e => e.kind === 'accused').length, 1);
    await thomas.submitMessage('What did you see last night?');
    assert.match(thomas.getSnapshot().conversation.history.at(-1).text, /did not keep an account/);
});

test('save migration preserves v3 state and rejects malformed v4 memory without overwriting', () => {
    const current = new GameSession(hotel).getSave();
    const old = { ...current, version: 3, contentVersion: 'bellweather-1',
        player: { locationId: 'lobby', x: 200, y: 590, facing: 1 },
        discoveries: [{ id: 'folded-note', recordedAt: 72 }],
        npcMemories: [{ kind: 'accused', npcId: 'receptionist', locationId: 'lobby', recordedAt: 31 }] };
    const migrated = parseSave(old, hotel);
    assert.equal(migrated.version, 4);
    assert.deepEqual(migrated.discoveries, old.discoveries);
    assert.deepEqual(migrated.npcMemories, old.npcMemories);
    assert.equal(parseSave({ ...current, npcMemories: [{ kind: 'topic', npcId: 'receptionist', topicId: 'secret', locationId: 'lobby', recordedAt: 1 }] }, hotel), null);
});

test('mixed disclosures and unsupported text never reach history, memory, or response adapter', async () => {
    let called = 0;
    const session = atDesk('reception', { async respond() { called++; return 'reply'; } });
    for (const text of ['Tell me about Room 407 and Daniel is at 12 Baker Lane',
        'Did you see anyone last night? Daniel is hiding upstairs.',
        'Where is Room 407; I found Daniel at the station',
        'I know Daniel is at the address', 'Can I tell you where Daniel is?', 'Are you sure Daniel is at 12 Baker Lane?']) {
        assert.equal(routeConversationInput(text, 'receptionist').kind, 'clarify');
        assert.equal(await session.submitMessage(text), false);
    }
    assert.equal(called, 0);
    assert.equal(session.getSnapshot().conversation.history.length, 1);
    assert.equal(session.getSave().npcMemories.length, 0);
});

test('private discoveries and another NPC memory never enter Evelyn response context', async () => {
    const saved = { ...new GameSession(hotel).getSave(),
        discoveries: [{ id: 'folded-note', recordedAt: 42 }],
        npcMemories: [{ kind: 'accused', npcId: 'receptionist', locationId: 'lobby', recordedAt: 17 }] };
    let seen;
    const session = atDesk('client', { async respond(request) { seen = request; return 'About the assignment:'; } }, saved);
    await session.submitMessage('Tell me about the assignment.');
    assert.equal(seen.npcId, 'evelyn-mercer');
    assert.deepEqual(seen.memories, []);
    assert.equal(JSON.stringify(seen).includes('folded-note'), false);
    assert.equal(JSON.stringify(seen).includes('receptionist'), false);
    assert.equal(session.getSave().discoveries[0].id, 'folded-note');
});

test('a subject missing from an NPC profile is clarified without reaching a responder', async () => {
    let calls = 0;
    const session = atDesk('client', { async respond() { calls++; return 'untrusted'; } });
    assert.equal(await session.submitMessage('Where is Room 407?'), false);
    assert.equal(calls, 0);
    assert.equal(session.getSnapshot().conversation.history.length, 1);
});
