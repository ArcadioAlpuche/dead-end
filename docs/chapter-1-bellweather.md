# Chapter 1 — The Guest in Room 407

**Author-facing spoilers.** Planning only. The player-facing casebook must not receive this document's hidden truth. See the [game design](game-design.md) for world rules and the [implementation plan](chapter-1-implementation-plan.md) for technical milestones.

## Established decisions and proposed connective details

The following facts and outcomes are **established by the user’s Chapter 1 brief**, not inferred from the current prototype:

- Case 001 concerns Evelyn Mercer's missing brother, Daniel Mercer, who stayed at the Bellweather Hotel, contacted her while apparently frightened, and disappeared. Staff say he checked out, but his belongings remain.
- Daniel is alive and hiding. He participated in a stolen-valuables operation coordinated through the hotel, maintained financial records, and attempted to leave as the operation became more dangerous.
- Evelyn helps direct the operation. Her concern is a persuasive cover for wanting to locate Daniel. The detective does not initially know her involvement.
- Arthur Finch is the anxious receptionist who misleads the detective about Daniel's departure; Thomas Bell is the involved night porter who knows more and wants to obstruct discovery.
- Outcomes A–D and their consequences/progression treatment are fixed as described below. Exposing the operation cannot require Daniel's cooperation.

**Everything below that supplies a date, address, document content, hiding method, exact lie, supporting incident, or encounter sequence is a proposal for approval.** Stable evidence labels in this document are planning references, not existing code IDs unless identified as such. No new proper name beyond those in the brief becomes canon through this document.

## Experience and minimal geography

Introduce the detective through what he does: examines his surroundings, listens skeptically, asks his own questions, and accepts responsibility for choices. Avoid a biography lecture or a tutorial that reveals the solution. Target one substantial investigation; measure duration in playtests rather than requiring a fixed number of hours or conversations.

**Proposed chapter opening:** one compact office room. Evelyn visits and offers a fixed fee to locate Daniel and report his whereabouts. The player may ask questions, explicitly accept, defer, or leave to explore. Agree the fee amount later; the first slice can record whether a fee is owed/paid without implementing a shop economy. Evelyn does not demand recovery of a ledger in her public contract.

For the first case prototype, present the offer through a small office/contact panel before making the office a walkable environment. Travel to the hotel's established lobby entrance through a named address/travel action. Keep this presentation honest: elapsed travel is abbreviated, not a door pretending the office is next to Room 407. Office, apartment, diner, and police interiors are not all prerequisites.

Reuse the hotel lobby, staircase, fourth-floor hallway, and Room 407 unchanged in topology. Add document interactions to existing furniture and a porter interaction in the lobby/landing. Proposed register, correspondence tray and porter dispatch drawer need simple inspectable representations, not a new hotel wing or an inventory physics system.

**Proposed refuge:** a disused rear room above a repair workshop at **18 Calder Lane**, a working address pending approval. It is outside the hotel's operation. Daniel arranged temporary use before fleeing; it is not a secret hotel room Thomas somehow overlooked. Only one simple refuge interior is required. Entry is a knock/conversation, not a magic clue-count lock. The publicly knowable address may be visited early; correctly finding Daniel there must work even if the player did not follow an expected route.

Office contact, travel, police delivery and newspaper reading can initially use small React presentations tied to named world interactions. Preserve the impression of a connected neighborhood without building a street simulation. A subsequent chapter returns to this persistent world with saved consequences; it is not a reset to a mission-selection lobby.

## Proposed timeline

Day 0 is the day Evelyn approaches the detective. Times are author-relative; final calendar dates remain open. The prototype's device-clock discovery timestamps are not this timeline.

