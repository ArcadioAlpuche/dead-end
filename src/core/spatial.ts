import type { LocationDefinition, Point } from './model.ts';

// Collision is measured around the detective's feet, not the tall drawn silhouette.
export const FOOT_RADIUS = 13;
export const INTERACTION_RADIUS = 86;

export function canStand(location: LocationDefinition, point: Point): boolean {
    const b = location.walkBounds;
    const r = FOOT_RADIUS;
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)
        || point.x < b.x + r || point.x > b.x + b.width - r
        || point.y < b.y + r || point.y > b.y + b.height - r) return false;
    return !location.obstacles.some(o => point.x > o.x - r && point.x < o.x + o.width + r
        && point.y > o.y - r && point.y < o.y + o.height + r);
}

export const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);
