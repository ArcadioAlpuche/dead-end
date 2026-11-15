import type { ConversationResponder } from '../core/conversation.ts';

export const mockResponder: ConversationResponder = {
    async respond(request) {
        if (request.topic === 'accusation') return 'An accusation. I will remember that.';
        if (request.topic === 'account') return 'Here is what I can tell you.';
        if (request.topic === 'room') return 'About the room:';
        if (request.memories.some(event => event.kind === 'accused')) {
            return 'I remember your accusation. Keep your questions specific.';
        }
        return 'I can tell you what I saw last night, or about Room 407. What would you like to ask?';
    },
};