| When | Proposed event | Who can know it, and what remains uncertain to the detective |
| --- | --- | --- |
| Months before Day 0 | Stolen valuables pass through hotel consignments. Evelyn coordinates destinations and proceeds; Thomas handles parcels; Daniel maintains accounts. | These three know their own roles. Arthur handles front-desk paperwork without a full view of the operation. |
| Two weeks before | Daniel notices escalating intimidation associated with the operation and begins making a private financial copy. | Daniel knows why he is worried; the precise dangerous incident is deliberately left unauthored. No extra murder is implied. |
| Several days before | Daniel arranges temporary use of the Calder Lane rear room, using an ordinary repair/storage receipt as his contact record. | Daniel knows the arrangement. Evelyn and Thomas do not know his refuge. The receipt remains among his hotel belongings. |
| Day −1, early evening | Daniel contacts Evelyn, frightened, and indicates he wants out. He does not disclose a destination. | Evelyn knows this was an internal rupture; the detective initially hears only her worried-sister account. |
| Day −1, late evening | Thomas leaves Daniel the existing folded note: “After the last set. Come alone.” It refers to the hotel's evening music, not a new nightclub level. | Thomas and Daniel know its purpose: a private conversation about Daniel leaving. The unsigned note alone does not prove authorship or that a meeting happened. |
| Day −1, around midnight | Daniel leaves Room 407 carrying a coat, avoids the planned conversation, and exits the hotel. His suitcase and copied financial pages remain behind. | Arthur sees someone descend with a coat, but not their room of origin. Keep the existing account's uncertainty; do not retroactively turn it into positive identification. |
| After Daniel leaves | Thomas asks Arthur to mark Daniel checked out and repeat that the departure was routine. A dispatch paper and register entry give an earlier checkout time. | Arthur knows he did not witness payment/signature. Thomas knows the record is a cover; neither knows Daniel's hiding place. |
| Day 0, morning | Daniel reaches/settles into the arranged refuge. Thomas informs Evelyn that Daniel is gone. Evelyn engages an outsider who can inquire without advertising their criminal interest. | Evelyn knows Daniel is a risk. Her using a detective is a calculated risk, not proof she is unaware of him. |
| Day 0 onward, player-directed | Detective accepts or defers, explores, questions and follows leads in any order. | No invisible timed murder while the player reads, explores, or delays acceptance. |
| After confirmed resolution | Apply the appropriate authored consequence sequence below. | Consequences are revealed only through channels available to the detective. |

**Continuity rationale, proposed:** the hotel calls 407 “vacant” administratively because of the false checkout. It has not been cleared for a new guest; “unlocked for inspection” remains compatible with belongings left behind. Thomas believes Daniel took the important accounts and overlooks a concealed copy. Evelyn expects an apparently ordinary missing-person inquiry to find Daniel faster than her own conspicuous associates. These explanations must be conveyed through discoverable context, not assumed by the player.

Arthur's introductory room-access statement need not be a deliberate lie; his later claim of an ordinary completed checkout is separate. Preserve the old account about an unidentified person as its own record. Do not edit it into a newly invented signed-checkout assertion.

## Character knowledge, beliefs and reactions

Exact wording remains to be authored. All proposed reactions require an observed event or disclosed information; no NPC reads the detective's hidden knowledge state.

| Character | Knowledge and beliefs | Motivation and relationships | Proposed deliberate deception | Possible observable reactions |
| --- | --- | --- | --- | --- |
| **Evelyn Mercer** | Knows the operation, Daniel's financial role, his frightened contact and decision to leave. Does not know his refuge, what copies survive, or what the detective has found unless told. Believes a professional will prioritize the paid assignment. | Wants Daniel located and the operation protected; uses sibling concern as cover. Directs Thomas's work; sees Daniel as both brother and liability. Potential recurring antagonist. | Claims her interest is solely familial and denies involvement in hotel consignments. Concern need not be wholly feigned, but does not replace her operational motive. | Repeated delays or refusal to report can cause suspicion. Receipt of Daniel's location leads to A. A confirmed refusal with no disclosure leads to B's public response. Being shown a dispatch instruction makes her evasive, not automatically confessional. Police inquiry, not the player's private discovery, informs her of C. |
| **Daniel Mercer** | Knows his own accounts, Evelyn's role, Thomas's handling of parcels, and his refuge. Knows he fled; cannot know every later hotel conversation or what Evelyn told the detective. May incorrectly believe all useful records are now out of reach. | Wants to survive and escape involvement; fears both Evelyn and prosecution. Relationship to Evelyn combines family history and criminal dependence. | Minimizes his role as incidental clerical work, not active participation in payment allocation. He can refuse a statement without preventing C. | Acknowledges identity sufficiently for a genuine locate action; may withhold criminal detail. Warns against reporting him if asked about safety. Can accept a private safety arrangement without giving police testimony. Accusations may make him defensive, not force a confession. |
| **Arthur Finch** | Knows the desk procedures, left belongings, Thomas's instruction and what he actually saw. Does not know Evelyn's leadership or Daniel's refuge as a confirmed fact. Has only an overheard address fragment. Believes contradicting Thomas could cost him his job or safety. | Wants the problem to disappear and to protect himself. Subordinate to the hotel's pressure, wary of Thomas, uncertain whom to trust. | Describes an ordinary completed checkout despite not seeing Daniel sign or settle; may claim Daniel took his luggage. Distinguish this from his truthful but uncertain midnight sighting. | Register/suitcase questions expose gaps. Calm follow-up can produce the address fragment; accusations yield remembered defensiveness and a narrower account. Hostility cannot permanently remove the independent physical route. He cannot reveal Evelyn's role merely because pressed. |
| **Thomas Bell** | Knows parcel handling, the fabricated checkout and the note he left; knows Evelyn directs consignments. Knows Daniel vanished, not where. Does not know a hidden duplicate ledger survived until informed or he observes its discovery. | Wants to preserve income and avoid implication. Works with Evelyn; pressures Arthur; regards Daniel as a dangerous loose end. | Denies handling the relevant consignments and claims his dealings with Daniel were ordinary hotel service. | Challenges interpretation of paperwork, offers partial explanations, and remembers accusations. Does not automatically confess or destroy all evidence when a discovery flag changes. Any later obstruction must have an explicit observed trigger and preserved alternate evidence route. |

