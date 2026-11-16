# Chapter 1 — Architecture Assessment and Implementation Plan

Planning baseline November 15, 2026, updated for M1 and M2 implementation. **M1 and M2 are approved and implemented on `feat/chapter-1-foundation`; M3 and later remain proposals.** Read the [game design](game-design.md) and [Chapter 1 content proposal](chapter-1-bellweather.md) together before approving work. The existing [architecture document](architecture.md) describes the current system; this file records how to extend it without replacing the scaffold.

## Repository preparation and inspected baseline

Started on `main` at `4d5efea` (the merged free-form conversation milestone). Fetched `origin/main` and verified zero commits ahead/behind before creating `feat/chapter-1-foundation`. Tracked files were clean. The pre-existing untracked `asset-backups/` directory was reported before switching and remains untouched; the working tree was therefore not literally empty. No stash, deletion, asset move, commit, push, or pull request is part of this task.

Installed dependencies were inspected with `npm ls --depth=0`: Phaser 4.0.0, React/React DOM 19.1.0, TypeScript 5.7.3, Vite 6.3.2. Preserve the Vite React setup, relative base path, production Phaser chunk and Terser settings. There is no need for a new engine, router, state library, test framework, backend or content editor for the authored case.

Source reviewed: `src/content/hotel.ts`, `src/core/{model,session,validation,conversation,spatial}.ts`, `src/conversation/mockResponder.ts`, `src/ui/{Dialogue,Notebook}.tsx`, input routing, runtime/persistence, Phaser room rendering/movement/animation integration, Vite configuration and the exploration/conversation/animation tests. Current tests cover 41 scenarios: 11 exploration, 10 conversation and 20 animation. This is an inspected coverage inventory, not a claim that tests were rerun during documentation planning.

## Capability assessment at the planning baseline

The table below describes the pre-M1 repository. See the M1 implementation note and [architecture](architecture.md) for current casebook and v3 save support.

| Capability | Current support | Proposed smallest extension / classification |
| --- | --- | --- |
| Chapter progression and unlock state | None. Startup loads the exploration world. | **New:** chapter definitions with authored prerequisites and stable case-resolution references; derived eligibility plus durable earned credit. Separate availability from ownership/current chapter. No fixed chapter count. |
| Multiple simultaneous cases | No cases or global active assignment yet. | **New:** case definitions and a map of case states keyed by ID; optional selected-case ID is UI presentation. First content uses one case, tests use a second fixture to check independence. |
| Casebook and evidence | `RecordDefinition` has observation/testimony, string source, location and optional claimed event time. `discover()` is idempotent. Notebook groups discovered records. | **Modify:** casebook views derive assignment history, disposition and links to global discoveries; add structured source/support references when needed. Keep private consequences separate from learned updates. No auto-deduction UI. |
| NPC memory and authored knowledge | One `accused` event per NPC, timestamp/location, persisted. Conversation definitions require receptionist-specific account/room lines. NPC IDs are currently unique per conversation definition. | **Modify:** separate NPC profile identity from conversation topics; introduce a few typed observed events and topic history. Stable `receptionist` ID can display Arthur Finch without losing saved memory. Remove the one-conversation-per-NPC assumption only when multiple contexts require it. |
| Free-form conversation | Async text-only responder injected by `runtime.ts`; bounded transient history, blocking UI, errors and late-reply rejection. Regex/keyword mock routes account/room. | **Reuse and modify:** deterministic authored topic/context selection for the four characters, clarified follow-ups, repeated-topic responses, safe unknown-topic fallback. Do not claim the current mock understands arbitrary allegations. |
| Consequential actions | Exact accusation memory is immediate; no reporting, acceptance, protection, payment or withdrawal. | **New:** typed propose/confirm/cancel commands with explicit prerequisites, recipient and data preview; atomic validated commit and idempotent effects. Plain adapter text never mutates these systems. |
| Persistence and migrations | Schema v2 under `dead-end.bellweather.v1`; v1 migration preserves discoveries; invalid saves start an unsaved session. Autosave subscribes to session changes and checkpoints movement. | **Modify:** additive versioned case/world fields, explicit migrations and protected recovery checkpoints; later demo export/import. Preserve unreadable originals. No silent new-state inference. |
| Persistent world | Player location, discoveries and one memory kind survive scenes. Geometry is static; no locks, inventory, NPC availability or consequence timeline. | **Modify/new:** small typed world-event/state fields needed by A–D; lazy presentation based on committed state. Avoid a city simulation or global ticking schedule. |
| Hotel topology and visuals | Four locations, named entries, pure spatial validation, shared Game scene, placeholder props, approved V2 visual. | **Reuse:** new object/NPC interactions in current rooms; add a small refuge only when needed. `LocationId` is a four-value union, so extension requires updating types, data and validation. Do not alter player speed/collision/animation. |
| Demo/full content boundaries | One resident `WorldDefinition`; localStorage is browser-origin scoped. | **New, later:** content catalog/build composition, package-aware validation and save transfer. No entitlements or purchase implementation in this plan. |
| AI service and operating cost | No network integration, credentials, output fact validator or usage accounting. | **Deferred:** server adapter, constrained NPC context, validation, cancellation/timeouts, privacy and measured lifetime budget. All authored outcomes must work without it; see game-design cost model. |

