# Dead End — Game Design

Planning baseline: November 15, 2026; updated for the approved M1 and M2 implementations. Later planned systems remain unimplemented. Read with [Chapter 1](chapter-1-bellweather.md), the [implementation plan](chapter-1-implementation-plan.md), the approved [investigation and casebook principles](investigation-design.md), existing [architecture](architecture.md), and [contributor instructions](../AGENTS.md).

## Status and decision authority

- **Established direction:** requirements supplied in the Chapter 1 planning brief, including its mystery and four outcomes. They supersede the former prototype's absence of story canon.
- **Implemented:** the exploration/free-form conversation baseline from `main` at `4d5efea`, plus M1 case acceptance and M2 action confirmation on `feat/chapter-1-foundation`. These are explicitly identified below.
- **Proposed:** implementation choices, connective story details, locations beyond the hotel, and pacing. These require review before gameplay implementation.
- **Open:** decisions without an agreed answer. A proposed answer is not approval.

The planning documents retain the future chapter proposal. `architecture.md` records the implemented contracts. M1, M2, and the limited M3 NPC foundation are implemented; M4 and later remain unapproved for implementation. Proposed evidence placement, detailed NPC lies, and withdrawal checkpoints remain open. The long-term preference is in-world case reopening rather than save rewind.

## Concept and tone

Dead End is a chapter-based, single-player detective RPG set in a fictional American city in the late 1940s. The detective has a fixed identity, appearance, history, and personality: a flawed, somewhat sarcastic private investigator with an established life in the city. His name, specific biography, city name, exact year, and mature-content boundaries remain open. Do not replace the approved character with a player-created avatar.

The player determines his investigations, actions, relationships, and decisions. His voice can shape delivery, but must preserve what the player actually means. A cautious question must not become an accusation; a refusal must not become consent; sarcasm must not silently disclose confidential information. Show consequential interpretations for explicit confirmation.

The world combines serious mysteries with dry humor and memorable human eccentrics. Classic noir cinema informs danger and moral ambiguity; *Who Framed Roger Rabbit* informs comic timing and colorful personalities; *Cuphead* informs expressive staging. These are influences, not licenses for supernatural explanations or cartoon-world physics. The approved Simplified Detective V2 is a stylized human design within a grounded setting.

## Persistent neighborhood, structured chapters

Use a small, dense neighborhood that can expand over time. The broad progression reference is *The Simpsons: Hit & Run*: structured chapters within reusable places and accessible exploration. This does not imply driving, its mission structure, or a GTA-scale city.

Chapters advance the larger narrative and can add places, people, and activities. Existing locations remain reusable; authored events may alter access with a believable cause. NPCs can recur and retain significant memories. Changing chapters does not reset discoveries, personal relationships, or consequences. Players can spend time outside investigations speaking to people and exploring.

Potential recurring places include the office, apartment, diner, police station, and Bellweather Hotel. Only the hotel's four spaces exist today. These other places are candidates, not an instruction to build five environments for Chapter 1. Prefer a compact office, the current hotel, and one modest refuge interior for the proposed chapter; use explicit travel between addresses until a street is justified.

## Exploration and spatial rules

- Preserve direct WASD/arrow movement, side view with shallow vertical floor depth, and proximity interaction with E. Optional mouse world actions must use the same proximity validation; no point-and-click movement or remote evidence collection.
- Rooms use logical connections, named arrival points, consistent floor levels, and reversible entrances. Bellweather Room 407 remains on the fourth floor; stair travel abbreviates three flights past floors two and three.
- Evidence exists independently of accepting a job. Discoveries made before acceptance remain available and can later be associated with a case. A case does not own or spawn its clues.
- Access depends on the world, not an invisible accepted-mission flag. The current unlocked Room 407 remains inspectable without speaking to a client; any later restriction requires a new authored explanation and an alternate investigative route.
- Blocking conversation/casebook UI suppresses world input. Text editing must not trigger movement or shortcuts. Keep Enter to submit, Shift+Enter for a newline, Escape to exit, and Tab for the notebook outside conversation.
- Period-appropriate names may contain subtle noir references, but should work without recognizing them. New proper names and addresses in Chapter 1 are marked proposals.

## Chapters, cases, and progression

