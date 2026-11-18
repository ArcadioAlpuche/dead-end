interface ConversationShortcutKey {
    readonly key: string;
    readonly repeat: boolean;
    readonly isComposing: boolean;
    readonly ctrlKey: boolean;
    readonly altKey: boolean;
    readonly metaKey: boolean;
    readonly editable: boolean;
}

export function conversationShortcutAction(event: ConversationShortcutKey): 'history' | 'none' {
    if (event.editable || event.repeat || event.isComposing || event.ctrlKey || event.altKey || event.metaKey) return 'none';
    return event.key.toLowerCase() === 'h' ? 'history' : 'none';
}
