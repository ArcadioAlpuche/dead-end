import type { CasebookEntry, CaseDefinition, CaseState } from './model.ts';

// Availability comes from public offers. Missing state never means an accepted assignment.
export function casebookEntries(definitions: Readonly<Record<string, CaseDefinition>>,
    states: Readonly<Record<string, CaseState>>): readonly CasebookEntry[] {
    return Object.values(definitions).map(definition => {
        const state = Object.prototype.hasOwnProperty.call(states, definition.id) ? states[definition.id] : undefined;
        return { id: definition.id, title: definition.title, client: definition.client,
            offer: definition.offer, assignment: definition.assignment,
            status: state?.status ?? 'available', history: state?.history.map(event => ({ ...event })) ?? [] };
    });
}

export function copyCaseStates(states: Readonly<Record<string, CaseState>>): Record<string, CaseState> {
    return Object.fromEntries(Object.entries(states).map(([id, state]) => [id,
        { status: state.status, history: state.history.map(event => ({ ...event })) }]));
}

export function parseCaseStates(value: unknown, definitions: Readonly<Record<string, CaseDefinition>>): Record<string, CaseState> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const result: Record<string, CaseState> = {};
    for (const [id, raw] of Object.entries(value)) {
        if (!Object.prototype.hasOwnProperty.call(definitions, id) || !raw || typeof raw !== 'object') return null;
        const state = raw as Partial<CaseState>;
        if (!Array.isArray(state.history)) return null;
        if (state.status === 'available') {
            if (state.history.length !== 0) return null;
        } else if (state.status === 'active') {
            if (state.history.length !== 1) return null;
            const event = state.history[0];
            if (!event || event.kind !== 'accepted' || typeof event.recordedAt !== 'number'
                || !Number.isFinite(event.recordedAt) || event.recordedAt < 0) return null;
        } else return null;
        result[id] = { status: state.status, history: state.history.map(event => ({ kind: 'accepted', recordedAt: event.recordedAt })) };
    }
    return result;
}
