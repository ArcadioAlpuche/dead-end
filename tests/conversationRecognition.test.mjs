import test from 'node:test';
import assert from 'node:assert/strict';
import { hotel } from '../src/content/hotel.ts';
import { GameSession } from '../src/core/session.ts';
import { routeConversationInput } from '../src/core/conversationBoundary.ts';
import { validateWorld } from '../src/core/validation.ts';
import { mockResponder } from '../src/conversation/mockResponder.ts';

const route = (text, profile = hotel.conversations.reception) =>
    routeConversationInput(text, profile.npcId, [], null, profile);

function atNpc(conversationId = 'reception') {
    const target = conversationId === 'reception'
        ? hotel.locations.lobby.interactions.find(item => item.id === 'receptionist')
        : { id: `test-${conversationId}`, kind: 'talk', label: conversationId,
            x: 350, y: 660, conversationId };
    const world = conversationId === 'reception' ? hotel : { ...hotel, locations: { ...hotel.locations,
        lobby: { ...hotel.locations.lobby, interactions: [...hotel.locations.lobby.interactions, target] } } };
    const session = new GameSession(world, undefined, mockResponder);
    assert.ok(session.moveTo({ x: target.x, y: target.y, facing: 1 }));
    assert.ok(session.interact(target.id));
    return session;
}

test('profile-driven recognition accepts complete natural questions and bounded informal spellings', () => {
    const examples = [
        ['What do you know about Daniel Mercer?', 'account', 'person-about'],
        ['Do you know Daniel Mercer?', 'account', 'person-acquaintance'],
        ['What can you tell me about Daniel?', 'account', 'person-about'],
        ['You know anything about Mercer?', 'account', 'person-about'],
        ['Have you seen Daniel Mercer?', 'account', 'person-sighting'],
        ['Tell me about the guy in Room 407.', 'room', 'person-about'],
        ['wat do u know bout daniel?', 'account', 'person-about'],
        ['did daniel chek out?', 'account', 'person-departure'],
        ['where did daniel go', 'account', 'person-whereabouts'],
        ['you seen mercer', 'account', 'person-sighting'],
        ['wats ur name', 'introduction', undefined],
        ['WAT DO U KNOW BOUT ROOM 407', 'room', undefined],
        ['What did you witness last night?', 'account', undefined],
        ['What can you tell me about the guest register?', 'register', undefined],
        ['can i see the register', 'register', undefined],
    ];
    for (const [text, topic, intent] of examples) {
        assert.deepEqual(route(text), { kind: 'ordinary', topic, ...(intent ? { intent } : {}) }, text);
    }
});

test('the same question grammar resolves subjects through each NPC profile', () => {
    assert.deepEqual(route('What do you know about Daniel Mercer?', hotel.conversations.porter),
        { kind: 'ordinary', topic: 'account', intent: 'person-about' });
    assert.deepEqual(route('What do you know about Daniel Mercer?', hotel.conversations.client),
        { kind: 'ordinary', topic: 'assignment' });
    const custom = { ...hotel.conversations.reception, npcId: 'fixture-npc', topics: {
        person: { id: 'person', recognition: [{ kind: 'person', aliases: ['Ada Gray'] }] },
    } };
    assert.deepEqual(route('What do you know about Ada Gray?', custom),
        { kind: 'ordinary', topic: 'person', intent: 'person-about' });
    assert.equal(route('What do you know about Daniel Mercer?', custom).kind, 'clarify');
});

test('Daniel questions keep acquaintance, sighting, and whereabouts distinct without granting evidence', async () => {
    const session = atNpc();
    assert.ok(await session.submitMessage('What do you know about Daniel Mercer?'));
    assert.match(session.getSnapshot().conversation.history.at(-1).text, /cannot identify that person as Daniel Mercer/);
    assert.deepEqual(session.getSnapshot().entries, []);
    assert.deepEqual(session.getSave().cases, {});
    assert.deepEqual(session.getSave().npcContacts.receptionist.disclosures, {});
    assert.ok(await session.submitMessage('Do you know Daniel Mercer?'));
    assert.match(session.getSnapshot().conversation.history.at(-1).text, /name alone/);
    assert.ok(await session.submitMessage('Have you seen Daniel Mercer?'));
    assert.match(session.getSnapshot().conversation.history.at(-1).text, /cannot say it was Daniel Mercer/);
    assert.ok(await session.submitMessage('where did daniel go'));
    assert.match(session.getSnapshot().conversation.history.at(-1).text, /did not see where the person went/);
    assert.deepEqual(session.getSnapshot().entries, []);
    assert.equal(session.getSave().npcMemories.some(event => event.kind === 'statement'), false);
});

