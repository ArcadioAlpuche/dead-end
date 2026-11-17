export function resolveLobbyPreviewQuery(search: string, development: boolean) {
    const params = new URLSearchParams(search);
    const preview = development && params.get('lobbyPreview') === '1';
    const reference = preview && params.get('reference') === '1';
    const production = preview && !reference && params.get('production') === '1';
    const debug = production && params.get('debug') === '1';
    return { preview, reference, production, debug };
}
