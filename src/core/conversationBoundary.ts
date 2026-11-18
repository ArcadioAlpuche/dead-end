import type { ActionRequest } from './actions.ts';
import type { ConversationTopic } from './conversation.ts';
import { classifyMessage } from './conversation.ts';

export interface DisclosureRoute {
    readonly phrase: string;
    readonly informationId: string;
    readonly recipientId: string;
}
export type ConversationRoute =
    | { readonly kind: 'ordinary'; readonly topic: ConversationTopic; readonly intent?: 'where-seen-person-went' | 'room-belongings' }
    | { readonly kind: 'action'; readonly request: ActionRequest }
    | { readonly kind: 'clarify'; readonly message: string };

const normalize = (text: string) => text.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.!?]$/, '');
// Whole utterances in a small authored grammar. No substring match can authorize
// an appended address, name, disclosure, request or second clause.
const ordinary = new Map<string, ConversationTopic>();
for (const [topic, phrases] of Object.entries({
    general: ['hello', 'hello again', 'good evening', 'thank you', 'thanks', 'good morning'],
    account: ['what did you see last night', 'what did you see', 'tell me about last night', 'what can you tell me about last night',
        'what happened around midnight', 'did you see anyone last night', 'did anyone come down last night',
        'who came downstairs around midnight', 'what did you notice last night'],
    room: ['tell me about room 407', 'what can you tell me about room 407', 'what about room 407', 'where is room 407', 'where are the stairs',
        'how do i get to room 407', 'is room 407 open', 'can i inspect room 407', 'which floor is room 407'],
    assignment: ['tell me about the assignment', 'why do you need a detective', 'who are you looking for',
        'tell me about daniel', 'what do you want me to do'],
    rapport: ['how are you', 'how is your day', 'how long have you worked here', 'do you like working here'],
    'small-talk': ['how is the weather', 'what do you think of the weather', 'is it raining',
        'how is the coffee', 'do you like coffee'],
    irrelevant: ['what is two plus two', 'what is the price of fish', 'can you juggle', 'what is your favorite color'],
    'follow-up': ['what do you mean', 'can you be more specific', 'are you sure', 'how do you know',
        'what happened next', 'can you explain that'],
} as Record<ConversationTopic, string[]>)) {
    for (const phrase of phrases) ordinary.set(phrase, topic as ConversationTopic);
}

// Full-question patterns recognize modest wording variation without matching appended
// statements, names, locations or disclosures. Pronouns require an active authored topic.
const authoredQuestions: readonly { pattern: RegExp; topic: ConversationTopic }[] = [
    { pattern: /^did you (?:see|notice) (?:anything unusual|anything strange|something unusual|something strange) (?:last night|around midnight)$/, topic: 'account' },
    { pattern: /^was there anything (?:unusual|strange) (?:last night|around midnight)$/, topic: 'account' },
    { pattern: /^(?:what can you tell me|what do you know) about (?:room )?407$/, topic: 'room' },
];
const contextualQuestions = [
    { pattern: /^do you know where (?:he|she|they|that person) went$/, context: 'account', intent: 'where-seen-person-went' },
    { pattern: /^did (?:someone|anyone) leave (?:their|any) things in there$/, context: 'room', intent: 'room-belongings' },
] as const;

export function routeConversationInput(text: string, recipientId: string, disclosures: readonly DisclosureRoute[] = [], activeTopic: string | null = null): ConversationRoute {
    const normalized = normalize(text);
    // Trusted authored routes identify information, never extract arbitrary world mutations.
    const matches = disclosures.filter(route => normalize(route.phrase) === normalized);
    if (matches.length) {
        if (matches.length !== 1 || matches[0].recipientId !== recipientId) {
            return { kind: 'clarify', message: 'Not sent. The information or recipient is unclear. Use the explicit action control.' };
        }
        return { kind: 'action', request: { kind: 'disclose-information', informationId: matches[0].informationId, recipientId } };
    }
    // Preserve the original narrow accusation memory demonstration (not a case resolution).
    if (classifyMessage(text) === 'accusation') {
        return { kind: 'ordinary', topic: 'accusation' };
    }
    const topic = ordinary.get(normalized);
    if (topic) return { kind: 'ordinary', topic };
    const authoredQuestion = authoredQuestions.find(question => question.pattern.test(normalized));
    if (authoredQuestion) return { kind: 'ordinary', topic: authoredQuestion.topic };
    const contextual = contextualQuestions.find(question => question.context === activeTopic && question.pattern.test(normalized));
    if (contextual) return { kind: 'ordinary', topic: 'follow-up', intent: contextual.intent };
    // Fail closed, including addresses, paraphrases, mixed messages and unsupported actions.
    // No claim of general natural-language understanding; no raw text reaches NPC context.
    return { kind: 'clarify', message: recipientId === 'receptionist'
        ? 'Not sent. Arthur rests a hand on the register. “Ask me about Room 407 or what I saw last night, Mr. Kane.”'
        : 'Not sent. Try a direct question about a topic this person can discuss. Use an explicit action to share information.' };
}
