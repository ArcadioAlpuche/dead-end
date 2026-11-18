import test from 'node:test';
import assert from 'node:assert/strict';
import { hotel } from '../src/content/hotel.ts';
import { GameSession } from '../src/core/session.ts';
import { interactionMarkerPoint } from '../src/game/adapters/interactionMarker.ts';

test('Arthur marker stays at the counter while Kane approaches, circles and leaves', () => {
    const session = new GameSession(hotel);
    const move = (x, y) => { assert.ok(session.moveTo({ x, y, facing: 1 })); return session.getSnapshot().nearby; };
    assert.equal(interactionMarkerPoint('lobby', move(730, 755)), null);
    for (const point of [{ x: 730, y: 730 }, { x: 680, y: 660 }, { x: 780, y: 660 }, { x: 730, y: 603 }]) {
        assert.equal(move(point.x, point.y)?.id, 'receptionist');
        assert.deepEqual(interactionMarkerPoint('lobby', session.getSnapshot().nearby), { x: 730, y: 615 });
    }
    assert.equal(interactionMarkerPoint('lobby', move(830, 660)), null);
    assert.deepEqual([hotel.locations.lobby.interactions.find(item => item.id === 'receptionist').x,
        hotel.locations.lobby.interactions.find(item => item.id === 'receptionist').y], [730, 660],
    'the gameplay anchor stays unchanged');
});

test('other interactions retain their authored anchors and no target yields no marker', () => {
    const street = hotel.locations.lobby.interactions.find(item => item.id === 'lobby-town');
    assert.deepEqual(interactionMarkerPoint('lobby', street), { x: street.x, y: street.y });
    assert.equal(interactionMarkerPoint('lobby', null), null);
});
