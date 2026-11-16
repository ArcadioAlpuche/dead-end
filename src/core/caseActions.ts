import type { ActionPolicy } from './actions.ts';
import type { SavedGame, WorldDefinition } from './model.ts';

export interface CaseActionContext {
    readonly saved: SavedGame;
    readonly offerId: string | null;
    readonly notebookOpen: boolean;
    readonly inConversation: boolean;
}

export function caseActionPolicy(world: WorldDefinition): ActionPolicy<CaseActionContext> {
    return {
        review(context, request) {
            // No disclosure handlers/content are enabled in the playable M2 build.
            if (request.kind !== 'accept-assignment') return { ok: false, reason: 'That action is not available in this version.' };
            const definition = Object.prototype.hasOwnProperty.call(world.cases, request.caseId) ? world.cases[request.caseId] : undefined;
            if (!definition || request.recipientId !== definition.clientId) return { ok: false, reason: 'The assignment or recipient does not match.' };
            if (!context.notebookOpen || context.inConversation || context.offerId !== definition.id) {
                return { ok: false, reason: 'Open the assignment request before accepting it.' };
            }
            if (context.saved.cases[definition.id]?.status === 'active') return { ok: false, reason: 'This assignment is already active.' };
            return { ok: true, preview: {
                title: 'Accept assignment', recipient: { id: definition.clientId, name: definition.client },
                commitment: `Accept ${definition.client}’s assignment: ${definition.assignment}`,
            } };
        },
        reduce(context, request, recordedAt) {
            if (request.kind !== 'accept-assignment') throw new Error('Unsupported action');
            return { ...context, saved: { ...context.saved, cases: { ...context.saved.cases,
                [request.caseId]: { status: 'active', history: [{ kind: 'accepted', recordedAt }] },
            } } };
        },
    };
}
