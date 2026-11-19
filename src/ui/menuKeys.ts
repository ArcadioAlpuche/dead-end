export type MenuKeyAction = 'previous' | 'next' | 'back' | 'activate' | 'tab' | 'native';

export function menuKeyAction(key: string): MenuKeyAction {
    if (key === 'ArrowUp') return 'previous';
    if (key === 'ArrowDown') return 'next';
    if (key === 'Escape') return 'back';
    if (key === 'Enter') return 'activate';
    if (key === 'Tab') return 'tab';
    return 'native';
}

export function nextMenuIndex(current: number, availableCount: number, direction: -1 | 1): number {
    if (availableCount === 0) return -1;
    if (current < 0) return direction === 1 ? 0 : availableCount - 1;
    return (current + direction + availableCount) % availableCount;
}
