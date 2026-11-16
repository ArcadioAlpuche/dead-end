import type { SavedGame, WorldDefinition } from './model.ts';
import { parseCaseStates } from './cases.ts';
import { canStand } from './spatial.ts';

export function validateWorld(world: WorldDefinition): void {
    for (const [id, definition] of Object.entries(world.cases)) {
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || id === 'constructor' || id === 'prototype'
            || definition.id !== id || !definition.title.trim() || !definition.client.trim()
            || !definition.offer.trim() || !definition.assignment.trim()) throw new Error(`Invalid case definition: ${id}`);
    }
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
            } else if (target.kind === 'talk' && !Object.prototype.hasOwnProperty.call(world.conversations, target.conversationId)) {
                throw new Error(`Missing conversation: ${target.id}`);
            }
        }
    }
    const npcIds = new Set<string>();
    for (const conversation of Object.values(world.conversations)) {
        if (!conversation.npcId || npcIds.has(conversation.npcId)) throw new Error('Missing or duplicate NPC ID');
        npcIds.add(conversation.npcId);
        for (const line of [conversation.account, conversation.room]) {
            if (line.recordId && !world.records[line.recordId]) throw new Error(`Missing dialogue record: ${line.recordId}`);
        }
    }
}

export function parseSave(value: unknown, world: WorldDefinition): SavedGame | null {
    if (!value || typeof value !== 'object') return null;
    const data = value as Partial<Omit<SavedGame, 'version'>> & { version?: unknown };
    if ((data.version !== 1 && data.version !== 2 && data.version !== 3) || data.contentVersion !== 'bellweather-1' || !data.player || !Array.isArray(data.discoveries)) return null;
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
    // V1 has no NPC memory. Never infer accusations from discoveries or dialogue text.
    const memories = data.version === 1 ? [] : data.npcMemories;
    if (!Array.isArray(memories)) return null;
    const npcIds = new Set(Object.values(world.conversations).map(conversation => conversation.npcId));
    const memoryKeys = new Set<string>();
    for (const event of memories) {
        if (!event || typeof event !== 'object' || event.kind !== 'accused'
            || typeof event.npcId !== 'string' || !npcIds.has(event.npcId)
            || typeof event.locationId !== 'string' || !Object.prototype.hasOwnProperty.call(world.locations, event.locationId)
            || typeof event.recordedAt !== 'number' || !Number.isFinite(event.recordedAt) || event.recordedAt < 0) return null;
        const key = `${event.npcId}:${event.kind}`;
        if (memoryKeys.has(key)) return null;
        memoryKeys.add(key);
    }
    // V1/v2 never contained case acceptance. Do not infer it from existing discoveries or memory.
    const cases = data.version === 3 ? parseCaseStates(data.cases, world.cases) : {};
    if (!cases) return null;
    return { version: 3, cases, contentVersion: 'bellweather-1', player: { locationId: player.locationId, x: player.x, y: player.y, facing: player.facing }, discoveries: data.discoveries.map(d => ({ id: d.id, recordedAt: d.recordedAt })), npcMemories: memories.map(event => ({ kind: event.kind, npcId: event.npcId, locationId: event.locationId, recordedAt: event.recordedAt })) };
}
