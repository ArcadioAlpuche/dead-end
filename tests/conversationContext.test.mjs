import test from 'node:test';
import assert from 'node:assert/strict';
import { hotel } from '../src/content/hotel.ts';
import { GameSession } from '../src/core/session.ts';
import { routeConversationInput } from '../src/core/conversationBoundary.ts';
import { parseSave } from '../src/core/validation.ts';
import { mockResponder } from '../src/conversation/mockResponder.ts';

function atNpc(conversationId = 'reception', saved, world = hotel) {
    const target = { id: `context-${conversationId}`, kind: 'talk', label: conversationId,
        x: 400, y: 575, conversationId };
    const fixture = { ...world, locations: { ...world.locations,
        lobby: { ...world.locations.lobby, interactions: [...world.locations.lobby.interactions, target] } } };
    const session = new GameSession(fixture, saved, mockResponder);
    assert.ok(session.moveTo({ x: target.x, y: target.y, facing: 1 }));
    assert.ok(session.interact(target.id));
    return session;
}

test('Arthur’s reply referent stays distinct from Daniel in Kane’s question', async () => {
    const session = atNpc();
    assert.ok(await session.submitMessage('Have you seen Daniel Mercer?'));
    assert.match(session.getSnapshot().conversation.history.at(-1).text, /cannot say it was Daniel Mercer/);
    for (const [question, answer] of [
        ['What was he wearing?', /carrying a coat.*could not tell you what they wore/],
        ['Did you see his face?', /did not see a face/],
        ['What about him?', /saw someone come down.*did not see a face/],
        ['Who?', /cannot identify the person/],
    ]) {
        assert.ok(await session.submitMessage(question), question);
        assert.equal(session.getSnapshot().conversation.history.at(-2).text, question);
        assert.match(session.getSnapshot().conversation.history.at(-1).text, answer);
    }
    assert.deepEqual(session.getSnapshot().entries, []);
    assert.equal(session.getSave().npcMemories.some(event => event.kind === 'statement'), false);
    assert.deepEqual(session.getSave().cases, {});
    assert.equal(JSON.stringify(session.getSave()).includes('bellweather-midnight-visitor'), false);
});

test('contextual questions use room, sighting, and checkout replies without adding facts', async () => {
    const cases = [
        ['What do you know about Room 407?', [
            ['Who stayed there?', /cannot tell you who, if anyone, stayed in 407/],
            ['Where?', /Fourth floor/],
        ]],
        ['Did you see anything unusual last night?', [
            ['When?', /Around midnight/],
            ['Where?', /Coming down from upstairs/],
            ['What happened next?', /did not see where they went afterward/],
        ]],
        ['did daniel chek out?', [
            ['When?', /cannot say whether or when Daniel Mercer checked out/],
            ['Are you sure?', /cannot say that Daniel Mercer checked out/],
        ]],
    ];
    for (const [opening, followUps] of cases) {
        const session = atNpc();
        assert.ok(await session.submitMessage(opening), opening);
        for (const [question, answer] of followUps) {
            assert.ok(await session.submitMessage(question), `${opening} / ${question}`);
            assert.match(session.getSnapshot().conversation.history.at(-1).text, answer);
        }
        assert.deepEqual(session.getSave().cases, {});
        assert.equal(session.getSave().npcContacts.receptionist.disclosures.name, undefined);
    }
});

