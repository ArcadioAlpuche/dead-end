# Dead End — NPC Conversation Design

**Status:** Established design direction. This document describes the intended conversation experience and its authority boundaries; it does not claim that the current M3 prototype understands arbitrary language. See the [game design bible](game-design.md) for overall game direction and [architecture](architecture.md) for implemented behavior.

## Player conversation

Players type questions and statements in their own words. Predefined dialogue choices must not become the required way to speak with an NPC. Explicit controls may help players confirm consequential actions, but they are not a replacement for free-form conversation.

An NPC should interpret conversational meaning in context: follow-up questions, pronouns and other references to earlier statements, and connections among case facts the speaker could know. The interpretation should preserve the player's intent. Uncertain phrasing calls for clarification; it must not silently become an accusation, disclosure, consent, or other commitment. A useful response to an unsupported question should stay in character without claiming unestablished facts.

## NPC identity, knowledge, and memory

Each NPC has a consistent personality and authored boundaries for what they know, believe, suspect, keep secret, and remember; background characters may use simpler profiles. Their conversational patience and reactions should fit that character. Knowledge must have a plausible source: personal observation, something they were told, or a defined communication event. An NPC does not learn a discovery merely because it appears in the player's casebook. Beliefs and testimony retain their attribution and uncertainty; even a confident statement is not automatically a verified fact.

Keep ordinary conversation history distinct from durable memory. Persist significant interactions needed for later behavior, including appropriate reactions to prior topics or conduct, without requiring a permanent transcript or numerical relationship score. Memory may influence tone and willingness to engage; it must not give an NPC facts they never learned.

### Progressive identification

An NPC's canonical ID and authored identity belong to the game definition. The name shown to Kane depends on separately saved identity knowledge, not on trust, patience, or a renamed NPC ID. Before a credible introduction, use a descriptive label based on what Kane can observe. A claimed or suspected name can be retained without presenting it as established; a resemblance or unsupported player guess does not confirm identity. A credible, authored self-introduction may establish the displayed name. Preserve earlier conversation speaker labels as they were shown at the time, so learning a name does not rewrite history.

The first implemented slice applies this to the Bellweather receptionist: **Hotel Clerk** becomes **Arthur Finch** after his authored introduction. Schema v6 saves that knowledge separately from NPC memory and from Kane's disclosures to the NPC. Older saves with a durable record of speaking to him retain the name the previous UI already showed; an old save with no such trace begins with the descriptive label. Older saves do not infer a first encounter or Kane disclosure from ambiguous history. No Johnny or Daniel identity content is implemented yet.

The initial universal contact foundation records the first encounter once per stable NPC ID. The player may explicitly tell an NPC Kane's name, private-investigator occupation, or former-police background separately; those events preserve what Kane claimed without treating the statement as independent verification. Evelyn's authored prior relationship establishes her knowledge of his name and occupation without pretending that Kane disclosed them during play. Arthur and Thomas Bell begin without such knowledge. This does not define Kane's personality or add a trust score. Exact self-disclosure phrases are a bounded offline bridge; broader intent and context handling remain future work.

## Conversational response and patience

Interpret a player's message according to its meaning and current context. Distinguish at least these situations:

| Situation | Intended response |
| --- | --- |
| Relevant investigation question or follow-up | Address the authored topic within the NPC's knowledge and uncertainty. |
| Meaningful personal question | Respond in character and allow engagement to recover. |
| Harmless small talk | Respond in character and allow engagement to recover. |
| Sensitive subject | Use the NPC's authored reaction; seek clarification or confirmation before any consequential interpretation. |
| Genuinely irrelevant or deliberately disruptive question | Give a personality-appropriate warning as repetition continues, then disengage, remain silent, or answer dismissively for a time. |
| Uncertain or unsupported phrasing | Ask for clarification or acknowledge uncertainty without inventing an answer. |

Repeated irrelevant or deliberately disruptive questions can exhaust an NPC's patience. A meaningful investigation or rapport question immediately restores engagement, including after disengagement. The NPC may remember the irritation and reflect it in tone, but irritation cannot permanently block essential case progression. The exact warning count, timing, and memory representation are implementation decisions.

## Authority and consequential actions

Authored case facts, evidence, solutions, NPC knowledge boundaries, and consequential state remain under deterministic game rules. NPC dialogue may express a claim, mistake, evasion, or authored lie; it cannot create canonical evidence or reveal knowledge the NPC does not possess. A response adapter, including a future AI adapter, returns proposed interpretation or presentation text for validation. It cannot independently add evidence, establish guilt, change a case, disclose protected information, or commit another consequential action.