A **chapter** is a narrative/content grouping; a **case** is an investigation with an assignment, records, actions, and disposition. A chapter may contain a major case, optional jobs, and activities. Chapter 1 initially concentrates on Case 001 — The Guest in Room 407. Do not build a single global `activeCase` model that prevents simultaneous investigations later.

The provisional commercial/progression outline is five chapters, with Chapter 1 a free demo and Chapters 1 and 2 initially accessible in the full game. Subsequent chapters unlock through major investigations; the final chapter may require resolving all major investigations. Neither the chapter count nor these unlock thresholds is final. Keep prerequisites data-driven and distinguish ownership, narrative eligibility, and currently selected chapter.

Progression comes from solving or meaningfully resolving investigations, not experience points or skill levels. The player's growing knowledge, reputation, relationships, access, and choices carry development. Do not add skills that automatically detect clues, identify lies, or solve contradictions.

For Case 001, A (contract fulfilled), B (Daniel protected), and C (operation exposed) each grant one durable progression credit. D (withdrawn/unresolved) grants none. Later tragic news does not remove A's credit or relabel it a failed assignment. Repeated callbacks, chapter visits, and case reopening cannot duplicate credit. No morality grade is displayed.

**Proposed progression safeguards:** already earned chapter access is not revoked; only authored resolution events grant credit; case dependencies must be checked for cycles and unreachable states. If a final chapter requires every major case, every unresolved required case must have a reachable reopening or alternate meaningful-resolution route. Opening Chapter 2 does not by itself fix withdrawal blocking a later all-cases gate.

## Casebook, assignments, and consequences

M1 implements available and active assignments alongside global field notes, with an explicit Evelyn contact request and one timestamped acceptance event per case. Deferring leaves the offer available and returns to exploration. Reading or accepting the offer does not add evidence, interpret clues or start a resolution. The request is client testimony, not verified fact. M2 adds an explicit confirmation after selecting Accept: Cancel leaves the offer unchanged, while Confirm records acceptance once. Pending decisions are not saved.

For later milestones, evolve the casebook further. Retain a general field-notes view alongside active, withdrawn, and completed/resolved investigations. Players see observations, witness accounts and sources, relevant people, alleged event times, their own interpretations, assignment history, final disposition, and later learned consequences. Do not expose undiscovered case associations or hidden solutions through headings or record counts.

Keep three concepts separate:

| Concept | Proposed responsibility | Case 001 example |
| --- | --- | --- |
| Assignment status | Offered, active, withdrawn, closed; acceptance/withdrawal history | A closed paid contract; D withdrawn without payment |
| Investigation disposition | Unresolved, contract fulfilled, protected, exposed | B can be resolved while the client's original demand is refused |
| World consequences and learned updates | Events that occurred versus events the detective has learned | Daniel's murder after A exists before the newspaper entry is read |

The casebook is derived from authoritative state, not a second mutable evidence database. Physical possession, observation, testimony, verification, and deduction remain separate. A repeated observation does not duplicate a record; a revised witness account uses a new record and retains the original. Device recording time is not in-world event time. Estimates and uncertainty stay explicit. A theory is not automatically true.

The interface can let players compare records or cite supporting sources, but must not identify lies, label correct clue pairings, supply the next action, or confirm the culprit. Rule evaluation for an authored action is not an automatic deduction announcement.

### Withdrawal and reopening

Withdrawal is a deliberate confirmed action ending the current assignment without solving it. It preserves knowledge and NPC memories; it reveals no hidden fate. Reopening is a long-term capability dependent on story circumstances, distinct from starting a blank investigation.

For a prototype that defers reopening, **propose a protected whole-session checkpoint before withdrawal**, with a clear “Return to before withdrawal” option. This is a rewind, not an in-world reopening; subsequent actions are rolled back with it. Keep exploring after D is also allowed, without resolution credit or an automatic fate reveal. The player must understand both choices before confirming withdrawal. Do not silently reset a case, erase only selected consequences, or make restarting the entire game the sole recovery path.

This checkpoint policy is an unapproved alternative, not an implementation requirement. The long-term preference is in-world reopening; choose the recovery design before implementing D. A release with mandatory later case gates must implement actual reactivation/alternate resolution or revise those gates. A warning alone is not a remedy for an unavoidable progression trap.

## NPCs and free-form conversation

The [NPC conversation design](dead-end-npc-conversation-design.md) records the established long-term contract: players speak in their own words, NPCs respond to meaning and context, and authored case facts remain authoritative. The M3 boundary described below is the current limited implementation of that design.