A later NPC model should separate intentional lies from mistaken beliefs. Arthur's uncertainty about a person at midnight is not proof he is lying about that observation. Repetition alone changes neither accuracy nor verification.

## Evidence network and limits

The following is the proposed content contract. Important records remain physically discoverable before accepting Case 001. Case associations are added only when their relevance is known; finding a record never automatically resolves the case.

| Planning reference | Source and access | Supports / connects to | Does not establish |
| --- | --- | --- | --- |
| **E1 Suitcase and receipt — new** | Room 407, visible luggage. Personal effects identify Daniel; an inspectable repair/storage receipt gives 18 Calder Lane and the rear-room contact. | Belongings remained; concrete independent refuge lead; challenges “took all luggage.” | That he was abducted, never checked out, or is currently at the address. A receipt is a lead, not proof of his present location. |
| **E2 Folded note — existing `folded-note`** | Existing writing table; preserve exact unsigned/undated text. Proposed lobby music notice explains “last set.” | A possible intended meeting. Thomas's matching dispatch handwriting may support authorship; a claim still requires corroboration. | Sender, recipient, meeting, or crime by itself. It is an optional contextual lead, not the only way to find Daniel. |
| **E3 Champagne glass — existing `champagne-glass`** | Existing table; dark red rim mark and residual liquid. | A concrete observation and conversation subject; atmosphere and restraint in inference. | Poison, blood, a particular drinker, Evelyn's presence, or two people in the room. No chemical test is required for resolution. |
| **E4 Undisturbed bed — existing `undisturbed-bed`** | Existing bed. | Current room condition; prompts questions about departure. | Whether anyone previously slept there, or an exact departure time. It is not a required clue token. |
| **E5 Hotel register and settlement stub — new** | Inspectable lobby desk documents. Proposed checkout entry lacks Daniel's signature; settlement stub is marked pending and contradicts the claimed paid departure. | Challenges Arthur's claim of a witnessed completed checkout; supplies a chronology discrepancy. | The register's time as verified truth, or Evelyn's involvement. Documents may themselves be false. |
| **E6 Arthur's accounts — existing plus new** | Existing `receptionist-account` remains unchanged. Separate new claims for routine checkout, Thomas's instruction, and overheard “rear room on Calder Lane.” | Human account of the departure and a second refuge lead. Printed neighborhood directory at reception resolves the address fragment. | Positive identification of the midnight figure or knowledge of the operation's leadership. |
| **E7 Financial copy — new** | Concealed but directly examinable shallow drawer in Room 407; no accepted-case prerequisite or randomized code. | Entries identify Daniel's payment-allocation role and batch references also found in dispatch records. Corroborates the operation; challenges Daniel minimizing his role. | Authenticity of every entry, a confession, or Evelyn's guilt solely because an initial appears. Daniel's cooperation is unnecessary to find it. |
| **E8 Carrier duplicate — new** | Lobby correspondence tray, kept for routine billing. A carrier-origin receipt names Thomas as handover contact, lists item serials/batch IDs and hotel pickup. | Independent business record of physical handling; contradicts Thomas's denial; links to E7 and E9. | That every hotel parcel was stolen, or Evelyn's role on its own. |
| **E9 Public stolen-property notice — new** | Newspaper/notice board in lobby, available independently of police cooperation. Lists identifying serials and loss dates preceding the hotel dispatch. | External corroboration of stolen origin when matched to E8, rather than several NPCs repeating one rumor. | Who stole the goods, or a complete criminal chain without handling records. |
| **E10 Dispatch instructions — new** | Porter dispatch drawer in lobby/landing; addressed to Thomas, signed by Evelyn, with destination and batch references matching E8. Documents accessible without confession. | Evidence of Evelyn's direction, contradicting her denial. Together with E8/E9 forms an actionable exposure packet. | A signature's authenticity beyond doubt or a guaranteed conviction. Police must investigate/authenticate; this supports C's investigation outcome, not omniscient guilt labeling. |
| **E11 Daniel located — new encounter record** | Personally encounter and identify Daniel at the refuge; use client description plus his acknowledgment. | Confirms him alive at a specific location, enabling an accurate report or protection arrangement. | Innocence, the truth of his account, or permission to disclose his whereabouts. |
| **E12 Newspaper after A — new consequence record** | Office/contact news interaction after the authored post-report time advance. | Detective learns Daniel was murdered; appends to the existing closed case. | Evelyn's culpability if the detective has not independently learned it. The article must not disclose the hidden operation by default. |

