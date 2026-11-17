/** Legacy kaneIdle=1 flag now enables E-style idle/walk only in the isolated production preview. */
export function resolveEStyleLobbyPreviewQuery(search: string, productionPreview: boolean): boolean {
    return productionPreview && new URLSearchParams(search).get('kaneIdle') === '1';
}
