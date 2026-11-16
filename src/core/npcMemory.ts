import type { LocationId, NpcMemoryEvent } from './model.ts';

export function rememberOnce(events: readonly NpcMemoryEvent[], event: NpcMemoryEvent): readonly NpcMemoryEvent[] {
    const subject = (item: NpcMemoryEvent) => item.kind === 'topic' ? item.topicId
        : item.kind === 'statement' ? item.statementId : '';
    const existing = events.find(item => item.npcId === event.npcId && item.kind === event.kind && subject(item) === subject(event));
    if (!existing) return [...events, event];
    // Revisiting a topic makes it the follow-up referent without duplicating the
    // durable event or changing its original timestamp.
    return event.kind === 'topic'
        ? [...events.filter(item => item !== existing), existing]
        : events;
}

export function lastDiscussedTopic(events: readonly NpcMemoryEvent[], npcId: string): string | null {
    const topic = [...events].reverse().find(event => event.npcId === npcId && event.kind === 'topic');
    return topic?.kind === 'topic' ? topic.topicId : null;
}

export function frictionCount(events: readonly NpcMemoryEvent[], npcId: string): number {
    const event = events.find(item => item.npcId === npcId && item.kind === 'friction');
    return event?.kind === 'friction' ? event.count : 0;
}

export function setFriction(events: readonly NpcMemoryEvent[], npcId: string, locationId: LocationId, count: number, recordedAt: number): readonly NpcMemoryEvent[] {
    const without = events.filter(item => item.npcId !== npcId || item.kind !== 'friction');
    return [...without, { kind: 'friction', npcId, locationId, count, recordedAt }];
}
