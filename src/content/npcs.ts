import type { ConversationDefinition } from '../core/model.ts';

// These are public, attributed statements. A stance describes the speaker's basis,
// not an omniscient verdict. Proposed Chapter 1 secrets are deliberately absent.
export const npcConversations: Readonly<Record<string, ConversationDefinition>> = {
    reception: {
        npcId: 'receptionist', name: 'Arthur Finch', personality: 'An anxious, mild-mannered desk clerk.', patience: 3,
        greeting: 'Welcome to the Bellweather. The clock runs slow. The bill does not.',
        rememberedAccusationGreeting: 'I remember your accusation. What would you like to ask?',
        warning: 'Mr. Kane, I have a desk to keep. Could we stay with the hotel?',
        disengaged: 'Arthur turns back to the register. He has had enough of this line of questioning.',
        silent: 'Arthur straightens a stack of forms without answering.',
        reengaged: 'Arthur looks up from the register. “All right. Ask me.”',
        accusationReply: 'I heard you. An accusation is not an answer, Mr. Kane.',
        rapport: 'Arthur adjusts his cuffs. “The desk keeps me busy. I prefer the quiet hours.”',
        smallTalk: '“The weather? It makes the front door stick. Coffee helps.”',
        irrelevant: '“I cannot help you with that. Ask me about the hotel.”',
        topics: {
            account: { id: 'account', stance: 'observed',
                line: { speaker: 'Arthur Finch', text: 'Someone came down from upstairs around midnight, carrying a coat. I couldn’t tell you which room. That’s all I saw.', recordId: 'receptionist-account' },
                followUp: '“I saw a coat and someone coming down. I did not see a face or which room they left.”' },
            room: { id: 'room', stance: 'procedure',
                line: { speaker: 'Arthur Finch', text: '407 is vacant and unlocked for inspection. Fourth floor, three flights up. Please leave everything where you find it.' },
                followUp: '“The stairs are through that door. Three flights up, then look for 407.”' },
        },
    },
    porter: {
        npcId: 'thomas-bell', name: 'Thomas Bell', personality: 'A guarded, experienced porter.', patience: 2,
        greeting: 'Bell. I carry bags, not rumors.', rememberedAccusationGreeting: 'You made your accusation. Keep it to something I can answer.',
        warning: 'Ask about the hotel, or let me work.', disengaged: 'Thomas turns away to sort the luggage tags.',
        silent: 'Thomas folds his arms and says nothing.', reengaged: 'Thomas pauses. “Go on.”',
        accusationReply: 'You can accuse me all day. It will not make me confess to your guess.',
        rapport: '“I have worked hotels long enough to know when to mind my business.”',
        smallTalk: '“Weather changes. Bags do not carry themselves.”', irrelevant: '“That has nothing to do with my work.”',
        topics: {
            account: { id: 'account', stance: 'evasion',
                line: { speaker: 'Thomas Bell', text: 'I was working. I did not keep an account of every guest who crossed the lobby.' },
                followUp: '“I said I was working. I will not invent a sighting for you.”' },
            room: { id: 'room', stance: 'procedure',
                line: { speaker: 'Thomas Bell', text: 'Room 407 is on the fourth floor. The front desk handles access.' },
                followUp: '“Ask the desk about access. I do not hand out keys.”' },
        },
    },
    client: {
        npcId: 'evelyn-mercer', name: 'Evelyn Mercer', personality: 'Controlled, persuasive and professionally courteous.', patience: 4,
        greeting: 'Mr. Kane. I hope you will consider my request.', rememberedAccusationGreeting: 'I remember what you said. I would still prefer to speak plainly.',
        warning: 'I would rather spend our time on the assignment.', disengaged: 'Evelyn closes her notebook and waits.',
        silent: 'Evelyn offers a polite, unreadable look.', reengaged: 'Evelyn opens her notebook. “Yes?”',
        accusationReply: 'That is a serious claim. I cannot answer an allegation without particulars.',
        rapport: '“I keep my private life private, Mr. Kane. I hope you understand.”',
        smallTalk: '“The weather has been rather unkind to this city.”', irrelevant: '“I cannot see how that helps us.”',
        topics: {
            assignment: { id: 'assignment', stance: 'claim',
                line: { speaker: 'Evelyn Mercer', text: 'Daniel is my brother. I am worried about him, and I would like your help finding him.' },
                followUp: '“I am asking you to look for Daniel. I can give you no certainty about where he is.”' },
        },
    },
};
