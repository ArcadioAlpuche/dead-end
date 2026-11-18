import type { Conversation, DialogueLine, LocationId } from '../core/model.ts';

interface ConversationScene {
    readonly label: string;
    readonly layers: readonly string[];
}

const lobbyArt = '/assets/locations/bellweather/lobby/production/';

const scenes: Partial<Record<LocationId, ConversationScene>> = {
    lobby: {
        label: 'The Bellweather Hotel',
        layers: [
            `${lobbyArt}exterior-door.png`,
            `${lobbyArt}exterior-window.png`,
            `${lobbyArt}architecture.png`,
            `${lobbyArt}floor.png`,
            `${lobbyArt}desk.png`,
        ],
    },
};

export const KANE_CONVERSATION_PORTRAIT = '/assets/characters/conversation/kane-portrait-v1.png';

const npcPortraits: Readonly<Record<string, string>> = {
    reception: '/assets/characters/conversation/arthur-portrait-v1.png',
};
const npcRoles: Readonly<Record<string, string>> = { reception: 'Hotel clerk' };

export function conversationScene(locationId: LocationId): ConversationScene | null {
    return scenes[locationId] ?? null;
}

export function npcConversationPortrait(conversationId: string): string | null {
    return npcPortraits[conversationId] ?? null;
}

export function npcConversationRole(conversationId: string): string | null {
    return npcRoles[conversationId] ?? null;
}

export interface LatestExchange {
    readonly question: DialogueLine | null;
    readonly response: DialogueLine | null;
}

export function latestExchange(conversation: Pick<Conversation, 'history' | 'pending'>): LatestExchange {
    const lines = conversation.history;
    let questionIndex = -1;
    for (let index = lines.length - 1; index >= 0; index--) {
        if (lines[index].speaker === 'Detective') { questionIndex = index; break; }
    }
    if (questionIndex < 0) return { question: null, response: lines[lines.length - 1] ?? null };
    let response: DialogueLine | null = null;
    if (!conversation.pending) {
        for (let index = lines.length - 1; index > questionIndex; index--) {
            if (lines[index].speaker !== 'Detective') { response = lines[index]; break; }
        }
    }
    return { question: lines[questionIndex], response };
}
