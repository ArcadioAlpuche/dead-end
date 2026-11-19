import test from 'node:test';
import assert from 'node:assert/strict';
import { GameSession } from '../src/core/session.ts';
import { npcDisplayName } from '../src/core/npcIdentity.ts';
import { parseSave } from '../src/core/validation.ts';
import { hotel } from '../src/content/hotel.ts';
import { mockResponder } from '../src/conversation/mockResponder.ts';

function meetArthur(saved) {
    const session = new GameSession(hotel, saved, mockResponder);
    assert.equal(session.moveTo({ x: 730, y: 660, facing: 1 }), true);
    assert.equal(session.interact('receptionist'), true);
    return session;
}

test('the unknown clerk has a descriptive label; an authored introduction establishes the name without rewriting history', async () => {
    const session = meetArthur();
    assert.equal(session.getSnapshot().conversation.name, 'Hotel Clerk');
    assert.equal(session.getSnapshot().conversation.history[0].speaker, 'Hotel Clerk');
    await session.submitMessage("What's your name?");
    const conversation = session.getSnapshot().conversation;
    assert.equal(conversation.name, 'Arthur Finch');
    assert.equal(conversation.history[0].speaker, 'Hotel Clerk');
    assert.equal(conversation.history.at(-1).speaker, 'Arthur Finch');
    assert.match(conversation.history.at(-1).text, /Arthur Finch/);
    assert.equal(session.getSave().npcIdentities.receptionist.status, 'established');
    session.closeDialogue();
    assert.equal(session.interact('receptionist'), true);
    assert.equal(session.getSnapshot().conversation.name, 'Arthur Finch');
});

test('uncertain identity remains a claim; unsupported guesses cannot establish it', async () => {
    const base = new GameSession(hotel).getSave();
    const claimed = parseSave({ ...base, npcIdentities: {
        receptionist: { status: 'claimed', claimedName: 'Arthur Finch', recordedAt: 20 },
    } }, hotel);
    const session = meetArthur(claimed);
    assert.equal(session.getSnapshot().conversation.name, 'Hotel Clerk');
    assert.equal(await session.submitMessage('You look like Arthur Finch.'), false);
    assert.deepEqual(session.getSave().npcIdentities, claimed.npcIdentities);
    assert.equal(npcDisplayName(hotel.conversations.reception, claimed.npcIdentities.receptionist), 'Hotel Clerk');
});

test('adapter text cannot grant identity and repeating an introduction keeps its original timestamp', async () => {
    const session = new GameSession(hotel, undefined, { async respond() { return 'I am Arthur Finch.'; } });
    session.moveTo({ x: 730, y: 660, facing: 1 });
    session.interact('receptionist');
    await session.submitMessage('Hello.');
    assert.equal(session.getSnapshot().conversation.name, 'Hotel Clerk');
    assert.deepEqual(session.getSave().npcIdentities, {});
    await session.submitMessage('What is your name?');
    const first = session.getSave().npcIdentities.receptionist;
    await session.submitMessage('Who are you?');
    assert.deepEqual(session.getSave().npcIdentities.receptionist, first);
});

test('identity is independent of accusation memory and survives a scene change and save/load', async () => {
    const session = meetArthur();
    await session.submitMessage('I accuse you.');
    await session.submitMessage('May I have your name?');
    assert.equal(session.getSave().npcMemories.some(event => event.kind === 'accused'), true);
    assert.equal(session.getSave().npcIdentities.receptionist.status, 'established');
    session.closeDialogue();
    assert.equal(session.moveTo({ x: 1110, y: 625, facing: 1 }), true);
    assert.equal(session.interact('lobby-stairs'), true);
    const saved = parseSave(JSON.parse(JSON.stringify(session.getSave())), hotel);
    assert.deepEqual(saved.npcIdentities, session.getSave().npcIdentities);
    const restored = new GameSession(hotel, saved, mockResponder);
    assert.equal(restored.getPlayer().locationId, 'staircase');
    assert.equal(restored.moveTo({ x: 120, y: 540, facing: -1 }), true);
    assert.equal(restored.interact('stairs-lobby'), true);
    assert.equal(restored.moveTo({ x: 730, y: 660, facing: 1 }), true);
    assert.equal(restored.interact('receptionist'), true);
    assert.equal(restored.getSnapshot().conversation.name, 'Arthur Finch');
    assert.match(restored.getSnapshot().conversation.history[0].text, /remember your accusation/);
});

test('v4 migration preserves progress, infers only durable prior Arthur encounters, and rejects invalid v5 identities', () => {
    const base = new GameSession(hotel).getSave();
    const old = { ...base, version: 4, npcIdentities: undefined,
        discoveries: [{ id: 'receptionist-account', recordedAt: 50 }, { id: 'folded-note', recordedAt: 60 }],
        npcMemories: [{ kind: 'accused', npcId: 'receptionist', locationId: 'lobby', recordedAt: 40 }] };
    const migrated = parseSave(old, hotel);
    assert.equal(migrated.version, 6);
    assert.deepEqual(migrated.discoveries, old.discoveries);
    assert.deepEqual(migrated.npcMemories, old.npcMemories);
    assert.deepEqual(migrated.npcIdentities, { receptionist: { status: 'established', recordedAt: 40 } });
    assert.deepEqual(parseSave({ ...old, discoveries: [], npcMemories: [] }, hotel).npcIdentities, {});
    for (const npcIdentities of [undefined, { missing: { status: 'established', recordedAt: 1 } },
        { receptionist: { status: 'established', recordedAt: -1 } },
        { receptionist: { status: 'claimed', claimedName: '', recordedAt: 1 } },
        { receptionist: { status: 'suspected', recordedAt: 1 } }]) {
        assert.equal(parseSave({ ...base, npcIdentities }, hotel), null);
    }
});
