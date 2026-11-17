export function resolveCharacterPreviewQuery(search: string, development: boolean, lobbyPreview: boolean): boolean {
    return development && !lobbyPreview && new URLSearchParams(search).get('characterPreview') === '1';
}