test('checkout spelling, explicit room occupant, and Daniel identity use bounded authored replies', async () => {
    const arthur = atNpc();
    for (const [question, reply] of [
        ['DiD Daniel Checkout?', /cannot say whether Daniel Mercer checked out/],
        ['Who stayed in Room 407?', /cannot tell you who, if anyone, stayed in 407/],
        ['Who is Daniel?', /cannot tell you who Daniel Mercer is/],
    ]) {
        assert.ok(await arthur.submitMessage(question), question);
        assert.equal(arthur.getSnapshot().conversation.history.at(-2).text, question);
        assert.match(arthur.getSnapshot().conversation.history.at(-1).text, reply);
        if (question === 'DiD Daniel Checkout?') {
            assert.ok(await arthur.submitMessage('When?'));
            assert.match(arthur.getSnapshot().conversation.history.at(-1).text, /cannot say whether or when Daniel Mercer checked out/);
        }
    }
    assert.deepEqual(arthur.getSnapshot().entries, []);
    assert.equal(arthur.getSave().npcMemories.some(event => event.kind === 'statement'), false);
    assert.deepEqual(arthur.getSave().cases, {});
    const directRoom = atNpc();
    assert.ok(await directRoom.submitMessage('Who stayed in Room 407?'), 'the explicit room question needs no prior topic');
    assert.match(directRoom.getSnapshot().conversation.history.at(-1).text, /cannot tell you who, if anyone, stayed in 407/);
    assert.deepEqual(directRoom.getSnapshot().entries, []);
    const evelyn = atNpc('client');
    assert.ok(await evelyn.submitMessage('Who is Daniel?'));
    assert.match(evelyn.getSnapshot().conversation.history.at(-1).text, /Daniel is my brother/);
    assert.deepEqual(evelyn.getSnapshot().entries, []);
    const porter = atNpc('porter');
    const before = porter.getSave();
    assert.equal(await porter.submitMessage('Who is Daniel?'), false);
    assert.deepEqual(porter.getSave(), before);
});

test('a downstairs sighting never becomes a hotel departure', async () => {
    const session = atNpc();
    assert.ok(await session.submitMessage('Did you see anyone last night?'));
    const before = session.getSave();
    const historyLength = session.getSnapshot().conversation.history.length;
    for (const question of ['Did you see anyone leave?', 'Did anyone leave the hotel?', 'Did you see Daniel leave?']) {
        assert.equal(await session.submitMessage(question), false, question);
        assert.equal(session.getSnapshot().conversation.history.length, historyLength);
        assert.deepEqual(session.getSave(), before);
    }
    assert.ok(await session.submitMessage('What was he wearing?'), 'unsupported departure questions do not replace sighting context');
    assert.match(session.getSnapshot().conversation.history.at(-1).text, /carrying a coat/);
});

test('topic switches replace context, while rejected input and repeated questions do not', async () => {
    const session = atNpc();
    assert.ok(await session.submitMessage('Did you see anyone last night?'));
    assert.ok(await session.submitMessage('What was he wearing?'));
    const historyLength = session.getSnapshot().conversation.history.length;
    assert.equal(await session.submitMessage('Who was Daniel with at the garage?'), false);
    assert.equal(session.getSnapshot().conversation.history.length, historyLength);
    assert.ok(await session.submitMessage('What was he wearing?'));
    assert.ok(await session.submitMessage('What can you tell me about Room 407?'));
    assert.equal(await session.submitMessage('What was he wearing?'), false);
    assert.match(session.getSnapshot().conversation.error, /Who do you mean/);
    assert.ok(await session.submitMessage('Who stayed there?'));
    assert.ok(await session.submitMessage('What do you know about Daniel Mercer?'));
    assert.ok(await session.submitMessage('Did you see his face?'));
    assert.deepEqual(session.getSnapshot().entries.map(entry => entry.id), ['receptionist-account']);
});

test('a new authored generic follow-up line supplies the next referent', async () => {
    const session = atNpc();
    assert.ok(await session.submitMessage('Do you know Daniel Mercer?'));
    assert.equal(await session.submitMessage('What was he wearing?'), false);
    assert.ok(await session.submitMessage('Can you be more specific?'));
    assert.match(session.getSnapshot().conversation.history.at(-1).text, /someone coming down/);
    assert.ok(await session.submitMessage('What was he wearing?'));
    assert.match(session.getSnapshot().conversation.history.at(-1).text, /carrying a coat/);
});

test('short questions need context, and unsupported authored answers stay private', async () => {
    const session = atNpc();
    const before = session.getSave();
    for (const question of ['When?', 'Where?', 'Who?', 'What was he wearing?', 'Who stayed there?']) {
        assert.equal(await session.submitMessage(question), false, question);
    }
    assert.deepEqual(session.getSave(), before);
    assert.equal(session.getSnapshot().conversation.history.length, 1);
    assert.ok(await session.submitMessage('What do you know about Room 407?'));
    const historyLength = session.getSnapshot().conversation.history.length;
    assert.equal(await session.submitMessage('What happened next?'), false);
    assert.equal(session.getSnapshot().conversation.history.length, historyLength);
    assert.ok(await session.submitMessage('Do you know Daniel Mercer?'));
    const afterAcquaintance = session.getSave();
    assert.equal(await session.submitMessage('What was he wearing?'), false,
        'Kane naming Daniel does not make Arthur’s noncommittal reply a sighting');
    assert.deepEqual(session.getSave(), afterAcquaintance);
});