The carrier record and stolen-property notice are independent source classes. E7 is useful but **not mandatory for C**: requiring Daniel's ledger and his explanation would recreate dependence on him. E10 contains an explicit named instruction, not an undecipherable set of initials that only Daniel can explain. Exact item types, serials, batch references and signatures require an approved content pass with cross-document consistency tests.

### Deception audit

| Important deception | Independently discoverable challenge | Additional support / interpretation limit |
| --- | --- | --- |
| Arthur: routine signed/paid checkout with luggage | E5 missing signature and pending settlement; E1 luggage still present | E6 midnight account and Thomas instruction can corroborate irregularity. Luggage alone does not disprove checkout; the evidence challenges the stronger specific claim. |
| Thomas: no involvement with relevant consignments | E8 names him in the handover; E10 addresses him about matching batches | E7 is additional corroboration. A normal porter can handle packages innocently, so the theft dates and instructions matter. |
| Evelyn: no operational connection, purely familial inquiry | E10 her directions matched to E8/E9 | E7 and optional Daniel testimony strengthen the inference. Leadership can be exposed; her precise emotional motive cannot be measured from paperwork. Do not label sincere concern itself disproved. |
| Daniel: merely incidental clerical involvement | E7 records his active payment allocation; E8 references the corresponding accounting batches | Optional Thomas testimony may add context. This challenges minimization, not a rule that Daniel must be punished or that his protection is invalid. |

### Reachable investigative paths

**Locate path L1 — physical:** enter 407 freely → examine E1 → travel to the specific address → knock and identify Daniel (E11). This path needs neither Arthur's cooperation nor knowledge of Evelyn's role.

**Locate path L2 — conversational:** ask Arthur about departure and whereabouts → obtain his uncertain Calder Lane fragment (E6) → consult the public lobby directory → visit and identify Daniel (E11). Arthur can disclose it through calm questioning without an evidence quota. If he refuses after pressure, L1 remains reachable. Both routes converge on an actual encounter, not a boolean “three clues collected.”

**Exposure path X — independent records:** read E9 and E8, inspect E10, compare identifiers/dates, and deliberately submit the sourced packet to police. E7 and testimony are optional corroboration. Access to E8–E10 is an established inspection opportunity in the proposed chapter, not a reward for finding Daniel. Police intake can be an authored contact presentation without a station interior.

**Optional inquiry path:** E2 plus the lobby music notice → questions for Thomas → compare his account to E8. E3/E4 remain relevant observations without forcing every prop to identify a criminal. Unsupported theories stay possible; the game does not reward selecting every record indiscriminately.

A direct early visit to the refuge is valid if the player finds it. The player need not “unlock” Daniel by presenting the expected combination. Conversation can fail to elicit a confession while still confirming identity and location. No real-time chase, evidence destruction timer or money gate belongs in the first slice.

## Deliberate resolutions and consequences

The following **outcome facts are established**; the action mechanics and timing are **proposed**. Require an active accepted assignment to settle Case 001; exploration and discoveries can precede it. Use one primary disposition per case, with later consequence updates rather than overwriting history.

