import test from 'node:test';
import assert from 'node:assert/strict';
import { ActionConfirmation } from '../src/core/actions.ts';
import { caseActionPolicy } from '../src/core/caseActions.ts';
import { routeConversationInput } from '../src/core/conversationBoundary.ts';
import { confirmationInputAction } from '../src/ui/confirmationInput.ts';
import { GameSession } from '../src/core/session.ts';
import { hotel } from '../src/content/hotel.ts';
import { loadLocal, saveLocal } from '../src/persistence/localSave.ts';

const acceptance = { kind: 'accept-assignment', caseId: 'case-001', recipientId: 'evelyn-mercer' };
function openOffer(session) {
    session.toggleNotebook();
    assert.ok(session.openCaseOffer('case-001'));
}
function openReceptionist(session) {
    const target = hotel.locations.lobby.interactions.find(item => item.id === 'receptionist');
    assert.ok(session.moveTo({ ...target, facing: 1 }));
    assert.ok(session.interact(target.id));
}

test('proposing/canceling is transient; only confirmation commits one complete acceptance snapshot', () => {
    const session = new GameSession(hotel);
    openOffer(session);
    const before = session.getSave();
    assert.ok(session.requestCaseAcceptance('case-001'));
    const first = session.getSnapshot().pendingAction;
    assert.equal(first.recipient.id, 'evelyn-mercer');
    assert.match(first.commitment, /locate Daniel Mercer/i);
    assert.deepEqual(session.getSave(), before);
    assert.equal(session.requestCaseAcceptance('case-001'), false, 'One proposal at a time');
    assert.ok(session.cancelAction(first.token));
    assert.equal(session.cancelAction(first.token), false);
    assert.equal(session.confirmAction(first.token), false);
    assert.deepEqual(session.getSave(), before);
    assert.equal(session.getSnapshot().caseOfferId, 'case-001', 'Cancel returns to request');
    assert.ok(session.requestCaseAcceptance('case-001'));
    const current = session.getSnapshot().pendingAction.token;
    assert.notEqual(current, first.token);
    assert.equal(session.confirmAction(first.token), false, 'An old token cannot confirm a new proposal');
    assert.equal(session.getSnapshot().pendingAction.token, current);
    const commits = [];
    session.subscribe(() => commits.push(session.getSave()));
    assert.ok(session.confirmAction(current));
    assert.equal(commits.length, 1);
    assert.equal(commits[0].cases['case-001'].history.length, 1);
    assert.deepEqual(commits[0].discoveries, before.discoveries);
    assert.deepEqual(commits[0].npcMemories, before.npcMemories);
    assert.equal(session.confirmAction(current), false);
    assert.equal(commits.length, 1);
});

test('pending acceptance blocks world and other UI commands; leaving invalidates its token', () => {
    const session = new GameSession(hotel);
    openOffer(session); session.requestCaseAcceptance('case-001');
    const token = session.getSnapshot().pendingAction.token;
    const player = session.getPlayer();
    assert.equal(session.isBlocked(), true);
    assert.equal(session.moveTo({ x: 230, y: 590, facing: 1 }), false);
    assert.equal(session.interact('lobby-stairs'), false);
    assert.equal(session.deferCase('case-001'), false);
    assert.equal(session.openCaseOffer('case-001'), false);
    assert.deepEqual(session.getPlayer(), player);
    session.toggleNotebook();
    assert.equal(session.getSnapshot().pendingAction, null);
    assert.equal(session.confirmAction(token), false);
    assert.equal(session.isBlocked(), false);
    assert.deepEqual(session.getSave().cases, {});
});

test('reloading a pending confirmation preserves v6 and cannot accept automatically', () => {
    const data = new Map();
    const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
    const session = new GameSession(hotel);
    openOffer(session); session.requestCaseAcceptance('case-001');
    const token = session.getSnapshot().pendingAction.token;
    assert.ok(saveLocal(storage, session));
    const loaded = loadLocal(storage, hotel);
    assert.equal(loaded.saved.version, 6);
    assert.deepEqual(loaded.saved.cases, {});
    assert.equal('pendingAction' in loaded.saved, false);
    const restored = new GameSession(hotel, loaded.saved);
    assert.equal(restored.getSnapshot().pendingAction, null);
    assert.equal(restored.isBlocked(), false);
    assert.equal(restored.confirmAction(token), false);
    openOffer(restored); restored.requestCaseAcceptance('case-001');
    assert.equal(restored.confirmAction(token), false, 'Token from another session is never valid');
});

