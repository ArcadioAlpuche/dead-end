export const lobbyPreviewMode = import.meta.env.DEV
    && new URLSearchParams(window.location.search).get('lobbyPreview') === '1';

// The handoff is a single opaque reference, not a production layer set.
export const lobbyReferenceMode = lobbyPreviewMode
    && new URLSearchParams(window.location.search).get('reference') === '1';
