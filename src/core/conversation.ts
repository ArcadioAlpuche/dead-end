import type { DialogueLine, NpcMemoryEvent } from './model.ts';

export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_HISTORY_LINES = 80;
export type ConversationTopic = 'accusation' | 'account' | 'room' | 'register' | 'assignment' | 'introduction' | 'general' | 'rapport' | 'small-talk' | 'irrelevant' | 'follow-up';

// Ephemeral interpretation only. A mentioned name or questioned event is not
// established world knowledge, NPC memory, or a saved conversation transcript.
export interface ConversationReferent {
    readonly id: string;
    readonly kind: 'person' | 'place' | 'object' | 'event';
    readonly identity?: 'named' | 'unknown' | 'questioned';
}
export interface ConversationContext {
    readonly npcId: string;
    readonly topicId: string;
    readonly questionSubject?: ConversationReferent;
    readonly replyReferents: readonly ConversationReferent[];
    readonly focus?: 'sighting' | 'checkout' | 'room' | 'assignment';
    readonly statementId?: string;
}

// Deliberately exact: questions, quotations, negation, and criticism are not accusations.
export function classifyMessage(text: string): ConversationTopic {
    const normalized = text.trim().toLowerCase().replace(/\s+/g, ' ');
    if (/^i accuse (you|the receptionist)[.!]?$/.test(normalized)) return 'accusation';
    if (/\b(last night|midnight|what did you see)\b/.test(normalized)) return 'account';
    if (/\b(407|room|stairs|fourth floor)\b/.test(normalized)) return 'room';
    return 'general';
}

export interface ConversationRequest {
    readonly npcId: string;
    readonly text: string;
    readonly topic: ConversationTopic;
    readonly history: readonly DialogueLine[];
    readonly memories: readonly NpcMemoryEvent[];
}
// Presentation only: no record IDs, effects, session reference, or hidden case truth.
// Async so a future server adapter can implement this boundary without UI changes.
export interface ConversationResponder {
    respond(request: ConversationRequest): Promise<string>;
}