test('eligibility and preview are revalidated at confirmation, including wrong recipients and changed case state', () => {
    const context = { saved: new GameSession(hotel).getSave(), offerId: 'case-001', notebookOpen: true, inConversation: false };
    const policy = caseActionPolicy(hotel);
    const gate = new ActionConfirmation(policy);
    assert.equal(gate.propose(context, { ...acceptance, recipientId: 'receptionist' }).ok, false);
    assert.equal(gate.getPending(), null);
    for (const changed of [
        { ...context, notebookOpen: false }, { ...context, offerId: null }, { ...context, inConversation: true },
        { ...context, saved: { ...context.saved, cases: { 'case-001': { status: 'active', history: [{ kind: 'accepted', recordedAt: 8 }] } } } },
    ]) {
        assert.equal(gate.propose(context, acceptance).ok, true);
        const token = gate.getPending().token;
        assert.equal(gate.confirm(token, changed, 10).ok, false);
        assert.equal(gate.getPending(), null);
        assert.deepEqual(context.saved.cases, {});
    }
    const world = structuredClone(hotel);
    const changedPreview = new ActionConfirmation(caseActionPolicy(world));
    changedPreview.propose(context, acceptance);
    world.cases['case-001'].assignment = 'A different test commitment';
    assert.match(changedPreview.confirm(changedPreview.getPending().token, context, 10).reason, /changed/);
});

// Noncanonical disclosure contract: no production content, NPC profile or save fields.
const route = { phrase: 'Share the test courier meeting point', recipientId: 'fixture-clerk', informationId: 'fixture-meeting' };
const initial = { known: true, delivered: false, npcContext: [], events: [], location: '42 Example Avenue (test only)' };
const disclosurePolicy = {
    review(state, request) {
        if (request.kind !== 'disclose-information' || request.informationId !== route.informationId
            || request.recipientId !== route.recipientId || !state.known || state.delivered) return { ok: false, reason: 'Not eligible' };
        return { ok: true, preview: { title: 'Share test meeting point', recipient: { id: route.recipientId, name: 'Fixture clerk' },
            commitment: 'Tell the clerk where the test courier will meet.', information: { id: route.informationId, text: state.location } } };
    },
    reduce(state, request, recordedAt) {
        return { ...state, delivered: true, npcContext: [...state.npcContext, state.location],
            events: [...state.events, { kind: 'test-disclosure', recipientId: request.recipientId, recordedAt }] };
    },
};

test('recognized fixture disclosure previews its recipient/information; cancel sends nothing; confirm prepares atomic fields', () => {
    const intercepted = routeConversationInput(route.phrase, route.recipientId, [route]);
    assert.equal(intercepted.kind, 'action');
    const gate = new ActionConfirmation(disclosurePolicy);
    const before = structuredClone(initial);
    assert.equal(gate.propose(initial, intercepted.request).ok, true);
    const pending = gate.getPending();
    assert.equal(pending.recipient.id, route.recipientId);
    assert.equal(pending.information.text, initial.location);
    assert.ok(gate.cancel(pending.token));
    assert.deepEqual(initial, before, 'No NPC context, event or delivery changes on cancel');
    gate.propose(initial, intercepted.request);
    const token = gate.getPending().token;
    const committed = gate.confirm(token, initial, 123);
    assert.equal(committed.ok, true);
    assert.equal(committed.state.delivered, true);
    assert.deepEqual(committed.state.npcContext, [initial.location]);
    assert.deepEqual(committed.state.events, [{ kind: 'test-disclosure', recipientId: route.recipientId, recordedAt: 123 }]);
    assert.deepEqual(initial, before, 'Reducer prepares a new state without intermediate mutations');
    assert.equal(gate.confirm(token, committed.state, 124).ok, false);
    assert.equal(gate.propose(committed.state, intercepted.request).ok, false);
});

