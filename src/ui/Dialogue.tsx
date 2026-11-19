import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Conversation, DialogueLine, LocationId } from '../core/model';
import { MAX_MESSAGE_LENGTH } from '../core/conversation';
import { session } from '../runtime';
import { conversationInputAction, conversationInputHeight } from './conversationInput';
import { conversationShortcutAction } from './conversationShortcuts';
import { conversationScene, KANE_CONVERSATION_PORTRAIT, latestExchange, npcConversationPortrait, npcConversationRole } from './conversationPresentation';
import { downloadConversationExport, formatConversationExport, recordRejectedInput, rememberOriginalInput } from './developmentConversationExport';
import type { RejectedConversationInput } from './developmentConversationExport';

function fitQuestionField(element: HTMLTextAreaElement) {
    const style = getComputedStyle(element);
    element.style.height = 'auto';
    const contentHeight = element.scrollHeight;
    const height = conversationInputHeight(contentHeight, parseFloat(style.minHeight) || 52, parseFloat(style.maxHeight) || 140);
    element.style.height = `${height}px`;
    element.style.overflowY = contentHeight > height ? 'auto' : 'hidden';
}

export function Dialogue({ conversation, locationId }: { conversation: Conversation; locationId: LocationId }) {
    const panel = useRef<HTMLElement>(null);
    const input = useRef<HTMLTextAreaElement>(null);
    const historyButton = useRef<HTMLButtonElement>(null);
    const historyClose = useRef<HTMLButtonElement>(null);
    const historyLog = useRef<HTMLDivElement>(null);
    const originalInputs = useRef(new WeakMap<DialogueLine, string>());
    const rejectedInputs = useRef<readonly RejectedConversationInput[]>([]);
    const [draft, setDraft] = useState('');
    const [historyOpen, setHistoryOpen] = useState(false);
    const scene = conversationScene(locationId);
    const npcPortrait = npcConversationPortrait(conversation.id);
    const npcRole = npcConversationRole(conversation.id);
    const exchange = latestExchange(conversation);

    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null;
        input.current?.focus();
        return () => previous?.focus();
    }, []);
    useEffect(() => {
        if (historyOpen) {
            historyClose.current?.focus();
            historyLog.current?.scrollTo({ top: historyLog.current.scrollHeight });
        }
    }, [historyOpen, conversation.history]);
    useLayoutEffect(() => { if (input.current) fitQuestionField(input.current); }, [draft]);
    useEffect(() => {
        const resize = () => { if (input.current) fitQuestionField(input.current); };
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, []);

    const closeHistory = () => { setHistoryOpen(false); historyButton.current?.focus(); };
    const toggleHistory = () => { if (historyOpen) closeHistory(); else setHistoryOpen(true); };
    const submit = () => {
        if (conversation.pending || !draft.trim()) return;
        const submitted = draft;
        const previousHistory = session.getSnapshot().conversation?.history ?? [];
        void session.submitMessage(submitted).then(sent => {
            const current = session.getSnapshot();
            if (import.meta.env.DEV && panel.current && current.conversation?.id === conversation.id) {
                if (sent) rememberOriginalInput(originalInputs.current, current.conversation.history, submitted, previousHistory);
                else rejectedInputs.current = recordRejectedInput(rejectedInputs.current, {
                    text: submitted, message: current.conversation.error, at: new Date().toISOString(),
                    sent, actionPending: current.pendingAction !== null,
                });
            }
            // Clarification leaves the unsent draft editable, outside NPC history/context.
            if (sent) setDraft(current => current === submitted ? '' : current);
        });
        input.current?.focus();
    };
    const exportConversation = () => {
        const definition = session.world.conversations[conversation.id];
        if (!definition) return;
        const exportedAt = new Date().toISOString();
        const content = formatConversationExport({ npcName: conversation.name, npcId: definition.npcId,
            buildMode: import.meta.env.MODE, exportedAt, history: conversation.history,
            originalInputByLine: originalInputs.current, rejected: rejectedInputs.current });
        downloadConversationExport(definition.npcId, exportedAt, content);
    };

    return <div className="modal-scrim dialogue-scrim">
        <section ref={panel} className="dialogue panel"
            role="dialog" aria-modal="true" aria-labelledby="speaker"
            onKeyUp={event => event.stopPropagation()} onKeyDown={event => {
                event.stopPropagation();
                const target = event.target;
                if (conversationShortcutAction({ key: event.key, repeat: event.repeat, isComposing: event.nativeEvent.isComposing,
                    ctrlKey: event.ctrlKey, altKey: event.altKey, metaKey: event.metaKey,
                    editable: target instanceof HTMLElement && (target.isContentEditable || target.matches('input, textarea, select')) }) === 'history') {
                    event.preventDefault();
                    toggleHistory();
                    return;
                }
                if (event.key === 'Escape' && historyOpen && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    if (!event.repeat) closeHistory();
                }
                if (event.key === 'Tab') {
                    event.preventDefault();
                    const selector = historyOpen
                        ? '.dialogue-history-heading button, .dialogue-shortcuts button:nth-child(n+2)'
                        : 'button:not(:disabled), textarea';
                    const controls = Array.from(panel.current?.querySelectorAll<HTMLElement>(selector) ?? []);
                    if (!controls.length) return;
                    const current = controls.indexOf(document.activeElement as HTMLElement);
                    controls[(current + (event.shiftKey ? controls.length - 1 : 1)) % controls.length]?.focus();
                }
            }}>
            <div className="dialogue-scene" aria-hidden="true">
                {scene?.layers.map((src, index) => <img key={src} src={src} className={`dialogue-scene-layer dialogue-scene-layer-${index}`} alt="" />)}
            </div>
            <div className="dialogue-shade" aria-hidden="true" />

            <header className="dialogue-header">
                <div className="dialogue-header-title">{scene?.label ?? 'Conversation'}</div>
                <h2 id="speaker" className="dialogue-visually-hidden">Conversation with {conversation.name}</h2>
            </header>

            <div className="dialogue-stage">
                <div className="dialogue-portrait dialogue-portrait-kane">
                    <img src={KANE_CONVERSATION_PORTRAIT} alt="" />
                    <div className="dialogue-nameplate"><strong>Thomas Kane</strong><em> — Detective</em></div>
                </div>
                <div className="dialogue-exchange">
                    <div className="dialogue-bubble dialogue-bubble-question">
                        <p>{exchange.question?.text ?? 'Your question will appear here.'}</p>
                    </div>
                    <div className="dialogue-bubble dialogue-bubble-response" aria-live="polite">
                        <p>{conversation.pending ? 'Waiting for a reply…' : exchange.response?.text ?? 'No reply yet.'}</p>
                    </div>
                </div>
                <div className="dialogue-portrait dialogue-portrait-npc">
                    {npcPortrait && <img src={npcPortrait} alt="" />}
                    <div className="dialogue-nameplate"><strong>{conversation.name}</strong>{npcRole && npcRole.toLowerCase() !== conversation.name.toLowerCase() && <em> — {npcRole}</em>}</div>
                </div>
            </div>

            <form className="dialogue-compose" onSubmit={event => { event.preventDefault(); submit(); }}>
                <label htmlFor="conversation-message" className="dialogue-visually-hidden">Ask or say something</label>
                <textarea ref={input} id="conversation-message" value={draft} maxLength={MAX_MESSAGE_LENGTH} rows={1}
                        placeholder={`Ask ${conversation.name} a question…`} onChange={event => setDraft(event.target.value)}
                        onKeyDown={event => {
                            const action = conversationInputAction({ key: event.key, shiftKey: event.shiftKey,
                                repeat: event.repeat, isComposing: event.nativeEvent.isComposing });
                            if (action !== 'edit') { event.preventDefault(); if (action === 'submit') submit(); }
                        }} />
                {conversation.error && <p role="status" className="conversation-status">{conversation.error}</p>}
                <div className="dialogue-shortcuts" aria-label="Conversation controls">
                    <button type="submit" aria-keyshortcuts="Enter" disabled={conversation.pending || !draft.trim()}><kbd>Enter</kbd><span>Send</span></button>
                    <button ref={historyButton} type="button" aria-keyshortcuts="H" aria-expanded={historyOpen}
                        aria-controls="conversation-history-panel" onClick={toggleHistory}><kbd>H</kbd><span>History</span></button>
                    <button type="button" aria-keyshortcuts="Escape" onClick={() => session.closeDialogue()}><kbd>Esc</kbd><span>Leave</span></button>
                </div>
            </form>

            {historyOpen && <div id="conversation-history-panel" className="dialogue-history-panel" role="region" aria-label="Conversation history">
                <div className="dialogue-history-heading"><h3>Conversation history</h3>
                    <div className="dialogue-history-actions">
                        {import.meta.env.DEV && <button type="button" onClick={exportConversation}>Export Conversation</button>}
                        <button ref={historyClose} type="button" onClick={closeHistory}>Close history <kbd>Esc</kbd></button>
                    </div></div>
                <div ref={historyLog} className="conversation-history" role="log" aria-label="Conversation history" aria-live="off">
                    {conversation.history.map((line, index) => <p key={index}><strong>{line.speaker === 'Detective' ? 'Thomas Kane' : line.speaker}</strong><span>{line.text}</span></p>)}
                </div>
            </div>}
        </section>
    </div>;
}