## Proposed ownership and minimal data contracts

Keep one authoritative `GameSession`. Extract small pure functions when a rule needs isolated testing; do not reorganize the whole repository into a framework. Add modules such as `core/cases.ts` and authored case data only when their milestone needs them. Phaser continues to handle resolved movement, input, collisions, camera and scene lifecycle; React presents casebook, conversation and confirmations.

Proposed responsibilities, not an instruction to create empty files:

| Definition/state | Minimum purpose |
| --- | --- |
| `CaseDefinition` | Stable case ID, public offer, relevant record references and explicitly authored resolution actions; hidden solution facts excluded from public selectors |
| `CaseState` | Assignment status/history, primary disposition, confirmed action IDs, payment status and learned consequence references; discoveries remain global |
| `ChapterDefinition` | Stable ID, included cases/places, authored progression prerequisites and installed-content requirement; no hardcoded five-chapter limit |
| `NpcProfile` | Stable identity, authored knowledge/beliefs/lies, permitted topics and disclosure rules |
| `NpcInteractionEvent` | Typed meaningful event, subject/recipient, recording time, location and justified observation source; not a raw chat archive |
| `WorldState` additions | Only required facts such as Daniel located, location disclosed to Evelyn, protection completed, police packet accepted, fatal consequence committed, news learned |
| Pending consequential action | Transient action ID, recipient, exact disclosure/support IDs and relevant state revision; confirm revalidates, cancel discards |
| Progression record | Unique earned case-resolution event; definitions decide eligibility, with already unlocked access retained |
| Recovery checkpoint | A versioned whole-session snapshot excluding nested checkpoints/transient UI, retained independently of subsequent autosave until an explicit restore |

Do not duplicate fact lists between case, notebook, UI and conversation context. A case references global record IDs; a notebook derives visible entries. NPC contexts derive only the subset that NPC can know. Typed candidate proposals from a future language service still pass through core validation. A save or adapter response is not sufficient authority merely because it has the expected JSON shape.

### Consequential free-form actions

Acceptance, location reporting, protection, evidence submission and withdrawal need a distinct deterministic action path. Explicit action controls can be the reliable fallback; free text may request the same preview. Do not try to solve broad natural-language intent detection with an ever-growing accusation regex.

Proposed flow: identify a request → show the exact intended action and recipient → confirm against current state → apply related changes once → publish one committed snapshot → save. Recheck actor/location/context, case status, selected evidence and prior irreversible effects. Duplicate confirms and late responses must not create duplicate payments, deaths or progression credit. Reload clears a pending preview without performing it.

Critical limitation to address before A/B: the existing adapter receives the player's raw message before any action confirmation. A message containing Daniel's location must not be sent to Evelyn's NPC context as ordinary dialogue and then treated as “not disclosed” because a separate button was never pressed. Route potentially consequential disclosures through a pending preview before dispatch, with clarification for ambiguous input. The initial authored slice may use a clearly bounded report control and conservative interception; tests must cover paraphrases and explicit addresses. Robust arbitrary-language understanding is not claimed.

### Saves and compatibility