Potentially consequential disclosures and decisions must pass the existing pre-dispatch safety boundary and an explicit propose/confirm/cancel path where applicable. The preview should name the recipient and information being disclosed. Ambiguous language is clarified before an NPC receives protected information. Cancel and reload must not apply a pending action.

## Authored fallback and optional AI

Authored dialogue and deterministic safeguards remain useful for canonical information, safe fallback, and reliable case progression. The long-term design may use an optional, replaceable AI provider to improve natural-language understanding and expression within each NPC's permitted context. A live AI connection must never be necessary to complete the game or obtain essential case information. The offline/authored path must retain free-form input and provide understandable clarification when it cannot interpret a message.

The current implementation accepts typed text through a bounded authored grammar, Phase 2A profile-driven question templates, and Phase 2B transient context for a small set of follow-ups. It blocks unrecognized or potentially consequential messages before NPC dispatch. Subject aliases and a few spelling corrections improve offline recognition without claiming broad natural-language comprehension. That limitation is an implementation status, not a revision of the free-form design goal.

### Phase 2B contextual references

During one conversation, the interpreter tracks the authored topic, Kane's questioned subject, referents in the NPC's latest authored reply, and a narrow focus such as a sighting, checkout, or room. Stable entity IDs distinguish Daniel Mercer from the unidentified Bellweather visitor. Pronouns resolve from the NPC reply, not from an unverified premise in Kane's question. A topic switch replaces the context; unsupported input leaves it intact. Multiple possible people or a missing referent call for clarification. A recognized follow-up receives only a matching authored answer, with no new evidence or identity inference. Supported examples include “When?”, “Where?”, “Who?”, “What happened next?”, “What was he wearing?”, “Did you see his face?”, “Who stayed there?”, “What about him?”, and “Are you sure?” where the NPC profile supports them. Context clears when dialogue closes and is absent from schema v6 saves. Durable NPC memory, identity, disclosures, and case state remain separate.

The Phase 2B browser correction also accepts “Did Daniel checkout?” as a spelling variant of the existing checkout question and “Who stayed in Room 407?” as an explicit occupant question. “Who is Daniel?” receives only an NPC-specific authored identity response: Arthur cannot identify Daniel from his sighting, Evelyn can state their established sibling relationship, and Thomas Bell has no authored identity answer. “Did you see anyone leave?” remains unsupported: Arthur observed someone coming downstairs, which does not establish that anyone left the hotel. This question must not be routed to his sighting account as evidence of a departure.

### Phase 2A intent-recognition regression case

At the Bellweather front desk, the player asked Arthur: “What do you know about Daniel Mercer?” Before Phase 2A, the boundary returned its generic “Not sent” Room 407/last-night clarification. The Phase 2A recognizer now routes it to Arthur's limited authored response: he cannot identify the person he saw as Daniel. It does not route to Evelyn's assignment claim, grant Arthur testimony, reveal unsupported case facts, or treat the question as a disclosure. This exact wording remains in the automated regression table.

### Future conversation work (not implemented in Phase 2B)

**Phase 2D — Natural fallback behavior.** Unrecognized input still produces a private “Not sent” clarification, which can break immersion. A later pass should distinguish harmless unsupported questions from ambiguous or potentially consequential statements. Harmless questions should receive appropriate in-character responses when they can be dispatched safely; uncertain disclosures and actions must continue through the pre-dispatch safety boundary.

**Phase 3 — Character-aware responses.** Accepted introductions and Kane disclosures can currently receive a generic acknowledgment, such as “The clerk nods and returns his attention to you.” Future responses should follow each NPC's authored personality, knowledge, circumstances, and relationship with Kane. Randomized generic acknowledgments would not satisfy this requirement. Response text must still have no authority to create facts or state changes.

**Future UI milestone — Conversation history.** The current history view works, but its control needs clearer discoverability. The transcript should become more compact, distinguish speakers more clearly, and improve readability. This is a separate presentation milestone; Phase 2A does not change the interface or persist transcripts.

## Open technical decisions

The AI provider, deployment model, operating-cost controls, exact patience thresholds, language-understanding method, memory detail, and validation mechanics remain open. They should be selected and tested against the established conversation and safety requirements. Their unresolved status does not reopen the decision to use free-form dialogue.