**M3 prototype boundary:** arbitrary text may be typed, but only a small, authored whole-message topic grammar reaches an NPC. It recognizes several paraphrases and follow-ups. Unknown or potentially consequential messages remain private and prompt clarification before any NPC context update. Authored disclosure routing is tested with noncanonical fixtures only; no live reporting or other future case action is available. The existing exact accusation-memory demonstration is preserved. This is not unrestricted natural-language understanding.

The prototype also recognizes limited whole-question patterns for existing authored topics. Pronoun follow-ups rely on the active topic of the current conversation; Arthur's replies about a person's destination or possible belongings explicitly avoid claiming facts he has not established. This context is transient and never authorizes a disclosure.

Important NPCs accept typed questions and statements. Their authored profiles distinguish facts known personally, beliefs, uncertainty, motivations, relationships, intentional lies, and observations of the detective. They may lie, evade, misunderstand, or misremember. They recognize meaningful follow-ups and repeated topics, without automatically confessing when contradicted. Background characters may remain entirely scripted.

Persist significant events and authored topic history rather than every chat message. An NPC can react only to information they observed, were told, or learned through a defined communication event. Evelyn cannot detect that the player read a document in Room 407 merely because a global discovery flag changed. No numerical trust/relationship simulation is required for the first case.

Kane does not introduce himself automatically. A durable contact records the first encounter and explicit, independent disclosures of his name, private-investigator occupation, or former police background to that NPC. A player statement is remembered as something Kane claimed, not automatically verified. Evelyn's established hiring relationship supplies prior knowledge of Kane's name and occupation; Arthur and Thomas Bell have no such default knowledge. Kane's knowledge of an NPC's identity remains separate. The current offline grammar accepts only a few exact self-disclosure forms; broader social intent is future work.

Keep story authority in deterministic TypeScript rules. An eventual AI service may phrase allowed replies and propose interpretations for validation; it cannot invent canon, grant evidence, establish guilt, accept a job, disclose a hiding place, or trigger irreversible consequences on its own. Never send the complete solution to every NPC. Deception is authored, not an AI hallucination treated as a new plot twist.

**Proposed consequential-action flow:** ordinary typed dialogue continues freely. A recognized request to accept, report, protect, expose, or withdraw opens a concise action preview; the player confirms or cancels. Use explicit action controls as an accessible fallback so success never requires guessing one exact phrase. These controls confirm world mutations, not predefined dialogue menus. The preview identifies recipient, information being disclosed, and the immediate commitment; it does not reveal an unknown future murder. Ambiguous language requests clarification rather than performing an action.

## Current implementation — not the finished chapter

Inspected November 15, 2026:

| Implemented | Limits |
| --- | --- |
| Phaser 4.0.0 / React 19.1.0 / TypeScript 5.7.3 / Vite 6.3.2 | Existing scaffold and configuration retained; no new engine or state library proposed |
| Four connected hotel spaces plus a staggered placeholder exterior neighborhood; the playable Bellweather lobby uses approved illustrated scenery, E-style Kane, static Option B Arthur, desk/stair collision, and safe arrivals. Other interiors retain Detective V2 and procedural scenery | No full town, office, refuge, inventory, mutable locks, or NPC schedules; chair, table, plant, and post footprints remain inactive or deferred |
| Authored Arthur/Thomas/Evelyn profiles, mock adapter and M2 pre-dispatch gate | Arthur is the only physically accessible NPC; supported topic paraphrases and follow-ups work, while unsupported wording stays private. No general language understanding or AI provider |
| Typed first-accusation memory | Whole “I accuse you” / “I accuse the receptionist” statement only, normalized whitespace/case, optional final `.` or `!`; criticism, questions and longer accusations do not match |
| Conversation input/focus isolation, pending/error handling, late-reply guard | Transcript capped at 80 lines and cleared on exit/reload; message limit 2,000 characters; typed topic/statement and limited irritation memory persists |
| Three Room 407 observations plus one attributed receptionist account | No suitcase, register, ledger, theory comparison, verified-fact graph, or outcomes |
| Public Evelyn offer, explicit accept/defer, stable case-state map, timestamped acceptance history | One shipped assignment; no withdrawal, reopening, resolution, payment, or chapter unlocking |
| Local save schema v6, content revision `bellweather-3`, v1–v5 and historical lobby-layout migration, independent investigations with one autosave and three manual slots each | Saves hold player, discoveries, NPC memories, separate identity knowledge, per-NPC contacts/disclosures, and cases; no chapter state, conversation transcript persistence, export/import or cross-device recovery |
| Automated tests across actions, cases, exploration, conversation, NPC knowledge and animation | Action propose/confirm/cancel, disclosure fixtures, case commands, discovery independence, migration, persistence and input policy are covered; future outcomes/progression remain unimplemented |