M1 uses schema v3: validate v1/v2, add empty case state, and supply empty NPC memory for v1. World/progression collections are deferred until required by later milestones. Preserve player coordinates/facing, discovery IDs/timestamps and NPC events exactly. Do not turn an old `receptionist-account` into Daniel's positive identification, infer a signed checkout, or create an accepted assignment.

Keep existing record meanings and the receptionist ID; new claims get new IDs. Schema version describes structure; content version/catalog describes definitions. At the content milestone, explicitly determine whether a content-version change is required and write the corresponding compatibility mapping. Merely changing an exact-match string would reject every old save. Unsupported newer schema, invalid references and absent content must preserve the original, not delete unknown fields or start saving over it.

Payment, primary disposition, consequence scheduling and earned credit must commit together. Persist an authored consequence trigger/state, not a browser timer. A crash between report and newspaper must retain A and produce the later news exactly once. Exposing Evelyn's eventual legal outcome is a separate learned update; hidden state is not dumped into the casebook.

Checkpoint restore is deliberate and atomic, restoring all related state, not only a case status. Keep the current run until restore succeeds; report storage/quota failure. If a promised pre-withdrawal recovery cannot be stored, do not offer a falsely recoverable withdrawal—retain the assignment and explain the problem. No new persistence library is necessary initially.

## Approval gate for M3 and later

Approve the chapter's proposed timeline, minimal refuge, document provenance, B safety action, C exposure rule, and branch-conflict policy. The exact wording and IDs of evidence should be settled before coding those records. Evidence placement and the withdrawal checkpoint mechanism remain unapproved. The long-term preference is in-world reopening rather than save rewind; settle that design before M8. This gate does not require choosing a city name, AI vendor, final chapter count, or final artwork.

**M1 has been approved and implemented.** Its case lifecycle can use the already established client/premise without committing any proposed criminal evidence or outcome mechanics.

## M1 — Case acceptance and persistent casebook foundation

**Implemented:** `content/cases.ts` contains only the public `case-001` offer. The existing casebook opens a minimal Evelyn contact panel, with Defer initially focused and explicit Accept. Deferring or closing leaves it available; acceptance writes one event and leaves existing field notes unchanged. Saves use v3 with a map of independent case states; v1/v2 migrate without inferring acceptance. No office or new world interactions are needed. The main casebook retains Tab to close, Left/Right selects controls, and Up/Down scrolls; the request uses Tab/Shift+Tab focus navigation and Escape to leave. M1 originally added no action-confirmation framework or world/progression placeholders. M2 now wraps acceptance with the narrow workflow below.

**Verification:** nine new case/input tests plus the existing 41 tests cover this scope; TypeScript/build and browser smoke checks are reported with the implementation. The two-case fixture is test content only.

- **Objective:** Accept or defer Evelyn's job and see an active Case 001 without making exploration conditional on it.
- **Scope:** A minimal offer/contact panel using the supplied premise; explicit acceptance through a narrow core command; a casebook assignment list alongside existing field notes. No withdrawal button or final outcome yet.
- **Reuse:** `GameSession`, snapshot subscription, notebook modal/input isolation, discovery IDs, local save adapter and runtime composition.
- **New components/data:** Case definition/state map, assignment history, casebook selector, schema migration to the next supported version and case-state validation.
- **Dependencies:** Approval of this milestone and public offer wording. A walkable office and AI are unnecessary.
- **Acceptance criteria:** Deferring leaves all hotel evidence available; acceptance never creates or duplicates clues; pre-acceptance discoveries remain usable and visible; repeated acceptance is idempotent; existing saves retain position, timestamps and memories; two fixture cases do not overwrite one another.
- **Relevant tests:** v1/v2 migration fixtures, unsupported saves preserved, before/after-acceptance discovery, repeat acceptance, independent case maps, round-trip without reopening modals, keyboard/focus smoke test.

## M2 — Confirmed action boundary

**Implemented November 16, 2026:** typed requests, recipient/information previews, transient one-use tokens, revalidation, pure candidate-state preparation and one session commit. Acceptance is the only enabled game action; the casebook's Accept button proposes it, then a Cancel-first modal requires a distinct Confirm. Schema v3 and M1 history remain unchanged. Reload, context exit, cancel, duplicate input, wrong recipients and stale eligibility cannot create acceptance.

