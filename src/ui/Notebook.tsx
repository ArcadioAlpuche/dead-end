import { useEffect, useRef } from 'react';
import type { CasebookEntry, KnowledgeRecord } from '../core/model';
import { session } from '../runtime';

export function Notebook({ entries, cases, offerId, actionError }: {
    entries: readonly KnowledgeRecord[];
    cases: readonly CasebookEntry[];
    offerId: string | null;
    actionError: string;
}) {
    const close = useRef<HTMLButtonElement>(null);
    const defer = useRef<HTMLButtonElement>(null);
    const offer = cases.find(entry => entry.id === offerId);
    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null;
        close.current?.focus();
        return () => previous?.focus();
    }, []);
    useEffect(() => {
        if (offerId) defer.current?.focus(); else close.current?.focus();
        document.getElementById('notebook-pages')?.scrollTo({ top: 0 });
    }, [offerId]);
    return <div className="modal-scrim">
        <section id="casebook-panel" className="notebook panel" role="dialog" aria-modal="true" aria-labelledby="notebook-title"
            onKeyDown={event => event.stopPropagation()} onKeyUp={event => event.stopPropagation()}>
            <header className="panel-heading"><div><span className="eyebrow">PRIVATE & CONFIDENTIAL</span><h2 id="notebook-title">{offer ? 'Client request' : 'Casebook'}</h2></div><button ref={close} onClick={() => session.toggleNotebook()}>Close <kbd>{offer ? 'Esc' : 'Tab'}</kbd></button></header>
            <div id="notebook-pages" className="casebook-pages">
                {actionError && <p role="status">{actionError}</p>}
                {offer ? <article className="case-offer">
                    <span className="record-kind">AVAILABLE ASSIGNMENT</span>
                    <h3>{offer.title}</h3>
                    <h4>{offer.client}</h4>
                    <blockquote>{offer.offer}</blockquote>
                    <p className="record-source">Client’s account · not independently verified</p>
                    <p><strong>The assignment:</strong> {offer.assignment}</p>
                    <p>You can leave this request for later and continue exploring.</p>
                    <div className="case-actions">
                        <button ref={defer} onClick={() => session.deferCase(offer.id)}>Defer for now</button>
                        <button onClick={() => session.requestCaseAcceptance(offer.id)}>Accept assignment</button>
                    </div>
                </article> : <>
                    <section className="assignments" aria-label="Assignments">
                        {(['available', 'active'] as const).map(status => <section key={status}>
                            <h3>{status === 'available' ? 'Available assignments' : 'Active assignments'}</h3>
                            {!cases.some(entry => entry.status === status) && <p className="empty-notes">{status === 'available' ? 'No available assignments.' : 'No active assignments.'}</p>}
                            {cases.filter(entry => entry.status === status).map(entry => <article className="case-entry" key={entry.id}>
                                <h4>{entry.title}</h4><p className="record-source">Client: {entry.client}</p>
                                <p>{entry.assignment}</p>
                                {entry.status === 'available'
                                    ? <button onClick={() => session.openCaseOffer(entry.id)}>Read request from {entry.client}</button>
                                    : <><h5>Acceptance history</h5>{entry.history.map(event => <p className="record-time" key={event.kind}>
                                        Accepted {new Date(event.recordedAt).toLocaleString()} · this device’s clock
                                    </p>)}</>}
                            </article>)}
                        </section>)}
                    </section>
                    <h3>Field notes</h3>
                    <p className="notebook-intro">What I saw. What they said. There’s a difference.</p>
                    <div className="notebook-pages">
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
                </>}
            </div>
            <p className="notebook-footnote">{offer ? 'Tab / Shift+Tab to focus · Enter to choose · Esc to leave' : '← / → to focus controls · Enter to choose · ↑ / ↓ to scroll · Tab / Esc to close'}</p>
        </section>
    </div>;
}
