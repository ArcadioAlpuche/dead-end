import type { ActionRequest } from './actions.ts';
import type { ConversationTopic } from './conversation.ts';
import { classifyMessage } from './conversation.ts';

export interface DisclosureRoute {
    readonly phrase: string;
    readonly informationId: string;
    readonly recipientId: string;
}
export type ConversationRoute =
    | { readonly kind: 'ordinary'; readonly topic: ConversationTopic }
    | { readonly kind: 'action'; readonly request: ActionRequest }
    | { readonly kind: 'clarify'; readonly message: string };

const normalize = (text: string) => text.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.!?]$/, '');
// Whole-message matches only. Adding a harmless prefix never makes appended facts safe.
const ordinary = new Map<string, ConversationTopic>([
    ['hello', 'general'], ['hello again', 'general'], ['good evening', 'general'], ['thank you', 'general'],
    ['what did you see last night', 'account'], ['what did you see', 'account'],
    ['tell me about last night', 'account'], ['what happened around midnight', 'account'],
    ['tell me about room 407', 'room'], ['what about room 407', 'room'],
    ['where is room 407', 'room'], ['where are the stairs', 'room'],
]);

export function routeConversationInput(text: string, recipientId: string, disclosures: readonly DisclosureRoute[] = []): ConversationRoute {
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
    // Fail closed, including addresses, paraphrases, mixed messages and unsupported actions.
    // No claim of general natural-language understanding; no raw text reaches NPC context.
    return { kind: 'clarify', message: 'Not sent. I cannot safely interpret that message in this prototype. Try “What did you see last night?” or “Tell me about Room 407.” Use the casebook to accept assignments. Reporting information is not available yet.' };
}
