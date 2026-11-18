import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { conversationScene, KANE_CONVERSATION_PORTRAIT, latestExchange, npcConversationPortrait }
    from '../src/ui/conversationPresentation.ts';

test('conversation presentation uses the approved character and layered Bellweather assets', () => {
    assert.equal(KANE_CONVERSATION_PORTRAIT,
        '/assets/characters/conversation/kane-portrait-v1.png');
    assert.equal(npcConversationPortrait('reception'),
        '/assets/characters/conversation/arthur-portrait-v1.png');
    assert.equal(npcConversationPortrait('other-contact'), null);
    const scene = conversationScene('lobby');
    assert.equal(scene.layers.length, 5);
    assert.ok(scene.layers.some(path => path.endsWith('/architecture.png')));
    assert.ok(scene.layers.some(path => path.endsWith('/desk.png')));
    assert.equal(conversationScene('room407'), null);
});

test('conversation portraits are separate high-resolution RGBA assets', () => {
    for (const path of [KANE_CONVERSATION_PORTRAIT, npcConversationPortrait('reception')]) {
        const png = readFileSync(new URL(`../public${path}`, import.meta.url));
        assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
        assert.ok(png.readUInt32BE(16) >= 1024);
        assert.ok(png.readUInt32BE(20) >= 1024);
        assert.equal(png[25], 6, `${path} must have an RGBA channel`);
        assert.ok(path.startsWith('/assets/characters/conversation/'));
    }
});

test('current exchange shows greeting, latest question and last authored NPC line', () => {
    const greeting = { speaker: 'Arthur Finch', text: 'Good evening.' };
    const first = { speaker: 'Detective', text: 'What did you see last night?' };
    const response = { speaker: 'Arthur Finch', text: 'Let me think.' };
    const authored = { speaker: 'Arthur Finch', text: 'Someone came downstairs.', recordId: 'receptionist-account' };
    const second = { speaker: 'Detective', text: 'Are you sure?' };
    assert.deepEqual(latestExchange({ history: [greeting], pending: false }), { question: null, response: greeting });
    assert.deepEqual(latestExchange({ history: [greeting, first, response, authored], pending: false }),
        { question: first, response: authored });
    assert.deepEqual(latestExchange({ history: [greeting, first, response, authored, second], pending: true }),
        { question: second, response: null }, 'prior testimony cannot appear as the pending answer');
    assert.deepEqual(latestExchange({ history: [greeting, first, response, authored, second], pending: false }),
        { question: second, response: null }, 'failed replies do not show an older answer');
});