| Outcome | Proposed deliberate action and guard | Established consequence | Casebook and progression |
| --- | --- | --- | --- |
| **A — Contract Fulfilled** | After E11, explicitly confirm sending Daniel's actual current location to Evelyn. Preview names recipient/address and warns that information cannot be taken back, without predicting murder. | Evelyn pays the agreed fee. Daniel is subsequently murdered. The detective learns through a newspaper. | Assignment closed; contract fulfilled; fee paid once; one progression credit. Later learned death is appended without revoking completion or grading morality. |
| **B — Daniel Protected** | After E11, explicitly choose to conceal his whereabouts, agree a private safety arrangement with Daniel, and confirm a report to Evelyn that withholds the location. No earlier confirmed disclosure to her. | Evelyn is suspicious but has no proof of the detective's deception. Daniel survives. | Assignment closed with original demand unfulfilled; disposition protected; one progression credit. Payment is not specified by the brief: propose no fee, pending approval. |
| **C — Criminal Operation Exposed** | Explicitly submit an actionable E8/E9/E10 packet and confirm it goes to police. Core validates provenance and specific serial/batch/date relationships. Daniel's cooperation and E11 are not prerequisites. | Evelyn is investigated or arrested, ultimately avoids conviction, and becomes a recurring antagonist. | Assignment closed; disposition exposed; one progression credit. Police acknowledgment establishes action taken; later known legal outcome appends to the entry. Propose no client fee, pending approval. |
| **D — Withdrawn** | Confirm ending the active assignment without a committed A/B/C resolution or location disclosure. Pre-withdrawal recovery is available as specified below. | Evelyn expresses disappointment and says she will seek someone else. No payment. Daniel's fate and Evelyn's motives are not revealed. | Withdrawn and unresolved; zero progression credit; discoveries and memories retained. |

**B protection proposal:** merely closing a chat or refusing to answer is not enough. Daniel accepts an off-screen safe-departure arrangement and the detective completes the non-disclosing client response. The arrangement has no money/skill check and does not require criminal testimony. Do not persist a half-completed promise as a resolved protection outcome. His participation in a safety plan is distinct from cooperating with police. The exact arrangement and who provides it require approval; do not invent a permanent detective contact as established biography.

**C sufficiency proposal:** validate meaningful links, not a clue count: a listed stolen item's loss precedes its carrier pickup at the hotel; matching dispatch instructions connect that batch to Evelyn and Thomas. This establishes grounds for an authored investigation, not a legal guarantee. A packet lacking a required connection receives a neutral “insufficient basis to act” response, without highlighting which hidden clue to fetch. All examined records stay available. Final interpretation and forwarding require the player's action.

**A timing proposal:** confirmation commits disclosure, payment and primary disposition, then schedules the fatal consequence. A deliberate “continue to the following morning” transition makes the newspaper available; reopening a save cannot prevent or duplicate the committed consequence. No timed rescue is implied between report and news. The player may inspect the completed case afterwards; its title/status must not become “wrong ending.” The A chapter-conclusion sequence includes reading the newspaper before its final summary, while case completion/credit already belongs to the earlier report. If the player postpones that sequence or reloads, the unread news remains available and hidden facts stay out of the notebook until read.

**C timing proposal:** accept the sourced submission and show an acknowledgment that inquiry has begun, then an authored epilogue records that Evelyn ultimately avoids conviction. Choose investigation versus arrest in final writing; do not promise both. Do not force the player to locate Daniel before this epilogue. If Daniel has not been met, his location/fate remains absent from the player's casebook.

### Branch conflicts, disclosure and information flow

For the first slice, A/B/C are mutually exclusive primary resolutions. Once one commits, a later action cannot award another primary disposition or payment. Additional future investigations may record later actions without rewriting this case. D can be reconsidered only through a supported reopening or explicit rewind, never by an unnoticed status change.

Reporting the location after B would contradict the promised survival outcome. Proposed boundary: after B, further casual conversation may continue, but actionable location disclosure is not supported in this chapter; the UI explicitly says the closed protection decision cannot be changed in this slice. Do not echo player-typed location text to Evelyn as canon while also claiming it was never communicated. Any attempt to communicate a consequential location is intercepted by the action flow before NPC context or durable disclosure events are updated. The same rule prevents casual free-form text from bypassing A's confirmation.

This boundary is a scope limit requiring approval. A later design that permits betrayal after B must author new consequences and retained-history semantics, rather than silently breaking B. Similarly, discovering exposure evidence after A cannot undo the murder or transform the original disposition into C.

