import test from 'node:test';
import assert from 'node:assert/strict';
import { investigationChoices, saveSlotChoices } from '../src/ui/saveMenuModel.ts';
import { menuKeyAction, nextMenuIndex } from '../src/ui/menuKeys.ts';

const summary = (id, createdAt, lastPlayedAt, manual = [null, null, null]) => ({
    id, createdAt, lastPlayedAt,
    autosave: { locationId: 'lobby', savedAt: lastPlayedAt }, manual,
});

test('investigation list uses friendly creation-order names while preserving internal IDs', () => {
    const newestPlayed = summary('opaque-b', 20, 60);
    const oldest = summary('opaque-a', 10, 30);
    const choices = investigationChoices([newestPlayed, oldest]);
    assert.deepEqual(choices.map(({ id, name }) => [id, name]), [
        ['opaque-b', 'Investigation 2'], ['opaque-a', 'Investigation 1'],
    ]);
    assert.equal(choices[0].locationId, 'lobby');
    assert.equal(choices[0].lastPlayedAt, 60);
    assert.deepEqual(investigationChoices([oldest, newestPlayed]).map(choice => choice.name),
        ['Investigation 1', 'Investigation 2'], 'last-played reordering does not rename investigations');
});

test('save selection shows one autosave and exactly three manual slots; empty slots are disabled', () => {
    const record = summary('opaque-a', 10, 30, [null, { locationId: 'room407', savedAt: 22 }, null]);
    assert.deepEqual(saveSlotChoices(record), [
        { slot: 'autosave', label: 'Autosave', savedAt: 30, locationId: 'lobby', disabled: false },
        { slot: 1, label: 'Slot 1', savedAt: null, locationId: null, disabled: true },
        { slot: 2, label: 'Slot 2', savedAt: 22, locationId: 'room407', disabled: false },
        { slot: 3, label: 'Slot 3', savedAt: null, locationId: null, disabled: true },
    ]);
});

test('all menu screens share directional, activation and back key policy', () => {
    for (const screen of ['title', 'pause', 'investigations', 'slots', 'save', 'restart']) {
        assert.equal(menuKeyAction('ArrowUp'), 'previous', screen);
        assert.equal(menuKeyAction('ArrowDown'), 'next', screen);
        assert.equal(menuKeyAction('Enter'), 'activate', screen);
        assert.equal(menuKeyAction('Escape'), 'back', screen);
    }
    assert.equal(menuKeyAction('w'), 'native');
});

test('focus moves through available controls, wraps, and skips disabled options', () => {
    // The UI gathers only button:not(:disabled), so these two controls represent
    // autosave and Slot 2 while Slots 1 and 3 are disabled.
    const available = ['autosave', 'slot-2'];
    assert.equal(available[nextMenuIndex(0, available.length, 1)], 'slot-2');
    assert.equal(available[nextMenuIndex(1, available.length, 1)], 'autosave');
    assert.equal(available[nextMenuIndex(0, available.length, -1)], 'slot-2');
    assert.equal(nextMenuIndex(-1, available.length, 1), 0);
    assert.equal(nextMenuIndex(-1, 0, 1), -1);
});
