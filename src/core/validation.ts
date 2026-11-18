import type { LocationDefinition, SavedGame, WorldDefinition } from './model.ts';
import { parseCaseStates } from './cases.ts';
import { canStand } from './spatial.ts';

export function validateWorld(world: WorldDefinition): void {
    for (const [id, definition] of Object.entries(world.cases)) {
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || id === 'constructor' || id === 'prototype'
            || definition.id !== id || !definition.title.trim() || !definition.client.trim()
            || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(definition.clientId)
            || !definition.offer.trim() || !definition.assignment.trim()) throw new Error(`Invalid case definition: ${id}`);
    }
    const ids = new Set<string>();
    for (const location of Object.values(world.locations)) {
        const height = location.height ?? 768;
        const bounds = location.walkBounds;
        if (!Number.isFinite(height) || height < 768 || !Number.isFinite(location.width) || location.width < 1024
            || bounds.x < 0 || bounds.y < 0 || bounds.width <= 0 || bounds.height <= 0
            || bounds.x + bounds.width > location.width || bounds.y + bounds.height > height) {
            throw new Error(`Invalid world bounds: ${location.id}`);
        }
        for (const obstacle of location.obstacles) {
            if (obstacle.width <= 0 || obstacle.height <= 0 || obstacle.x < 0 || obstacle.y < 0
                || obstacle.x + obstacle.width > location.width || obstacle.y + obstacle.height > height) {
                throw new Error(`Invalid obstacle: ${location.id}`);
            }
        }
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
        if (!conversation.name.trim() || !Number.isInteger(conversation.patience) || conversation.patience < 1) throw new Error(`Invalid NPC profile: ${conversation.npcId}`);
        for (const [topicId, topic] of Object.entries(conversation.topics)) {
            if (topic.id !== topicId || !topic.line.text.trim() || !topic.followUp.trim()) throw new Error(`Invalid NPC topic: ${topicId}`);
            if (topic.line.recordId && !world.records[topic.line.recordId]) throw new Error(`Missing dialogue record: ${topic.line.recordId}`);
        }
    }
}

export function parseSave(value: unknown, world: WorldDefinition): SavedGame | null {
    if (!value || typeof value !== 'object') return null;
    const data = value as Partial<Omit<SavedGame, 'version' | 'contentVersion'>>
        & { version?: unknown; contentVersion?: unknown };
    if ((data.version !== 1 && data.version !== 2 && data.version !== 3 && data.version !== 4)
        || (data.contentVersion !== 'bellweather-1' && data.contentVersion !== 'bellweather-2' && data.contentVersion !== 'bellweather-3')
        || (data.contentVersion !== 'bellweather-1' && data.version !== 4)
        || !data.player || !Array.isArray(data.discoveries)) return null;
    const player = data.player;
    if (!Object.prototype.hasOwnProperty.call(world.locations, player.locationId) || (player.facing !== -1 && player.facing !== 1)) return null;
    if (typeof player.x !== 'number' || typeof player.y !== 'number') return null;
    // Historical content revision: validate an old lobby position against its original
    // furniture before moving only positions that the illustrated layout now blocks.
    const oldLobby: Pick<LocationDefinition, 'walkBounds' | 'obstacles'> = {
        walkBounds: { x: 30, y: 500, width: 1260, height: 165 },
        obstacles: [{ x: 560, y: 500, width: 220, height: 45 }],
    };
    const previousLobby: Pick<LocationDefinition, 'walkBounds' | 'obstacles'> = {
        walkBounds: { x: 30, y: 530, width: 1260, height: 238 },
        obstacles: [
            { x: 320, y: 495, width: 32, height: 70 },
            { x: 440, y: 530, width: 580, height: 60 },
            { x: 1025, y: 495, width: 32, height: 70 },
            { x: 1050, y: 530, width: 250, height: 40 },
        ],
    };
    const oldLobbySave = data.contentVersion === 'bellweather-1' && player.locationId === 'lobby';
    const previousLobbySave = data.contentVersion === 'bellweather-2' && player.locationId === 'lobby';
    if (!canStand(oldLobbySave ? oldLobby : previousLobbySave ? previousLobby : world.locations[player.locationId], player)) return null;
    const safePlayer = (oldLobbySave || previousLobbySave) && !canStand(world.locations.lobby, player)
        ? { ...player, x: world.locations.lobby.entries.arrival.x,
            y: world.locations.lobby.entries.arrival.y }
        : player;
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
    const profiles = new Map(Object.values(world.conversations).map(conversation => [conversation.npcId, conversation]));
    const memoryKeys = new Set<string>();
    for (const event of memories) {
        if (!event || typeof event !== 'object' || !['accused', 'topic', 'statement', 'friction'].includes(event.kind)
            || (data.version !== 4 && event.kind !== 'accused')
            || typeof event.npcId !== 'string' || !profiles.has(event.npcId)
            || typeof event.locationId !== 'string' || !Object.prototype.hasOwnProperty.call(world.locations, event.locationId)
            || typeof event.recordedAt !== 'number' || !Number.isFinite(event.recordedAt) || event.recordedAt < 0) return null;
        const profile = profiles.get(event.npcId)!;
        if (event.kind === 'topic' && (typeof event.topicId !== 'string' || !Object.prototype.hasOwnProperty.call(profile.topics, event.topicId))) return null;
        if (event.kind === 'statement' && (typeof event.statementId !== 'string'
            || !Object.prototype.hasOwnProperty.call(profile.topics, event.statementId.slice(event.npcId.length + 1))
            || !event.statementId.startsWith(`${event.npcId}:`))) return null;
        if (event.kind === 'friction' && (!Number.isInteger(event.count) || event.count < 0 || event.count > profile.patience + 2)) return null;
        const key = `${event.npcId}:${event.kind}:${event.kind === 'topic' ? event.topicId : event.kind === 'statement' ? event.statementId : ''}`;
        if (memoryKeys.has(key)) return null;
        memoryKeys.add(key);
    }
    // V1/v2 never contained case acceptance. Do not infer it from existing discoveries or memory.
    const cases = data.version === 3 || data.version === 4 ? parseCaseStates(data.cases, world.cases) : {};
    if (!cases) return null;
    return { version: 4, cases, contentVersion: 'bellweather-3', player: { locationId: safePlayer.locationId, x: safePlayer.x, y: safePlayer.y, facing: safePlayer.facing }, discoveries: data.discoveries.map(d => ({ id: d.id, recordedAt: d.recordedAt })), npcMemories: memories.map(event => ({ ...event })) };
}
