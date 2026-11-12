import { useEffect, useRef } from 'react';
import type { KnowledgeRecord } from '../core/model';
import { session } from '../runtime';

export function Notebook({ entries }: { entries: readonly KnowledgeRecord[] }) {
    const close = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null;
        close.current?.focus();
        return () => previous?.focus();
    }, []);
    return <div className="modal-scrim">
        <section className="notebook panel" role="dialog" aria-modal="true" aria-labelledby="notebook-title">
            <header className="panel-heading"><div><span className="eyebrow">PRIVATE & CONFIDENTIAL</span><h2 id="notebook-title">Field notes</h2></div><button ref={close} onClick={() => session.toggleNotebook()}>Close <kbd>Tab</kbd></button></header>
            <p className="notebook-intro">What I saw. What they said. There’s a difference.</p>
            <div id="notebook-pages" className="notebook-pages">
                {(['observation', 'testimony'] as const).map(kind => <section key={kind}>
                    <h3>{kind === 'observation' ? 'Observations' : 'Testimony'} <span>{entries.filter(entry => entry.kind === kind).length}</span></h3>
                    {!entries.some(entry => entry.kind === kind) && <p className="empty-notes">{kind === 'observation' ? 'No observations recorded.' : 'No statements recorded.'}</p>}
                    {entries.filter(entry => entry.kind === kind).map(entry => <article className={`record ${kind}`} key={entry.id}>
                        <span className="record-kind">{kind === 'testimony' ? 'WITNESS ACCOUNT · UNVERIFIED' : 'DIRECT OBSERVATION'}</span>
                        <h4>{entry.title}</h4><p>{entry.text}</p>
                        <div className="record-source">{entry.source}</div>
                        {entry.eventTime && <p className="event-time">Claimed time: {entry.eventTime}</p>}
                        <div className="record-time">Recorded {new Date(entry.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · this device’s clock</div>
                    </article>)}
                </section>)}
            </div>
            <p className="notebook-footnote">A record of discoveries. No conclusions assumed. ↑ / ↓ to scroll.</p>
        </section>
    </div>;
}
