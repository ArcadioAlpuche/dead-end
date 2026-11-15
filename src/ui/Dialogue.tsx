import { useEffect, useRef, useState } from 'react';
import type { Conversation } from '../core/model';
import { MAX_MESSAGE_LENGTH } from '../core/conversation';
import { session } from '../runtime';
import { conversationInputAction } from './conversationInput';

export function Dialogue({ conversation }: { conversation: Conversation }) {
    const panel = useRef<HTMLElement>(null);
    const input = useRef<HTMLTextAreaElement>(null);
    const log = useRef<HTMLDivElement>(null);
    const [draft, setDraft] = useState('');
    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null;
        input.current?.focus();
        return () => previous?.focus();
    }, []);
    useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight }); }, [conversation.history]);
    const submit = () => {
        if (conversation.pending || !draft.trim()) return;
        void session.submitMessage(draft);
        setDraft('');
        input.current?.focus();
    };
    return <div className="modal-scrim dialogue-scrim">
        <section ref={panel} className="dialogue panel" role="dialog" aria-modal="true" aria-labelledby="speaker"
            onKeyUp={event => event.stopPropagation()} onKeyDown={event => {
                event.stopPropagation();
                if (event.key === 'Tab') {
                    event.preventDefault();
                    const controls = Array.from(panel.current!.querySelectorAll<HTMLElement>('button:not(:disabled), textarea'));
                    const current = controls.indexOf(document.activeElement as HTMLElement);
                    controls[(current + (event.shiftKey ? controls.length - 1 : 1)) % controls.length]?.focus();
                }
            }}>
            <span className="eyebrow">AT THE FRONT DESK</span><h2 id="speaker">{conversation.name}</h2>
            <div ref={log} className="conversation-history" role="log" aria-label="Conversation history" aria-live="polite">
                {conversation.history.map((line, index) => <p key={index}><strong>{line.speaker}</strong><span>{line.text}</span></p>)}
            </div>
            <form onSubmit={event => { event.preventDefault(); submit(); }}>
                <label htmlFor="conversation-message">Your question or statement</label>
                <textarea ref={input} id="conversation-message" value={draft} maxLength={MAX_MESSAGE_LENGTH} rows={2}
                    aria-describedby="conversation-help" onChange={event => setDraft(event.target.value)}
                    onKeyDown={event => {
                        const action = conversationInputAction({ key: event.key, shiftKey: event.shiftKey,
                            repeat: event.repeat, isComposing: event.nativeEvent.isComposing });
                        if (action !== 'edit') { event.preventDefault(); if (action === 'submit') submit(); }
                    }} />
                <p id="conversation-help" className="conversation-help">Enter to send · Shift+Enter for a new line · Esc to leave</p>
                <p role="status" className="conversation-status">{conversation.pending ? 'Waiting for a reply…' : conversation.error}</p>
                <div className="dialogue-actions">
                    <button type="button" className="text-button" onClick={() => session.closeDialogue()}>Leave conversation <kbd>Esc</kbd></button>
                    <button type="submit" disabled={conversation.pending || !draft.trim()}>Send</button>
                </div>
            </form>
        </section>
    </div>;
}
