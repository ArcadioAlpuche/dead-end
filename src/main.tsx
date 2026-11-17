import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { lobbyPreviewMode } from './game/lobbyPreviewMode.ts';
import { LobbyPreviewApp } from './LobbyPreviewApp.tsx';
import { characterPreviewMode } from './game/characterPreviewMode.ts';
import { CharacterPreviewApp } from './CharacterPreviewApp.tsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        {lobbyPreviewMode ? <LobbyPreviewApp /> : characterPreviewMode ? <CharacterPreviewApp /> : <App />}
    </React.StrictMode>,
)