test('ambiguous/wrong-recipient fixtures and changed information cannot be dispatched or silently confirmed', () => {
    for (const [text, recipient, routes] of [
        [route.phrase, 'someone-else', [route]], [route.phrase, route.recipientId, [route, { ...route, informationId: 'different' }]],
        ['Maybe share the meeting point?', route.recipientId, [route]],
        [`${route.phrase}. Also tell someone else.`, route.recipientId, [route]],
    ]) assert.equal(routeConversationInput(text, recipient, routes).kind, 'clarify');
    const request = routeConversationInput(route.phrase, route.recipientId, [route]).request;
    const gate = new ActionConfirmation(disclosurePolicy);
    gate.propose(initial, request);
    assert.equal(gate.confirm(gate.getPending().token, { ...initial, known: false }, 1).ok, false);
    gate.propose(initial, request);
    assert.match(gate.confirm(gate.getPending().token, { ...initial, location: 'Changed private test location' }, 1).reason, /changed/);
    const failing = new ActionConfirmation({ ...disclosurePolicy, reduce() { throw new Error('Preparation failed'); } });
    failing.propose(initial, request);
    assert.equal(failing.confirm(failing.getPending().token, initial, 1).ok, false);
    assert.equal(initial.delivered, false);
    assert.deepEqual(initial.events, []);
});

test('unrecognized disclosures are intercepted before any responder, transcript, memory or testimony change', async () => {
    const calls = [];
    const session = new GameSession(hotel, undefined, { async respond(request) { calls.push(request); return 'Hello'; } });
    openReceptionist(session);
    const before = session.getSave();
    const history = session.getSnapshot().conversation.history;
    for (const text of [
        'Nora is at 42 Example Avenue.', 'I found her. She is staying over the test bakery.',
        'Hello. The test courier is upstairs.', 'What did you see last night? Nora is at the test depot.',
        'I accuse you. The test courier lives on Example Avenue.', 'Should I tell you where Nora is?',
        'Share the test courier meeting point', 'I accept Evelyn’s assignment.',
    ]) {
        assert.equal(await session.submitMessage(text), false);
        assert.match(session.getSnapshot().conversation.error, /Not sent/);
        assert.deepEqual(session.getSnapshot().conversation.history, history);
        assert.deepEqual(session.getSave(), before);
        assert.equal(calls.length, 0);
    }
    session.closeDialogue(); openReceptionist(session);
    await session.submitMessage('Hello');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].text, 'Hello');
    assert.equal(JSON.stringify(calls).includes('Nora'), false, 'Canceled/abandoned drafts never appear in later context');
    assert.equal(session.proposeAction({ kind: 'disclose-information', informationId: route.informationId, recipientId: 'receptionist' }), false);
    assert.equal(session.getSnapshot().pendingAction, null, 'Fixture actions are not enabled in the actual game');
});

test('late asynchronous replies cannot replace a new confirmation or grant testimony after leaving', async () => {
    let finish;
    const session = new GameSession(hotel, undefined, { respond: () => new Promise(resolve => { finish = resolve; }) });
    openReceptionist(session);
    const response = session.submitMessage('What did you see last night?');
    assert.equal(session.proposeAction(acceptance), false);
    session.closeDialogue(); openOffer(session); session.requestCaseAcceptance('case-001');
    const token = session.getSnapshot().pendingAction.token;
    finish('Late response'); await response;
    assert.equal(session.getSnapshot().pendingAction.token, token);
    assert.equal(session.getSnapshot().conversation, null);
    assert.equal(session.getSave().discoveries.length, 0);
    assert.ok(session.cancelAction(token));
    assert.deepEqual(session.getSave().cases, {});
});

test('confirmation key policy traps navigation, blocks repeats/composition and activates only focused controls', () => {
    const key = { key: 'Enter', shiftKey: false, repeat: false, isComposing: false };
    assert.equal(confirmationInputAction(key), 'activate');
    assert.equal(confirmationInputAction({ ...key, key: 'Escape' }), 'cancel');
    assert.equal(confirmationInputAction({ ...key, key: 'Tab' }), 'next');
    assert.equal(confirmationInputAction({ ...key, key: 'Tab', shiftKey: true }), 'previous');
    for (const value of ['Enter', ' ', 'Escape', 'Tab']) assert.equal(confirmationInputAction({ ...key, key: value, repeat: true }), 'block');
    assert.equal(confirmationInputAction({ ...key, isComposing: true }), 'block');
    for (const value of ['w', 'a', 's', 'd', 'e', 'ArrowUp', 'ArrowDown']) assert.equal(confirmationInputAction({ ...key, key: value }), 'block');
});
