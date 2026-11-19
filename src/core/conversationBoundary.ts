import type { ActionRequest } from './actions.ts';
import type { ConversationContext, ConversationReferent, ConversationTopic } from './conversation.ts';
import type { ConversationDefinition, KaneFactId } from './model.ts';
import { classifyMessage } from './conversation.ts';

export interface DisclosureRoute {
    readonly phrase: string;
    readonly informationId: string;
    readonly recipientId: string;
}
export type ConversationRoute =
    | { readonly kind: 'ordinary'; readonly topic: ConversationTopic; readonly intent?: 'where-seen-person-went' | 'room-belongings'
        | 'person-about' | 'person-acquaintance' | 'person-sighting' | 'person-departure' | 'person-whereabouts'
        | 'person-clothing' | 'person-face' | 'person-identity' | 'person-identity-inquiry' | 'person-about-context' | 'person-speech'
        | 'place-occupant' | 'place-where' | 'sighting-when' | 'sighting-where' | 'event-next'
        | 'checkout-when' | 'checkout-sure' }
    | { readonly kind: 'player-disclosure'; readonly facts: readonly KaneFactId[] }
    | { readonly kind: 'action'; readonly request: ActionRequest }
    | { readonly kind: 'clarify'; readonly message: string };

const normalize = (text: string) => text.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.!?]$/, '');
// Bounded spelling and informal-grammar aliases for ordinary questions and
// explicit self-introductions. Protected authored actions keep exact matching.
const casualAliases: Readonly<Record<string, string>> = {
    wat: 'what', wats: "what's", whats: "what's", u: 'you', ur: 'your', bout: 'about',
    chek: 'check', investigater: 'investigator', im: "i'm",
};
const normalizeCasual = (text: string) => normalize(text.replace(/[’‘]/g, "'"))
    .replace(/\b(?:wat|wats|whats|u|ur|bout|chek|investigater|im)\b/g, token => casualAliases[token]);
// Explicit, complete self-disclosures only. No partial match can smuggle another fact.
const playerDisclosures = new Map<string, readonly KaneFactId[]>([
    ['thomas kane', ['name']], ['my name is thomas kane', ['name']], ["i'm thomas kane", ['name']],
    ['i am a private investigator', ['occupation']], ["i'm a private investigator", ['occupation']],
    ['i used to be a cop', ['former-police']], ['i was a cop', ['former-police']],
    ['i used to be a police officer', ['former-police']], ['i was a police officer', ['former-police']],
    ['thomas kane. private investigator', ['name', 'occupation']],
]);
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
        'what do you want me to do'],
    introduction: ['what is your name', "what's your name", 'may i have your name', 'could you tell me your name', 'who are you'],
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

// These templates consume the entire utterance. A subject must be an exact
// authored alias in the current NPC profile; extra clauses never match one.
const subjectQuestions = [
    { pattern: /^(?:what do you know about|what can you tell me about|tell me about|you know anything about) (.+)$/, kinds: ['person', 'place', 'object', 'event'], personIntent: 'person-about' },
    { pattern: /^(?:do you know|you know) (.+)$/, kinds: ['person'], personIntent: 'person-acquaintance' },
    { pattern: /^who is (.+)$/, kinds: ['person'], personIntent: 'person-identity-inquiry' },
    { pattern: /^(?:have you seen|you seen|did you see) (.+)$/, kinds: ['person'], personIntent: 'person-sighting' },
    { pattern: /^did (.+) check ?out$/, kinds: ['person'], personIntent: 'person-departure' },
    { pattern: /^where did (.+) go$/, kinds: ['person'], personIntent: 'person-whereabouts' },
    { pattern: /^who stayed in (.+)$/, kinds: ['place'], placeIntent: 'place-occupant' },
    { pattern: /^(?:where is|where can i find|how do i get to) (.+)$/, kinds: ['place', 'object'] },
    { pattern: /^(?:can i see|may i see|can i inspect) (.+)$/, kinds: ['object'] },
    { pattern: /^what did you (?:see|notice|witness) (.+)$/, kinds: ['event'] },
] as const;

function matchSubjectQuestion(text: string, profile: ConversationDefinition): { route: ConversationRoute; subject: ConversationReferent } | null {
    for (const question of subjectQuestions) {
        const subjectText = question.pattern.exec(text)?.[1];
        if (!subjectText) continue;
        const matches = Object.values(profile.topics).flatMap(topic => (topic.recognition ?? [])
            .filter(group => (question.kinds as readonly string[]).includes(group.kind)
                && group.aliases.some(alias => normalizeCasual(alias) === subjectText))
            .map(group => ({ topic, group })));
        if (matches.length !== 1) return null; // Unknown or ambiguous subject: fail closed.
        const match = matches[0];
        const subject: ConversationReferent = { id: match.group.entityId, kind: match.group.kind,
            ...(match.group.kind === 'person' ? { identity: match.group.identity ?? 'named' } : {}) };
        if (match.group.kind === 'person') {
            if (!('personIntent' in question)) return null;
            if (question.personIntent === 'person-about' && match.group.directIntents?.includes('person-about')) {
                return { route: { kind: 'ordinary', topic: match.topic.id as ConversationTopic }, subject };
            }
            return { route: { kind: 'ordinary', topic: match.topic.id as ConversationTopic, intent: question.personIntent }, subject };
        }
        if (match.group.kind === 'place' && 'placeIntent' in question) {
            return { route: { kind: 'ordinary', topic: match.topic.id as ConversationTopic, intent: question.placeIntent }, subject };
        }
        return { route: { kind: 'ordinary', topic: match.topic.id as ConversationTopic }, subject };
    }
    return null;
}

