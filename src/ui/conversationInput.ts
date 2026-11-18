interface ConversationKey {
    readonly key: string;
    readonly shiftKey: boolean;
    readonly repeat: boolean;
    readonly isComposing: boolean;
}
export function conversationInputAction(event: ConversationKey): 'submit' | 'ignore' | 'edit' {
    if (event.isComposing || event.key !== 'Enter' || event.shiftKey) return 'edit';
    return event.repeat ? 'ignore' : 'submit';
}

export function conversationInputHeight(contentHeight: number, minimum: number, maximum: number): number {
    return Math.max(minimum, Math.min(contentHeight, Math.max(minimum, maximum)));
}
