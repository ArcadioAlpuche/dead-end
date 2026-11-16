import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { PendingAction } from '../core/actions';
import { confirmationInputAction } from './confirmationInput';
import { nextFocusIndex } from './casebookInput';

export function Confirmation({ action, underlay, onConfirm, onCancel }: {
    action: PendingAction;
    underlay: RefObject<HTMLElement | null>;
    onConfirm: (token: symbol) => void;
    onCancel: (token: symbol) => void;
}) {
    const panel = useRef<HTMLElement>(null);
    const cancel = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null;
        const background = underlay.current;
        cancel.current?.focus();
        // Capture the opener before making its subtree inert, which otherwise blurs it.
        if (background) { background.inert = true; background.setAttribute('aria-hidden', 'true'); }
        return () => {
            if (background) { background.inert = false; background.removeAttribute('aria-hidden'); }
            if (previous?.isConnected) previous.focus();
        };
    }, [action.token, underlay]);
    return <div className="modal-scrim confirmation-scrim">
        <section ref={panel} className="panel confirmation" role="dialog" aria-modal="true"
            aria-labelledby="confirmation-title" aria-describedby="confirmation-commitment"
            onKeyUp={event => { if (!event.ctrlKey && !event.altKey && !event.metaKey) event.preventDefault(); event.stopPropagation(); }}
            onKeyDown={event => {
                event.stopPropagation();
                if (event.ctrlKey || event.altKey || event.metaKey) return; // Preserve browser shortcuts.
                event.preventDefault();
                const input = confirmationInputAction({ key: event.key, shiftKey: event.shiftKey,
                    repeat: event.repeat, isComposing: event.nativeEvent.isComposing });
                const buttons = Array.from(panel.current!.querySelectorAll<HTMLButtonElement>('button'));
                const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
                if (input === 'cancel') onCancel(action.token);
                if (input === 'activate' && current >= 0) buttons[current].click();
                if (input === 'next' || input === 'previous') buttons[nextFocusIndex(current, buttons.length, input === 'next' ? 1 : -1)]?.focus();
            }}>
            <span className="eyebrow">REVIEW YOUR DECISION</span>
            <h2 id="confirmation-title">{action.title}</h2>
            <p><strong>Recipient:</strong> {action.recipient.name}</p>
            <p id="confirmation-commitment">{action.commitment}</p>
            {action.information && <div className="confirmation-information"><strong>Information to disclose</strong><p>{action.information.text}</p></div>}
            <p className="confirmation-help">Nothing is committed until you confirm.</p>
            <div className="case-actions">
                <button ref={cancel} type="button" onClick={() => onCancel(action.token)}>Cancel <kbd>Esc</kbd></button>
                <button type="button" onClick={() => onConfirm(action.token)}>Confirm</button>
            </div>
            <p className="confirmation-help">Tab / Shift+Tab to focus · Enter to choose</p>
        </section>
    </div>;
}
