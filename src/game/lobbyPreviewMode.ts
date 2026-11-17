export const lobbyPreviewMode = import.meta.env.DEV
    && new URLSearchParams(window.location.search).get('lobbyPreview') === '1';
