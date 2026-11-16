// Only implemented request contracts belong here. Future protection/submission/withdrawal
// require their own authored prerequisites and reducer branches, not arbitrary effects.
export type ActionRequest =
    | { readonly kind: 'accept-assignment'; readonly caseId: string; readonly recipientId: string }
    | { readonly kind: 'disclose-information'; readonly informationId: string; readonly recipientId: string };
export interface ActionPreview {
    readonly title: string;
    readonly recipient: { readonly id: string; readonly name: string };
    readonly commitment: string;
    readonly information?: { readonly id: string; readonly text: string };
}
export type ActionReview = { readonly ok: true; readonly preview: ActionPreview } | { readonly ok: false; readonly reason: string };
export interface PendingAction extends ActionPreview {
    // An opaque, session-local identity. It is deliberately not serializable save state.
    readonly token: symbol;
    readonly request: ActionRequest;
}
export interface ActionPolicy<State> {
    review(state: State, request: ActionRequest): ActionReview;
    // Pure: prepare the entire next state without mutating the supplied snapshot or publishing.
    reduce(state: State, request: ActionRequest, recordedAt: number): State;
}
export type ConfirmationResult<State> =
    | { readonly ok: true; readonly state: State }
    | { readonly ok: false; readonly reason: string };

function copyPreview(preview: ActionPreview): ActionPreview {
    return { title: preview.title, recipient: { ...preview.recipient }, commitment: preview.commitment,
        ...(preview.information ? { information: { ...preview.information } } : {}) };
}

// Owns only a transient proposal, never a second copy of durable game state.
export class ActionConfirmation<State> {
    private pending: PendingAction | null = null;
    private readonly policy: ActionPolicy<State>;
    constructor(policy: ActionPolicy<State>) { this.policy = policy; }

    getPending(): PendingAction | null {
        return this.pending ? { ...copyPreview(this.pending), token: this.pending.token, request: { ...this.pending.request } } : null;
    }
    propose(state: State, request: ActionRequest): ActionReview {
        if (this.pending) return { ok: false, reason: 'Finish or cancel the current action first.' };
        const review = this.policy.review(state, request);
        if (!review.ok) return review;
        this.pending = { ...copyPreview(review.preview), request: { ...request }, token: Symbol(request.kind) };
        return { ok: true, preview: copyPreview(review.preview) };
    }
    cancel(token: symbol): boolean {
        if (this.pending?.token !== token) return false;
        this.pending = null;
        return true;
    }
    clear(): void { this.pending = null; }
    confirm(token: symbol, state: State, recordedAt: number): ConfirmationResult<State> {
        const pending = this.pending;
        if (!pending || pending.token !== token) return { ok: false, reason: 'This confirmation is no longer current.' };
        // Consume before evaluation: errors and reentrant/duplicate callbacks cannot retry it.
        this.pending = null;
        const review = this.policy.review(state, pending.request);
        if (!review.ok) return review;
        if (JSON.stringify(copyPreview(review.preview)) !== JSON.stringify(copyPreview(pending))) {
            return { ok: false, reason: 'The action has changed. Review a new request before confirming.' };
        }
        if (!Number.isFinite(recordedAt) || recordedAt < 0) return { ok: false, reason: 'The action could not be recorded.' };
        try { return { ok: true, state: this.policy.reduce(state, pending.request, recordedAt) }; }
        catch { return { ok: false, reason: 'The action could not be completed. Nothing was committed.' }; }
    }
}
