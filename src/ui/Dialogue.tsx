import { useEffect, useRef } from 'react';
import type { Conversation } from '../core/model';
import { session } from '../runtime';

export function Dialogue({ conversation }: { conversation: Conversation }) {
    const panel = useRef<HTMLElement>(null);
    const next = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null;
        next.current?.focus();
        return () => previous?.focus();
    }, []);
    const last = conversation.lineIndex === session.world.conversations[conversation.id].length - 1;
    return <div className="modal-scrim dialogue-scrim">
        <section ref={panel} className="dialogue panel" role="dialog" aria-modal="true" aria-labelledby="speaker" onKeyDown={event => {
            if (event.key === 'Tab') {
                event.preventDefault();
                const buttons = Array.from(panel.current!.querySelectorAll('button'));
                const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
                buttons[(current + (event.shiftKey ? buttons.length - 1 : 1)) % buttons.length]?.focus();
            }
        }}>
            <span className="eyebrow">AT THE FRONT DESK</span><h2 id="speaker">{conversation.line.speaker}</h2>
            <p className="dialogue-text" aria-live="polite">“{conversation.line.text}”</p>
            <div className="dialogue-actions"><button className="text-button" onClick={() => session.closeDialogue()}>Leave conversation <kbd>Esc</kbd></button><button ref={next} onClick={() => session.advanceDialogue()}>{last ? 'Finish' : 'Continue'} <kbd>E</kbd></button></div>
        </section>
    </div>;
}
