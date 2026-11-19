import type { ConversationResponder } from '../core/conversation.ts';

export const mockResponder: ConversationResponder = {
    async respond(request) {
        if (request.topic === 'accusation') return 'An accusation. I will remember that.';
        if (request.topic === 'account') return 'Here is what I can tell you.';
        if (request.topic === 'room') return 'About the room:';
        if (request.topic === 'register') return 'About the register:';
        if (request.topic === 'assignment') return 'About the assignment:';
        if (request.topic === 'follow-up') return 'Let me put it another way.';
        if (request.memories.some(event => event.kind === 'accused')) {
            return 'I remember your accusation. Keep your questions specific.';
        }
        if (request.npcId === 'thomas-bell') return 'Ask me about my work or the hotel.';
        if (request.npcId === 'evelyn-mercer') return 'You may ask about my assignment or Daniel.';
        return 'I can tell you what I saw last night, or about Room 407. What would you like to ask?';
    },
};
