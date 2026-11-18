import test from 'node:test';
import assert from 'node:assert/strict';
import { conversationInputHeight } from '../src/ui/conversationInput.ts';

test('question field grows with content and caps before pushing controls away', () => {
    assert.equal(conversationInputHeight(25, 52, 140), 52);
    assert.equal(conversationInputHeight(91, 52, 140), 91);
    assert.equal(conversationInputHeight(240, 52, 140), 140);
    assert.equal(conversationInputHeight(240, 52, 75), 75);
    assert.equal(conversationInputHeight(240, 52, 40), 52);
});
