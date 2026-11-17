import type { Rect } from '../../core/model.ts';

// Preview-only footprint of the painted counter body. Props above y=530 are visual.
// The playable lobby keeps its authored collision and save layout.
export const LOBBY_PREVIEW_WALK_BOUNDS: Rect = { x: 30, y: 530, width: 1260, height: 238 };
export const LOBBY_PREVIEW_DESK: Rect = { x: 440, y: 530, width: 580, height: 60 };
