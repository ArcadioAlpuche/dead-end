import { resolveLobbyPreviewQuery } from './lobbyPreviewQuery.ts';
import { resolveEStyleLobbyPreviewQuery } from './eStyleLobbyPreviewQuery.ts';

const query = resolveLobbyPreviewQuery(window.location.search, import.meta.env.DEV);
export const lobbyPreviewMode = query.preview;

// The handoff is a single opaque reference, not a production layer set.
export const lobbyReferenceMode = query.reference;

// Production exports are opt-in and never replace the reference or temporary comparison.
export const lobbyProductionMode = query.production;

export const lobbySpatialDebugMode = query.debug;

export const lobbyEStyleIdleMode = resolveEStyleLobbyPreviewQuery(window.location.search, query.production);
