import test from 'node:test';
import assert from 'node:assert/strict';
import { conversationShortcutAction } from '../src/ui/conversationShortcuts.ts';

const key = (overrides = {}) => ({ key: 'h', repeat: false, isComposing: false,
    ctrlKey: false, altKey: false, metaKey: false, editable: false, ...overrides });

test('H toggles history only outside editable controls', () => {
    assert.equal(conversationShortcutAction(key()), 'history');
    assert.equal(conversationShortcutAction(key({ key: 'H' })), 'history');
    assert.equal(conversationShortcutAction(key({ editable: true })), 'none');
    assert.equal(conversationShortcutAction(key({ key: 'Enter' })), 'none');
});

test('history shortcut ignores repeats, composition, and modified keys', () => {
    for (const overrides of [{ repeat: true }, { isComposing: true }, { ctrlKey: true },
        { altKey: true }, { metaKey: true }]) {
        assert.equal(conversationShortcutAction(key(overrides)), 'none');
    }
});