export function questionSubject(text: string, profile: ConversationDefinition): ConversationReferent | null {
    return matchSubjectQuestion(normalizeCasual(text), profile)?.subject ?? null;
}

const contextClarification = (person: boolean): ConversationRoute => ({ kind: 'clarify',
    message: person ? 'Not sent. Who do you mean?' : 'Not sent. Which place do you mean?' });
const topicClarification = (): ConversationRoute => ({ kind: 'clarify', message: 'Not sent. What are you referring to?' });

function resolveReferent(context: ConversationContext, kind: 'person' | 'place'): ConversationReferent | null | 'ambiguous' {
    const replies = context.replyReferents.filter(item => item.kind === kind);
    if (replies.length > 1) return 'ambiguous';
    if (replies.length === 1) return replies[0];
    // A name in Kane's question is not evidence that Arthur's reply identified that person.
    return null;
}

function routeContextualQuestion(text: string, context: ConversationContext): ConversationRoute | null {
    const followUp = (intent: Extract<ConversationRoute, { kind: 'ordinary' }>['intent']): ConversationRoute =>
        ({ kind: 'ordinary', topic: 'follow-up', intent });
    const person = /^(?:what was (?:he|she|they) wearing|did you see (?:his|her|their) face|what about (?:him|her|them)|what did (?:he|she|they) say|do you know where (?:he|she|they|that person) went)$/.test(text);
    if (person) {
        const referent = resolveReferent(context, 'person');
        if (!referent || referent === 'ambiguous') return contextClarification(true);
        if (/^what was/.test(text)) return followUp('person-clothing');
        if (/^did you see/.test(text)) return followUp('person-face');
        if (/^what about/.test(text)) return followUp('person-about-context');
        if (/^what did/.test(text)) return followUp('person-speech');
        return context.focus === 'sighting' ? followUp('where-seen-person-went') : contextClarification(true);
    }
    if (/^(?:who stayed there|did (?:someone|anyone) leave (?:their|any) things in there)$/.test(text)) {
        const referent = resolveReferent(context, 'place');
        if (!referent || referent === 'ambiguous') return contextClarification(false);
        return text.startsWith('who') ? followUp('place-occupant') : followUp('room-belongings');
    }
    if (text === 'when') return context.focus === 'checkout' ? followUp('checkout-when')
        : context.focus === 'sighting' ? followUp('sighting-when') : topicClarification();
    if (text === 'where') return context.focus === 'sighting' ? followUp('sighting-where')
        : context.focus === 'room' ? followUp('place-where') : topicClarification();
    if (text === 'who') {
        const referent = resolveReferent(context, 'person');
        if (referent === 'ambiguous') return contextClarification(true);
        if (referent) return followUp('person-identity');
        const place = resolveReferent(context, 'place');
        return place && place !== 'ambiguous' ? followUp('place-occupant') : contextClarification(true);
    }
    if (text === 'what happened next') return context.focus === 'sighting' ? followUp('event-next') : topicClarification();
    if (text === 'are you sure' && context.focus === 'checkout') return followUp('checkout-sure');
    return null;
}

export function routeConversationInput(text: string, recipientId: string, disclosures: readonly DisclosureRoute[] = [],
    activeTopic: string | null = null, profile?: ConversationDefinition, context?: ConversationContext | null): ConversationRoute {
    const normalized = normalize(text);
    // Trusted authored routes identify information, never extract arbitrary world mutations.
    const matches = disclosures.filter(route => normalize(route.phrase) === normalized);
    if (matches.length) {
        if (matches.length !== 1 || matches[0].recipientId !== recipientId) {
            return { kind: 'clarify', message: 'Not sent. The information or recipient is unclear. Use the explicit action control.' };
        }
        return { kind: 'action', request: { kind: 'disclose-information', informationId: matches[0].informationId, recipientId } };
    }
    const casual = normalizeCasual(text);
    const playerFacts = playerDisclosures.get(casual);
    if (playerFacts) return { kind: 'player-disclosure', facts: playerFacts };
    // Preserve the original narrow accusation memory demonstration (not a case resolution).
    if (classifyMessage(text) === 'accusation') {
        return { kind: 'ordinary', topic: 'accusation' };
    }
    if (context?.npcId === recipientId) {
        const followUp = routeContextualQuestion(casual, context);
        if (followUp) return followUp;
    }
    const topic = ordinary.get(casual);
    if (topic) return { kind: 'ordinary', topic };
    const authoredQuestion = authoredQuestions.find(question => question.pattern.test(casual));
    if (authoredQuestion) return { kind: 'ordinary', topic: authoredQuestion.topic };
    const contextual = contextualQuestions.find(question => question.context === activeTopic && question.pattern.test(casual));
    if (contextual) return { kind: 'ordinary', topic: 'follow-up', intent: contextual.intent };
    if (profile?.npcId === recipientId) {
        const question = matchSubjectQuestion(casual, profile);
        if (question) return question.route;
    }
    // Fail closed, including addresses, paraphrases, mixed messages and unsupported actions.
    // No claim of general natural-language understanding; no raw text reaches NPC context.
    return { kind: 'clarify', message: recipientId === 'receptionist'
        ? 'Not sent. The clerk rests a hand on the register. “Ask me about Room 407 or what I saw last night.”'
        : 'Not sent. Try a direct question about a topic this person can discuss. Use an explicit action to share information.' };
}
