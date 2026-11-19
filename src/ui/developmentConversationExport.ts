import type { DialogueLine } from '../core/model.ts';

// Diagnostics for one open conversation only. Neither these entries nor the
// original-input map are written to game state or schema v6 saves.
export interface RejectedConversationInput {
    readonly text: string;
    readonly message: string;
    readonly at: string;
}

export function recordRejectedInput(entries: readonly RejectedConversationInput[], attempt: {
    readonly text: string;
    readonly message: string;
    readonly at: string;
    readonly sent: boolean;
    readonly actionPending: boolean;
}): readonly RejectedConversationInput[] {
    if (attempt.sent || attempt.actionPending || !attempt.message) return entries;
    return [...entries, { text: attempt.text, message: attempt.message, at: attempt.at }];
}

export function rememberOriginalInput(originals: WeakMap<DialogueLine, string>,
    history: readonly DialogueLine[], submitted: string, previousHistory: readonly DialogueLine[]): boolean {
    const previous = new Set(previousHistory);
    for (let index = history.length - 1; index >= 0; index--) {
        const line = history[index];
        if (!previous.has(line) && line.speaker === 'Detective' && line.text === submitted.trim()) {
            originals.set(line, submitted);
            return true;
        }
    }
    return false;
}

export function formatConversationExport(input: {
    readonly npcName: string;
    readonly npcId: string;
    readonly buildMode?: string;
    readonly exportedAt: string;
    readonly history: readonly DialogueLine[];
    readonly originalInputByLine?: { get(line: DialogueLine): string | undefined };
    readonly rejected: readonly RejectedConversationInput[];
}): string {
    const lines = [
        'Dead End — Conversation Export',
        `NPC: ${input.npcName}`,
        `NPC ID: ${input.npcId}`,
        ...(input.buildMode ? [`Build mode: ${input.buildMode}`] : []),
        `Exported: ${input.exportedAt}`,
        '',
        'Conversation (chronological)',
    ];
    if (input.history.length === 0) lines.push('No conversation messages recorded.');
    input.history.forEach((line, index) => {
        const playerText = line.speaker === 'Detective' ? input.originalInputByLine?.get(line) : undefined;
        lines.push('', `${index + 1}. ${line.speaker}`, playerText ?? line.text);
    });
    lines.push('', 'Rejected inputs (not sent)');
    if (input.rejected.length === 0) lines.push('None.');
    input.rejected.forEach((entry, index) => {
        lines.push('', `${index + 1}. ${entry.at}`, 'Player input:', entry.text, 'Rejection:', entry.message);
    });
    return `${lines.join('\n')}\n`;
}

export function downloadConversationExport(npcId: string, exportedAt: string, content: string): void {
    const filename = `dead-end-conversation-${npcId}-${exportedAt.replace(/[:.]/g, '-')}.txt`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
