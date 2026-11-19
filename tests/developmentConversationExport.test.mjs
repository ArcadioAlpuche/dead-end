import test from 'node:test';
import assert from 'node:assert/strict';
import { formatConversationExport, recordRejectedInput, rememberOriginalInput } from '../src/ui/developmentConversationExport.ts';

test('export preserves accepted player input verbatim and keeps transcript order and speaker labels', () => {
    const greeting = { speaker: 'Hotel Clerk', text: 'Welcome to the Bellweather.' };
    const player = { speaker: 'Detective', text: 'What was he wearing?' };
    const response = { speaker: 'Hotel Clerk', text: 'They were carrying a coat.' };
    const originals = new WeakMap();
    assert.equal(rememberOriginalInput(originals, [greeting, player, response], '  What was he wearing?  ', [greeting]), true);
    const exported = formatConversationExport({ npcName: 'Arthur Finch', npcId: 'receptionist',
        buildMode: 'development', exportedAt: '2026-11-19T18:42:00.000Z',
        history: [greeting, player, response], originalInputByLine: originals, rejected: [] });
    assert.match(exported, /NPC: Arthur Finch\nNPC ID: receptionist\nBuild mode: development\nExported: 2026-11-19T18:42:00.000Z/);
    assert.ok(exported.indexOf('1. Hotel Clerk\nWelcome') < exported.indexOf('2. Detective\n  What was he wearing?  '));
    assert.ok(exported.indexOf('2. Detective\n  What was he wearing?  ') < exported.indexOf('3. Hotel Clerk\nThey were carrying a coat.'));
    assert.match(exported, /Rejected inputs \(not sent\)\nNone\./);
});

test('original-input mapping ignores older identical lines and preserves multiline text', () => {
    const old = { speaker: 'Detective', text: 'Who?' };
    const next = { speaker: 'Detective', text: 'Who?' };
    const originals = new WeakMap();
    assert.equal(rememberOriginalInput(originals, [old], 'Who? ', [old]), false);
    assert.equal(rememberOriginalInput(originals, [old, next], ' Who?\n', [old]), true);
    assert.equal(originals.get(old), undefined);
    assert.equal(originals.get(next), ' Who?\n');
    const exported = formatConversationExport({ npcName: 'Hotel Clerk', npcId: 'receptionist',
        exportedAt: '2026-11-19T18:42:00.000Z', history: [old, next], originalInputByLine: originals, rejected: [] });
    assert.match(exported, /1\. Detective\nWho\?\n\n2\. Detective\n Who\?\n\n/);
});

test('rejected inputs are logged separately, with exact text, message, timestamp and attempt order', () => {
    let rejected = [];
    rejected = recordRejectedInput(rejected, { text: '  Where?  ', message: 'Not sent. What are you referring to?',
        at: '2026-11-19T18:43:00.000Z', sent: false, actionPending: false });
    rejected = recordRejectedInput(rejected, { text: 'What was he wearing?\nI know where Daniel is.',
        message: 'Not sent. Ask about a specific topic first.', at: '2026-11-19T18:44:00.000Z',
        sent: false, actionPending: false });
    assert.equal(recordRejectedInput(rejected, { text: 'Hello', message: '', at: 'later', sent: true, actionPending: false }), rejected);
    assert.equal(recordRejectedInput(rejected, { text: 'Share address', message: 'Old error', at: 'later',
        sent: false, actionPending: true }), rejected);
    assert.equal(recordRejectedInput(rejected, { text: 'Unknown', message: '', at: 'later',
        sent: false, actionPending: false }), rejected);
    const exported = formatConversationExport({ npcName: 'Hotel Clerk', npcId: 'receptionist',
        exportedAt: '2026-11-19T18:45:00.000Z', history: [{ speaker: 'Hotel Clerk', text: 'Welcome.' }], rejected });
    assert.ok(exported.indexOf('Conversation (chronological)') < exported.indexOf('Rejected inputs (not sent)'));
    assert.ok(exported.indexOf('1. 2026-11-19T18:43:00.000Z') < exported.indexOf('2. 2026-11-19T18:44:00.000Z'));
    assert.match(exported, /Player input:\n  Where\?  \nRejection:\nNot sent\. What are you referring to\?/);
    assert.match(exported, /Player input:\nWhat was he wearing\?\nI know where Daniel is\./);
});

test('an empty conversation still exports identifying metadata and clear empty sections', () => {
    const exported = formatConversationExport({ npcName: 'Hotel Clerk', npcId: 'receptionist',
        exportedAt: '2026-11-19T18:45:00.000Z', history: [], rejected: [] });
    assert.match(exported, /Conversation \(chronological\)\nNo conversation messages recorded\./);
    assert.match(exported, /Rejected inputs \(not sent\)\nNone\./);
    assert.equal(exported.endsWith('\n'), true);
});
