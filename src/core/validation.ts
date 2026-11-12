import type { SavedGame, WorldDefinition } from './model.ts';
import { canStand } from './spatial.ts';

export function validateWorld(world: WorldDefinition): void {
    const ids = new Set<string>();
    for (const location of Object.values(world.locations)) {
        for (const [name, entry] of Object.entries(location.entries)) {
            if (!canStand(location, entry)) throw new Error(`Unsafe entry: ${location.id}/${name}`);
        }
        for (const target of location.interactions) {
            if (ids.has(target.id)) throw new Error(`Duplicate interaction: ${target.id}`);
            ids.add(target.id);
            if (!canStand(location, target)) throw new Error(`Unreachable anchor: ${target.id}`);
            if (target.kind === 'exit') {
                const destination = world.locations[target.destination];
                if (!destination?.entries[target.entry]) throw new Error(`Missing entry: ${target.id}`);
                if (!destination.interactions.some(t => t.kind === 'exit' && t.destination === location.id)) {
                    throw new Error(`Missing return path: ${target.id}`);
                }
            } else if (target.kind === 'examine' && !world.records[target.recordId]) {
                throw new Error(`Missing record: ${target.id}`);
            } else if (target.kind === 'talk' && !world.conversations[target.conversationId]?.length) {
                throw new Error(`Missing conversation: ${target.id}`);
            }
        }
    }
    for (const lines of Object.values(world.conversations)) {
        for (const line of lines) {
            if (line.recordId && !world.records[line.recordId]) throw new Error(`Missing dialogue record: ${line.recordId}`);
        }
    }
}

export function parseSave(value: unknown, world: WorldDefinition): SavedGame | null {
    if (!value || typeof value !== 'object') return null;
    const data = value as Partial<SavedGame>;
    if (data.version !== 1 || data.contentVersion !== 'bellweather-1' || !data.player || !Array.isArray(data.discoveries)) return null;
    const player = data.player;
    if (!Object.prototype.hasOwnProperty.call(world.locations, player.locationId) || (player.facing !== -1 && player.facing !== 1)) return null;
    if (typeof player.x !== 'number' || typeof player.y !== 'number' || !canStand(world.locations[player.locationId], player)) return null;
    const seen = new Set<string>();
    for (const record of data.discoveries) {
        if (!record || typeof record !== 'object' || typeof record.id !== 'string'
            || !Object.prototype.hasOwnProperty.call(world.records, record.id) || seen.has(record.id)
            || typeof record.recordedAt !== 'number' || !Number.isFinite(record.recordedAt) || record.recordedAt < 0) return null;
        seen.add(record.id);
    }
    return { version: 1, contentVersion: 'bellweather-1', player: { locationId: player.locationId, x: player.x, y: player.y, facing: player.facing }, discoveries: data.discoveries.map(d => ({ id: d.id, recordedAt: d.recordedAt })) };
}
