import type { Rect } from '../../core/model.ts';

// The preview retains independent desk-only movement; the playable lobby now uses
// the same painted desk footprint plus its authored posts and staircase base.
export const LOBBY_PREVIEW_WALK_BOUNDS: Rect = { x: 30, y: 530, width: 1260, height: 238 };
export const LOBBY_PREVIEW_DESK: Rect = { x: 440, y: 530, width: 580, height: 60 };