test('multiple authored person referents require clarification rather than a guessed answer', async () => {
    const reception = hotel.conversations.reception;
    const account = reception.topics.account;
    const world = { ...hotel, conversations: { ...hotel.conversations, reception: { ...reception,
        topics: { ...reception.topics, account: { ...account,
            replyContext: { ...account.replyContext, default: { focus: 'sighting', referents: [
                { id: 'daniel-mercer', kind: 'person', identity: 'named' },
                { id: 'thomas-bell', kind: 'person', identity: 'named' },
            ] } },
        } },
    } } };
    const session = atNpc('reception', undefined, world);
    assert.ok(await session.submitMessage('What did you see last night?'));
    const before = session.getSave();
    const historyLength = session.getSnapshot().conversation.history.length;
    assert.equal(await session.submitMessage('What did he say?'), false);
    assert.match(session.getSnapshot().conversation.error, /Who do you mean/);
    assert.equal(session.getSnapshot().conversation.history.length, historyLength);
    assert.deepEqual(session.getSave(), before);
});

test('protected input cannot use context to disclose, accuse, or assert an identity', async () => {
    const session = atNpc();
    assert.ok(await session.submitMessage('Have you seen Daniel Mercer?'));
    const before = session.getSave();
    for (const input of [
        'What was he wearing? I know where Daniel is.',
        'I told him Daniel is at 12 Baker Lane.',
        'If he were Daniel, I would accuse you.',
        'I do not know where he is.',
    ]) assert.equal(await session.submitMessage(input), false, input);
    assert.deepEqual(session.getSave(), before);
    assert.equal(session.getSnapshot().conversation.history.length, 3);
    const protectedRoute = { phrase: 'Share a test address', informationId: 'test-address', recipientId: 'receptionist' };
    assert.equal(routeConversationInput('Share a test address', 'receptionist', [protectedRoute], 'account',
        hotel.conversations.reception, { npcId: 'receptionist', topicId: 'account', replyReferents: [] }).kind, 'action');
    assert.equal(routeConversationInput('Share a test address if he asks', 'receptionist', [protectedRoute], 'account',
        hotel.conversations.reception, { npcId: 'receptionist', topicId: 'account', replyReferents: [] }).kind, 'clarify');
});

test('close, reload, other NPCs, and separate investigations do not inherit transient referents', async () => {
    const first = atNpc();
    assert.ok(await first.submitMessage('What do you know about Room 407?'));
    assert.ok(await first.submitMessage('Who stayed there?'));
    const save = first.getSave();
    assert.equal(save.version, 6);
    assert.equal('conversationContext' in save, false);
    first.closeDialogue();
    assert.ok(first.interact('context-reception'));
    assert.equal(await first.submitMessage('Who stayed there?'), false);
    const restored = atNpc('reception', parseSave(save, hotel));
    assert.equal(await restored.submitMessage('Who stayed there?'), false);
    const second = atNpc('reception');
    assert.equal(await second.submitMessage('Who stayed there?'), false);
    const porter = atNpc('porter');
    assert.equal(await porter.submitMessage('Who stayed there?'), false);
});

test('switching NPCs in one session clears referential context', async () => {
    const porter = { id: 'context-porter', kind: 'talk', label: 'Porter', x: 400, y: 660, conversationId: 'porter' };
    const world = { ...hotel, locations: { ...hotel.locations, lobby: { ...hotel.locations.lobby,
        interactions: [...hotel.locations.lobby.interactions, porter] } } };
    const session = new GameSession(world, undefined, mockResponder);
    assert.ok(session.moveTo({ x: 730, y: 660, facing: 1 }));
    assert.ok(session.interact('receptionist'));
    assert.ok(await session.submitMessage('What do you know about Room 407?'));
    session.closeDialogue();
    assert.ok(session.moveTo({ x: 400, y: 660, facing: 1 }));
    assert.ok(session.interact('context-porter'));
    assert.equal(await session.submitMessage('Who stayed there?'), false);
    assert.equal(session.getSave().npcContacts['thomas-bell'].disclosures.name, undefined);
});
