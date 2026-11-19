import type { ConversationDefinition, NpcIdentityKnowledge } from './model.ts';

export function npcDisplayName(profile: ConversationDefinition, knowledge?: NpcIdentityKnowledge): string {
    return knowledge?.status === 'established' ? profile.name : profile.unknownLabel;
}

export function establishNpcIdentity(identities: Readonly<Record<string, NpcIdentityKnowledge>>,
    npcId: string, recordedAt: number): Readonly<Record<string, NpcIdentityKnowledge>> {
    if (identities[npcId]?.status === 'established') return identities;
    return { ...identities, [npcId]: { status: 'established', recordedAt } };
}