Normal movement checkpoints every two seconds; meaningful state changes also save. The title screen opens, creates or continues investigations; the in-game pause menu saves, loads, restarts with confirmation, or returns to title. Restart resets the active autosave without deleting its three manual slots. Storage remains browser-origin `localStorage`; the historical single-slot key `dead-end.bellweather.v1` is imported once and preserved. Schema version remains inside each game snapshot. Case knowledge must remain separate from generated conversation text as the model expands.

## Commercial model and content boundaries

Established intent: a free Chapter 1 demo and a complete paid game. One purchase includes all included chapters; later access is unlocked through play, not separate chapter purchases. This task designs neither a storefront nor entitlement enforcement, DRM, payments, accounts, or backend services.

Propose shared stable IDs and shared core rules for demo/full builds, with a content catalog describing which chapters are shipped in each build. A build's installed content, purchase ownership, and a save's progression are distinct inputs. Demo worlds should end at an explicit travel boundary, not a broken portal into absent content. Exclude paid chapter payloads from the demo build rather than merely hiding their buttons. Do not promise that client-side bundled secrets are tamper-proof.

Demo-to-full continuity is an architectural target: preserve discoveries, NPC events, decisions, dispositions, and checkpoints. Browser localStorage is origin-specific and cannot automatically transfer to a desktop distribution or another domain. Plan a versioned export/import or equivalent platform transfer, validate references against the appropriate content catalog, and preserve unsupported data. Do not load a full-game save into a smaller demo by silently deleting unknown cases or moving the player arbitrarily; reject it with a useful explanation or support an explicitly designed subset view later.

## AI operating-cost constraints

A one-time purchase does not fund unlimited recurring conversations by assumption. The deterministic authored fallback must support the complete investigation, including all four outcomes, without a paid service. Critical evidence and resolution must never depend on an API being available or a conversation allowance remaining.

Before selecting a service, measure turns per player, context size, output length, retries, repeat visits and long-term play. A provider-neutral budgeting model is:

`conversation cost = turns × ((average input tokens × input rate) + (average output tokens × output rate)) / rate unit + retry costs + supporting-service costs`

Rates and the rate unit must come from the selected provider at evaluation time; no live prices or provider commitments are assumed here. Include context growth, moderation/validation calls if used, hosting, storage, bandwidth, monitoring, abuse, failed requests, demo users who never purchase, and ongoing users after sales decline. Separate demo usage from paid-user lifetime usage. Model a typical player and heavy/repeated use, not only average chapter completion.

Possible controls to review later: short bounded context, structured memory summaries, cached non-sensitive authored replies, per-session/account budgets, request throttling, and a transparent switch to authored responses. Free-form input stays usable in fallback mode. Budget limits must not become purchases for individual chapters or a hidden charge for solving a case. A local model avoids per-request hosted fees but introduces hardware, distribution, quality and support costs; it is not presumed free or suitable.

No provider is selected. A hosted implementation would keep credentials on a server, constrain context to permitted NPC knowledge, validate outputs, set timeouts/cancellation, and define privacy/retention rules for player text. Approval of an AI quality target, realistic lifetime budget, and service-retirement/offline policy is a release decision, not part of this implementation plan's critical path.

## Review decisions

1. Approve the proposed Chapter 1 timeline, refuge, evidence provenance, and NPC lie boundaries in the chapter document.
2. Approve what qualifies as deliberate protection for B and how the player confirms disclosures without spoiler warnings.
3. Approve withdrawal recovery for the prototype; resolve reopening versus mandatory late-game gates before release.
4. Confirm the commercial chapter-access outline; do not encode a five-chapter count or fixed unlock threshold yet.
5. Set the detective's fixed identity, city, exact year, and thematic boundaries before final dialogue and art.
6. Approve eventual AI budgets and fallback policy only after the authored case works end to end.
