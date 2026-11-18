import type { Interaction, LocationId, Point } from '../../core/model.ts';

// Visual anchors may differ from the interaction's gameplay coordinate.
// The desk prevents a marker at Arthur's position; its approach is just beyond the counter.
const visualAnchors: Readonly<Record<string, Point>> = {
    receptionist: { x: 730, y: 615 },
};

export function interactionMarkerPoint(locationId: LocationId, nearby: Interaction | null): Point | null {
    if (!nearby) return null;
    return locationId === 'lobby' && visualAnchors[nearby.id]
        ? visualAnchors[nearby.id]
        : { x: nearby.x, y: nearby.y };
}
