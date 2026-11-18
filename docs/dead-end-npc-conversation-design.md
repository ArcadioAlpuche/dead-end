# Dead End — NPC Conversation Design

**Status:** Established design direction. This document describes the intended conversation experience and its authority boundaries; it does not claim that the current M3 prototype understands arbitrary language. See the [game design bible](game-design.md) for overall game direction and [architecture](architecture.md) for implemented behavior.

## Player conversation

Players type questions and statements in their own words. Predefined dialogue choices must not become the required way to speak with an NPC. Explicit controls may help players confirm consequential actions, but they are not a replacement for free-form conversation.

An NPC should interpret conversational meaning in context: follow-up questions, pronouns and other references to earlier statements, and connections among case facts the speaker could know. The interpretation should preserve the player's intent. Uncertain phrasing calls for clarification; it must not silently become an accusation, disclosure, consent, or other commitment. A useful response to an unsupported question should stay in character without claiming unestablished facts.

## NPC identity, knowledge, and memory

Each NPC has a consistent personality and authored boundaries for what they know, believe, suspect, keep secret, and remember; background characters may use simpler profiles. Their conversational patience and reactions should fit that character. Knowledge must have a plausible source: personal observation, something they were told, or a defined communication event. An NPC does not learn a discovery merely because it appears in the player's casebook. Beliefs and testimony retain their attribution and uncertainty; even a confident statement is not automatically a verified fact.

Keep ordinary conversation history distinct from durable memory. Persist significant interactions needed for later behavior, including appropriate reactions to prior topics or conduct, without requiring a permanent transcript or numerical relationship score. Memory may influence tone and willingness to engage; it must not give an NPC facts they never learned.

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

The current M3 implementation accepts typed text but recognizes a bounded authored grammar with limited contextual follow-ups. It blocks unrecognized or potentially consequential messages before NPC dispatch. That limitation is an implementation status, not a revision of the free-form design goal.

## Open technical decisions

The AI provider, deployment model, operating-cost controls, exact patience thresholds, language-understanding method, memory detail, and validation mechanics remain open. They should be selected and tested against the established conversation and safety requirements. Their unresolved status does not reopen the decision to use free-form dialogue.