An overheard/disclosed event, a report received, or a police inquiry may update an NPC's knowledge. Opening the casebook, comparing E10 privately, or choosing a hidden UI tab does not. During B, Evelyn knows the detective failed/refused to provide a location, not that Daniel has been found and moved. The private safety agreement is not sent in her conversation context.

## Chapter conclusion and persistent return

A/B/C complete the major investigation and make the chapter conclusion available. The player explicitly continues; collecting the last supporting item does not roll credits. Resolve or schedule all promised consequence beats durably, and preserve NPC memories, learned records, case history and player position across chapter transitions. A may have tragic consequences and still be the chapter's completed case.

For the demo, offer an ending summary limited to learned information and return-to-neighborhood exploration. Full-game chapter access remains governed by the provisional catalog rules, not hardcoded next-level loading. C's antagonist thread carries forward. A's newspaper and B's surviving Daniel create different future world states without requiring three separate neighborhood implementations now.

D is an unresolved stopping point, not a solved chapter ending or a reveal sequence. The demo can explain that the assignment is withdrawn while offering exploration and return to a protected pre-withdrawal checkpoint. No teaser may reveal Daniel alive, Evelyn's involvement, or an off-screen murder merely because D was selected.

## Plot holes, softlocks, and review gates

| Risk | Proposed control / remaining approval |
| --- | --- |
| Why hire an investigator who might expose the operation? | Evelyn has lost Daniel and wants an outsider to locate him; Thomas believes important accounts left with him. Show this as a calculated risk through later evidence. Approve this rationale rather than making her omniscient. |
| Why are incriminating records still inspectable? | Early Day 0 inquiry, normal billing duplicates, and a concealed financial copy. Approve the precise inspection permission and document placement. Do not let one NPC's refusal invalidate all physical paths. |
| Why has Thomas not searched the hiding place? | It is outside the hotel; Daniel arranged it privately. Receipt is a lead Thomas overlooked. Approve why the receipt remains in the suitcase and the refuge is credible. |
| Does leaving luggage prove a lie? | Only against the specific “took all luggage” claim; E5 independently challenges signed/paid checkout. Do not turn ambiguity into a verified abduction. |
| Does the note prove a meeting? | No. Proposed author truth says Daniel avoided it. Keep record text uncertain; never require interpreting the note correctly to progress. |
| Does C require a confession or Daniel's cooperation? | No: E8/E9/E10 are accessible independent records and form a complete submission path. E7/E11 and testimony are optional. |
| Can an angry NPC block all progress? | L1 and X bypass cooperation. First slice has no permanent physical lockouts, surprise evidence destruction, real-time death or fee gate. |
| Can withdrawal trap the demo or a later final chapter? | A protected whole-session checkpoint precedes D; offer explicit rewind, preserving the withdrawn playthrough until chosen. Reopening/alternate resolution is a release gate if later chapters require Case 001. Checkpoint recovery remains a proposal requiring approval. |
| Can free-form text leak an address without confirmation? | Intercept consequential messages before dispatch; show interpreted action and recipient; cancel sends nothing. Unsupported post-B disclosures cannot be delivered as ordinary NPC text. This needs explicit tests and approved UX. |
| Can the user choose multiple contradictory endings? | Commit one primary disposition atomically; append later known consequences, deduplicate events/payments/credit. Closed-case betrayal and post-A exposure are deferred, not silently simulated. |
| Can legacy saves be retroactively made wrong? | Preserve four old records and their uncertainty; add new IDs for checkout claims/evidence. Keep receptionist identity stable when assigning display name Arthur. Migration must not infer acceptance, new discoveries, or guilt from old flags. |

**Reachability check (design, not an executed game test):** A = accept + L1 or L2 + confirm report; B = accept + L1 or L2 + private safety agreement + confirm withheld report; C = accept + X + confirm police submission; D = accept + confirm withdrawal, with or without prior discoveries and without a resolution already committed. Each has a path independent of a fixed clue quota. All paths depend on the proposed content and actions being approved and implemented.

Decisions required before content implementation: timeline rationale; Calder Lane refuge and access; E1/E5/E7–E10 wording and provenance; B's safety arrangement and payment; C's investigation/arrest presentation and payment; consequence timing; mutually exclusive primary endings and post-B disclosure limits; protected withdrawal checkpoint versus implementing reopening immediately. The authoritative mystery and four outcome facts above are not being reopened by these proposals.