The conversation boundary runs before all NPC dispatch/history/memory changes. Known ordinary phrases use whole-message matches; everything else is withheld for clarification. Trusted disclosure phrase routing and atomic effects are exercised only by noncanonical tests, with no live disclosure catalog or story outcomes. This intentionally reduces the mock's previously unrestricted text forwarding; benign unknown questions may also be blocked. Explicit casebook acceptance remains available. No M3 NPC profiles or additional hotel content were added. See [architecture](architecture.md) for the boundary, exact limits and future extension requirements.

Nine M2 tests supplement the existing 50; M1 tests now confirm acceptance through the new workflow. Browser checks cover Cancel focus, keyboard trapping/repeats, reload pending, actual acceptance, private unsent messages and preserved exploration.

- **Objective:** Make deliberate world-changing actions reviewable and safe to cancel before any ending is introduced.
- **Scope:** Reuse acceptance to exercise propose/confirm/cancel; introduce recipient/disclosure previews and guard against stale/duplicate actions. Test other action types with non-story fixtures, not live outcome buttons.
- **Reuse:** M1 case state, core commands, React modal controls, response pending/late-generation guard.
- **New components/data:** Small typed action union, pending action snapshot, validation results and atomic effect application. No general-purpose scripting engine.
- **Dependencies:** M1; approved separation between ordinary conversation and consequential action requests.
- **Acceptance criteria:** Cancel mutates nothing; repeated confirmation applies once; reload does not confirm; stale eligibility fails clearly; ambiguous or unconfirmed address disclosure never reaches an NPC response context.
- **Relevant tests:** Cancel/reload, double-click/Enter repeat, wrong recipient, stale case status, close-during-response, raw-address and paraphrase interception. Browser tests verify focus and restored movement.

## M3 — Authored NPC knowledge and follow-ups

**Implemented foundation on `feat/chapter-1-foundation`:** deterministic profiles for Arthur, Thomas, and Evelyn; authored whole-message topic variations and follow-ups; distinct patience responses and durable topic/statement/friction memory; v4 migration. Only Arthur remains physically accessible in the hotel. The narrative knowledge/lie matrix and new testimony in the chapter plan remain proposed and are not shipped as new facts or evidence.

- **Objective:** Evelyn, Arthur and Thomas answer within their own knowledge and remember relevant encounters; the player can ask meaningful follow-ups.
- **Scope:** Data-driven authored topics and permitted response variants for the approved statements; unknown-topic clarification; repeated-topic handling. Keep deterministic adapters; background characters need no model service.
- **Reuse:** Async responder boundary, conversation UI, testimony discovery, existing accusation event and save pipeline.
- **New components/data:** NPC profiles, topic definitions, source-attributed statement IDs, a few durable observed/topic events; generalize receptionist-specific account/room routing. New durable fields migrate in this milestone.
- **Dependencies:** M1–M2; approved character knowledge/lie matrix and exact claims. Daniel profile can be prepared but encountered in M4.
- **Acceptance criteria:** Arthur cannot reveal Evelyn's role; Evelyn cannot react to private discoveries; a revised account retains its predecessor; repeat questions do not duplicate evidence; no contradiction automatically forces confession. Naming Arthur preserves existing receptionist memory.
- **Relevant tests:** Per-NPC context isolation, observed-versus-hidden triggers, speaker provenance, repeated topics after reload, memory migration/deduplication, hostile response with independent routes still available.

## M4 — Physical investigation and locating Daniel