test('NPC-specific authored boundaries remain intact for Daniel, Room 407, and the register', async () => {
    const porter = atNpc('porter');
    assert.ok(await porter.submitMessage('Have you seen Daniel Mercer?'));
    assert.match(porter.getSnapshot().conversation.history.at(-1).text, /did not keep an account/);
    assert.deepEqual(porter.getSnapshot().entries, []);
    const client = atNpc('client');
    assert.ok(await client.submitMessage('What do you know about Daniel Mercer?'));
    assert.match(client.getSnapshot().conversation.history.at(-1).text, /Daniel is my brother/);
    assert.deepEqual(client.getSnapshot().entries, []);
    assert.equal(client.getSave().npcMemories.some(event => event.kind === 'statement'
        && event.statementId === 'evelyn-mercer:assignment'), true);
    assert.ok(await client.submitMessage('Tell me about Daniel.'));
    assert.equal(client.getSave().npcMemories.filter(event => event.kind === 'statement').length, 1);
    const arthur = atNpc();
    assert.ok(await arthur.submitMessage('Tell me about the guy in Room 407.'));
    assert.match(arthur.getSnapshot().conversation.history.at(-1).text, /who, if anyone, was in 407/);
    assert.ok(await arthur.submitMessage('What can you tell me about the guest register?'));
    assert.match(arthur.getSnapshot().conversation.history.at(-1).text, /guest register is here at the front desk/);
    assert.deepEqual(arthur.getSnapshot().entries, []);
});

test('informal introductions preserve the player’s original wording and only the facts explicitly claimed', async () => {
    const session = atNpc();
    assert.deepEqual(route('im thomas kane'), { kind: 'player-disclosure', facts: ['name'] });
    assert.deepEqual(route('i am a private investigater'), { kind: 'player-disclosure', facts: ['occupation'] });
    assert.ok(await session.submitMessage('im thomas kane'));
    assert.equal(session.getSnapshot().conversation.history.at(-2).text, 'im thomas kane');
    assert.equal(session.getNpcKaneKnowledge('receptionist', 'name').status, 'claimed');
    assert.equal(session.getNpcKaneKnowledge('receptionist', 'occupation'), null);
    assert.ok(await session.submitMessage('i am a private investigater'));
    assert.equal(session.getSnapshot().conversation.history.at(-2).text, 'i am a private investigater');
    assert.equal(session.getNpcKaneKnowledge('receptionist', 'occupation').status, 'claimed');
    assert.equal(session.getNpcKaneKnowledge('receptionist', 'former-police'), null);
});

test('questions, negation, unrelated names, mixed clauses and fuzzy protected actions fail closed', async () => {
    const session = atNpc();
    const before = session.getSave();
    const historyLength = session.getSnapshot().conversation.history.length;
    const unsafe = [
        'Are you Thomas Kane?', "I'm not Thomas Kane.", "I'm not a private investigator.",
        'Did you used to be a cop?', 'What do you know about Daniel Craig?',
        'What do you know about Michael Mercer?', 'Do you know Jonathan Mercer?',
        'I promise to find Daniel.', 'I accuze you.',
        'I know Daniel is at 12 Baker Lane.', 'im thomas kane and daniel is upstairs',
        'What do you know about Daniel Mercer? He is at 12 Baker Lane.',
        'What do you know about Daniel Mercer? I know where he is.',
        'Did Daniel chek out and go to 12 Baker Lane?',
    ];
    for (const text of unsafe) {
        assert.equal(route(text).kind, 'clarify', text);
        assert.equal(await session.submitMessage(text), false, text);
    }
    assert.deepEqual(session.getSave(), before);
    assert.equal(session.getSnapshot().conversation.history.length, historyLength);
    assert.deepEqual(route('I accuse you.'), { kind: 'ordinary', topic: 'accusation' });
    const protectedRoute = { phrase: 'Share the test courier meeting point',
        informationId: 'test-meeting', recipientId: 'receptionist' };
    assert.deepEqual(routeConversationInput(protectedRoute.phrase, protectedRoute.recipientId,
        [protectedRoute], null, hotel.conversations.reception),
    { kind: 'action', request: { kind: 'disclose-information', informationId: 'test-meeting', recipientId: 'receptionist' } });
    assert.equal(routeConversationInput('Sharre the test courier meeting point', protectedRoute.recipientId,
        [protectedRoute], null, hotel.conversations.reception).kind, 'clarify');
});

test('ambiguous profile aliases are rejected before an NPC can use them', () => {
    const profile = hotel.conversations.reception;
    const world = { ...hotel, conversations: { ...hotel.conversations, reception: { ...profile,
        topics: { ...profile.topics, register: { ...profile.topics.register,
            recognition: [{ kind: 'person', aliases: ['Daniel Mercer'] }] } },
    } } };
    assert.throws(() => validateWorld(world), /Ambiguous topic alias/);
});
