import type { CaseDefinition } from '../core/model.ts';

// Public client request only. Hidden chapter facts are not part of this content contract.
export const cases: Readonly<Record<string, CaseDefinition>> = {
    'case-001': {
        id: 'case-001',
        title: 'Case 001 — The Guest in Room 407',
        clientId: 'evelyn-mercer',
        client: 'Evelyn Mercer',
        offer: 'My brother, Daniel Mercer, was staying in Room 407 at the Bellweather Hotel. He sounded frightened when he contacted me. Now he has disappeared. Will you find him and let me know where he is?',
        assignment: 'Locate Daniel Mercer and report his whereabouts to Evelyn Mercer.',
    },
};
