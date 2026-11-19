import type { InvestigationSummary, Slot } from '../persistence/investigations.ts';

export function investigationChoices(records: readonly InvestigationSummary[]) {
    const creationOrder = [...records].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
    const numbers = new Map(creationOrder.map((record, index) => [record.id, index + 1]));
    return records.map(record => ({
        id: record.id,
        name: `Investigation ${numbers.get(record.id)}`,
        lastPlayedAt: record.lastPlayedAt,
        locationId: record.autosave.locationId,
    }));
}

export function saveSlotChoices(record: InvestigationSummary) {
    const slots: readonly Slot[] = ['autosave', 1, 2, 3];
    return slots.map(slot => {
        const saved = slot === 'autosave' ? record.autosave : record.manual[slot - 1];
        return { slot, label: slot === 'autosave' ? 'Autosave' : `Slot ${slot}`,
            savedAt: saved?.savedAt ?? null, locationId: saved?.locationId ?? null, disabled: !saved };
    });
}
