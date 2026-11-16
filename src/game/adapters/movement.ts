import type { Entry, LocationDefinition } from '../../core/model.ts';
import { canStand } from '../../core/spatial.ts';

export interface Motion { vx: number; vy: number }
export interface MovementConfig { readonly speedX: number; readonly speedY: number; readonly acceleration: number }
export const INTERIOR_MOVEMENT: MovementConfig = { speedX: 235, speedY: 145, acceleration: 18 };
export const OVERWORLD_MOVEMENT: MovementConfig = { speedX: 205, speedY: 180, acceleration: 14 };

// Small substeps prevent tunnelling through furniture when a browser frame is delayed.
export function stepMovement(location: LocationDefinition, position: Entry, motion: Motion, axisX: number, axisY: number, elapsed: number, config: MovementConfig = INTERIOR_MOVEMENT): Entry {
    const dt = Math.min(Math.max(elapsed, 0), 0.05);
    const magnitude = Math.hypot(axisX, axisY) || 1;
    const targetX = axisX / magnitude * config.speedX;
    const targetY = axisY / magnitude * config.speedY;
    const blend = 1 - Math.exp(-config.acceleration * dt);
    motion.vx += (targetX - motion.vx) * blend;
    motion.vy += (targetY - motion.vy) * blend;
    if (!axisX && Math.abs(motion.vx) < 0.5) motion.vx = 0;
    if (!axisY && Math.abs(motion.vy) < 0.5) motion.vy = 0;
    let { x, y } = position;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(motion.vx * dt), Math.abs(motion.vy * dt)) / 4));
    for (let step = 0; step < steps; step++) {
        const nextX = x + motion.vx * dt / steps;
        if (canStand(location, { x: nextX, y })) x = nextX;
        else motion.vx = 0;
        const nextY = y + motion.vy * dt / steps;
        if (canStand(location, { x, y: nextY })) y = nextY;
        else motion.vy = 0;
    }
    return { x, y, facing: axisX ? (axisX < 0 ? -1 : 1) : position.facing };
}
