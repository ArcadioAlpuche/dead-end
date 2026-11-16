interface ConfirmationKey {
    readonly key: string;
    readonly shiftKey: boolean;
    readonly repeat: boolean;
    readonly isComposing: boolean;
}
export function confirmationInputAction(event: ConfirmationKey): 'cancel' | 'next' | 'previous' | 'activate' | 'block' {
    if (event.isComposing || event.repeat) return 'block';
    if (event.key === 'Escape') return 'cancel';
    if (event.key === 'Tab') return event.shiftKey ? 'previous' : 'next';
    if (event.key === 'ArrowRight') return 'next';
    if (event.key === 'ArrowLeft') return 'previous';
    if (event.key === 'Enter' || event.key === ' ') return 'activate';
    return 'block';
}
