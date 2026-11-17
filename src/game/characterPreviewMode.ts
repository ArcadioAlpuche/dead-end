import { lobbyPreviewMode } from './lobbyPreviewMode.ts';
import { resolveCharacterPreviewQuery } from './characterPreviewQuery.ts';

// An isolated development scene; the playable character variant remains unchanged.
export const characterPreviewMode = resolveCharacterPreviewQuery(
    window.location.search, import.meta.env.DEV, lobbyPreviewMode,
);