- **Objective:** Find Daniel through either physical evidence or an independently obtained conversational lead.
- **Scope:** E1/E5 and approved room/lobby context; L1/L2 from the chapter design; one small refuge encounter with actual identity confirmation. Reuse existing hotel geometry and use explicit travel presentation before building streets. Preserve E2/E3/E4 record meanings.
- **Reuse:** `hotel.ts` content pattern, examine/talk interactions, named-entry transitions, spatial validation, notebook, character renderer and M3 topics.
- **New components/data:** Approved suitcase/register/directory records, refuge location/entries, Daniel topic profile and `Daniel located` encounter state; content validation and migrations as necessary.
- **Dependencies:** M3 and approval of the refuge/address/receipt rationale. No criminal confession or Evelyn revelation required.
- **Acceptance criteria:** Each locate path works with the other bypassed; Arthur can be uncooperative without blocking L1; arriving early at the correct address works; a receipt alone does not mark Daniel found; every new transition has a safe return; no accepted-case or clue-count gate spawns evidence.
- **Relevant tests:** Route fixtures with excluded clues, no-case exploration, named return spawns, identity confirmation versus mere lead discovery, old-record preservation, repeat visits, input and V2 visual regression smoke checks.

## M5 — Complete Outcome A end to end

- **Objective:** A first complete playable assignment: locate, deliberately report, get paid, and later read the tragic consequence.
- **Scope:** Confirmed location report, one payment marker (no economy), contract disposition, one progression event, authored next-morning/newspaper beat and casebook update.
- **Reuse:** M1 casebook, M2 confirmation/atomic commit, M4 locate state, persistence and existing examine interactions.
- **New components/data:** Primary disposition and scheduled/learned consequence state, idempotent report/payment event, newspaper record.
- **Dependencies:** M4; approved disclosure preview and consequence timing. No C exposure evidence required.
- **Acceptance criteria:** A works without learning Evelyn's role; cancelling reveals nothing; payment and credit apply once; later death appends without changing contract success; reload between reporting and news preserves causality. No moral grade or spoiler warning reveals the hidden murderer.
- **Relevant tests:** Minimal A route, no-Evelyn-knowledge fixture, report retries, interrupted save/reload, news before/after trigger, hidden versus learned consequence selectors, rejection of contradictory second primary resolutions.

## M6 — Complete Outcome B

- **Objective:** Deliberately protect Daniel and close the assignment without telling Evelyn where he is.
- **Scope:** Approved private safety agreement, non-disclosing client report, survival consequence and suspicious response based only on information Evelyn receives.
- **Reuse:** M2 confirmation, M3 NPC knowledge contexts, M4 encounter, M5 disposition/consequence infrastructure.
- **New components/data:** Protection commitment/completion events, recipient-scoped disclosures and B response variants. Do not add trust scores or a paid travel resource gate.
- **Dependencies:** M5 infrastructure; approval of the safety arrangement, B payment policy and post-resolution disclosure limits.
- **Acceptance criteria:** Refusal alone does not resolve; Daniel need not confess or give police evidence; no prior A disclosure can be overwritten by B; Evelyn lacks proof of the private arrangement; the survival commitment persists; blocked post-B disclosure is clearly explained, never secretly delivered.
- **Relevant tests:** Partial versus completed protection, consent without criminal testimony, context redaction, A/B mutual exclusion, post-B free-text disclosure attempts, reload at each commitment boundary.

## M7 — Complete Outcome C without Daniel

- **Objective:** Expose the operation through independent records and a deliberate police submission.
- **Scope:** Approved E7–E10 network, source comparison/selection in the casebook, a compact police contact presentation, accepted packet and legal epilogue. Preserve free-form questioning; no automatic contradiction labels.
- **Reuse:** Object inspection, M3 testimony/profile boundaries, M2 action confirmation, M5 consequence/credit model and casebook.
- **New components/data:** Explicit authored serial/date/batch relationships, packet validation, police acknowledgment and learned legal outcome. These are narrow case rules, not a universal inference engine.
- **Dependencies:** M3 and M5 infrastructure; approval of evidence contents/provenance and legal presentation. M4's Daniel encounter is not a runtime prerequisite.
- **Acceptance criteria:** E8/E9/E10 permit C when Daniel is never found and E7 is absent; optional testimony can corroborate but never be mandatory; collecting the packet alone does not resolve; incomplete submission leaves investigation open without revealing missing hidden clues; Evelyn ultimately avoids conviction as authored.
- **Relevant tests:** Independent-source complete packet, all-physical/no-Daniel route, optional-ledger route, invalid/mismatched serials or chronology, submission cancellation, duplicate credit, no hidden refuge/fate in C casebook.

## M8 — Withdrawal with recovery

