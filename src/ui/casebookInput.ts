interface CasebookKey {
    readonly key: string;
    readonly shiftKey: boolean;
    readonly repeat: boolean;
}
export function casebookKeyAction(event: CasebookKey, offerOpen: boolean): 'close' | 'previous' | 'next' | 'up' | 'down' | 'block' | 'native' {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (event.repeat && ['Tab', 'Escape', 'Enter', ' '].includes(key)) return 'block';
    if (key === 'Escape' || (key === 'Tab' && !offerOpen)) return 'close';
    if (key === 'Tab') return event.shiftKey ? 'previous' : 'next';
    if (key === 'ArrowLeft') return 'previous';
    if (key === 'ArrowRight') return 'next';
    if (key === 'ArrowUp') return 'up';
    if (key === 'ArrowDown') return 'down';
    if (['w', 'a', 's', 'd', 'e'].includes(key)) return 'block';
    return 'native';
}

export function nextFocusIndex(current: number, count: number, direction: -1 | 1): number {
    if (count === 0) return -1;
    if (current < 0) return direction === 1 ? 0 : count - 1;
    return (current + direction + count) % count;
}
