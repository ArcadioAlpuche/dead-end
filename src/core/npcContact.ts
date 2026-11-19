import type { ConversationDefinition, KaneFactId, NpcContactState } from './model.ts';

export const KANE_FACT_IDS: readonly KaneFactId[] = ['name', 'occupation', 'former-police'];

export type KaneFactKnowledge =
    | { readonly source: 'prior-relationship'; readonly status: 'established' }
    | { readonly source: 'told-by-kane'; readonly status: 'claimed'; readonly recordedAt: number };

export function registerEncounter(contacts: Readonly<Record<string, NpcContactState>>, npcId: string, at: number): Readonly<Record<string, NpcContactState>> {
    if (contacts[npcId]) return contacts;
    return { ...contacts, [npcId]: { encounteredAt: at, disclosures: {} } };
}

export function recordPlayerDisclosure(contacts: Readonly<Record<string, NpcContactState>>, npcId: string,
    factId: KaneFactId, at: number): Readonly<Record<string, NpcContactState>> {
    const contact = contacts[npcId];
    if (!contact || !KANE_FACT_IDS.includes(factId) || contact.disclosures[factId] !== undefined) return contacts;
    return { ...contacts, [npcId]: { ...contact, disclosures: { ...contact.disclosures,
        [factId]: Math.max(at, contact.encounteredAt) } } };
}

export function kaneFactKnowledge(profile: ConversationDefinition, contact: NpcContactState | undefined,
    factId: KaneFactId): KaneFactKnowledge | null {
    if (profile.priorKaneKnowledge?.includes(factId)) return { source: 'prior-relationship', status: 'established' };
    const recordedAt = contact?.disclosures[factId];
    return recordedAt === undefined ? null : { source: 'told-by-kane', status: 'claimed', recordedAt };
}