**Unapproved:** the checkpoint details below retain the original proposal for comparison. They are not the selected implementation. The current preference is in-world reopening; redesign this milestone after the recovery policy is approved. No M8 functionality is part of M1.

- **Objective:** End the assignment as unresolved without payment, hidden reveals, or an unavoidable progression trap.
- **Scope:** Confirm D, Evelyn's public response, retained records/memories, protected whole-session pre-withdrawal checkpoint and explicit rewind. In-world reopening is preferred long term; checkpoint rewind has not been approved.
- **Reuse:** Case state/history, M2 confirmation, versioned saves, modal warnings and content selectors.
- **New components/data:** Checkpoint envelope excluding nested checkpoints, atomic restore path, withdrawn assignment entry. Keep checkpoint until explicit replacement/restore; handle failed storage before promising recovery.
- **Dependencies:** M1–M2; approved recovery policy. Integrate with M5–M7 to reject withdrawal after a primary resolution and prevent unintended payments/credits.
- **Acceptance criteria:** D reveals neither Daniel's fate nor Evelyn's motives; no credit/payment; records survive; exploration continues; recoverable pre-D state survives reload; quota failure cannot create a false recovery promise; rewind restores the whole causal state. Required later progression cannot depend on an irreversibly withdrawn case.
- **Relevant tests:** Early/late D, D after finding Daniel without reporting, no spoilers in response/save selectors, checkpoint round-trip, storage failure, rewind all state, duplicate withdrawal, closed-case rejection. Test restarting from a checkpoint as distinct from in-world reopening.

## M9 — Chapter/demo assembly and progression audit

- **Objective:** Deliver the complete authored Chapter 1 experience and a viable path into the persistent full game.
- **Scope:** Opening/conclusion pacing, casebook disposition summaries, chapter definitions and progression eligibility, explicit demo boundary, shared content IDs, versioned save export/import prototype. Add a compact office only if the panel-based opening proves insufficient; final art remains outside this scope.
- **Reuse:** M1–M8, four hotel spaces, simple refuge, runtime/save adapter and named world entries.
- **New components/data:** Minimal chapter/content catalog, stable earned-unlock records, transfer envelope and migration fixtures. No payments, storefront, entitlement enforcement or AI service.
- **Dependencies:** All four outcomes playable; provisional chapter-access policy and prototype withdrawal recovery approved. Production all-cases gates remain blocked until actual reopening/alternate resolution is designed.
- **Acceptance criteria:** A/B/C each grant exactly one credit; D grants none; no fixed chapter count; a changed selected chapter resets no world state; demo cannot travel into absent content; compatible demo saves transfer without losses; full-only data is never silently discarded in a demo load. Player can return to available neighborhood spaces after conclusion.
- **Relevant tests:** Four-outcome journey matrix, duplicate/newspaper updates, cyclic/unreachable prerequisites, already-unlocked access retention, second fixture case, demo/full import compatibility, missing-content handling, full keyboard/reload playthrough with API unavailable.

## Verification and scope discipline

For each approved gameplay milestone run:

- `node --test tests/*.test.mjs`
- `./node_modules/.bin/tsc --noEmit -p tsconfig.json`
- `npm run build-nolog`

Add pure rule tests with authored fixtures, migration round trips and browser checks for controls, focus, input isolation, autosave and scene transitions. Preserve the existing animation and exploration regression coverage. Do not add tests that merely restate configuration; test causal behavior and failed actions. Retain known template warnings/configuration unless a task requires addressing them.

The first complete case is M1–M8, with minimal contact/travel presentations and the refuge. M5 supplies the earliest end-to-end playable resolution for feedback; it is not a claim that the other approved outcomes are optional. M9 makes the assembled chapter/demo ready for broader evaluation. No AI integration, city simulation, gambling, combat, numerical relationships, inventory economy, final character artwork or purchasing is on the critical path.

Planning checks performed before delivery: distinguish established facts/proposals/implementation; map every major lie to independently accessible evidence; trace L1/L2/X to A/B/C and a deliberate path to D; audit the D/final-chapter trap, A/B conflicts, private NPC knowledge, record continuity and save migration requirements. These are design reachability checks, not executed outcome tests. Implementation must wait for approval.
