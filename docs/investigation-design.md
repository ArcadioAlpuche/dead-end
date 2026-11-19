# Dead End — Investigation and Casebook Design

**Status:** Approved investigation principles and a proposed M4 outline. This document does not authorize new Case 001 evidence, dialogue, locations, or progression. Read with the [game design](game-design.md), [NPC conversation design](dead-end-npc-conversation-design.md), [Chapter 1 author plan](chapter-1-bellweather.md), and [implementation plan](chapter-1-implementation-plan.md). The Chapter 1 document contains author-facing spoilers and proposed details that must not appear in the player casebook merely because they are documented.

## Approved player experience

### Reasoning and fairness

Kane records what he encounters; the player decides which records matter, compares possible explanations, and chooses what to pursue. The game must not automatically highlight relevant clues, flag contradictions, identify a lie, announce a deduction, or prescribe the next destination. A record's placement, visual treatment, and casebook heading must not quietly reveal its importance. A successful authored action can validate its own prerequisites without presenting that validation as the solution to the mystery.

Difficulty should come chiefly from reasoning. Evidence must be reasonably discoverable, spaces understandable, and the case fairly solvable through information available to the player. Do not make progress depend on pixel hunting, memorizing a photograph or conversation, tedious manual note saving, a hidden clue quota, or guessing exact dialogue words. Apparent contradictions may reflect error, limited vantage, or timing rather than deception. Case 001 should teach these habits before later cases become more demanding.

### Physical evidence and observations

Photographs, documents, objects, and environmental details can all be evidence. Record each distinct item in a collection so a player can revisit every item, including those that turn out to be incidental. Where useful, retain an inspectable image or readable document alongside a neutral observation. Do not collapse a collection into only the photograph or page used by a progression rule. Descriptions should report visible text, condition, position, and provenance without inferring author, owner, motive, authenticity, or significance beyond what Kane actually establishes. Important and incidental items should have the same discovery affordances and visual priority.

Acquisition is idempotent and independent of assignment acceptance. Keep physical possession, inspection, observation, testimony, verification, and player deduction distinct. A new interpretation or changed witness account must not overwrite an earlier source record. Device recording time and a claimed in-world event time remain separate.

### Statements and conversation archive

Automatically create a structured **Statement** when an NPC conveys concrete world information. Preserve who said it, the encounter/source, the claim's exact uncertainty, and any alleged event time; it remains testimony until independently checked. Include meaningful information even when its eventual case relevance is unknown. Avoid repeated structured copies of the same disclosure, while retaining a materially changed account as a separate, attributed record. Do not add repetitive chatter, banter, or purely off-topic exchanges to Statements, and do not turn summaries into hints or automatic contradiction reports.

Preserve a complete reviewable conversation archive, including off-topic turns, separate from Statements. Group by NPC and encounter where practical. Useful statements must be captured automatically rather than requiring a player to save each line. An archive preserves what was said; it does not make every line verified or durable NPC memory. The long-term interface remains free-form text with contextual follow-ups, as specified in the [NPC conversation design](dead-end-npc-conversation-design.md).

### NPC boundaries

Model what each NPC knows, believes, and has observed separately from what they are willing to disclose. Responses can depend on context, evidence actually shown or disclosed to that NPC, and significant prior interactions. Repetition or a slight rephrase alone must not yield a secret without a meaningful change in circumstances. Thoughtful follow-ups are productive questions, not misconduct. Unproductive repetition may test patience in a personality-appropriate way, but a meaningful question restores engagement and essential progress cannot be permanently lost to irritation. Guessing a secret does not require an NPC to confirm it.

Authored knowledge, disclosure, and consequential-action rules remain authoritative even if an optional AI service later helps interpret or phrase conversation. An NPC may be mistaken or lie within authored boundaries; an adapter cannot invent canonical evidence, expose an unknown secret, or advance case state independently. Consequential disclosures still require the pre-dispatch confirmation boundary.

### Exploration and progression

Places may be explored before Kane knows why they matter, and clues may be found before a case is accepted. Finding a location need not make its crucial character or interaction immediately available. Access changes need visible, believable causes and more than one legitimate investigative approach where practical. Do not make a discovered address, a guessed destination, or a guessed question bypass a major investigative step by itself. Equally, a player who legitimately reaches a person early should receive a coherent encounter, rather than an invisible mission-order gate.

## What exists now

The playable hotel has an illustrated lobby, staircase, fourth-floor hallway, and Room 407; the neighborhood is a limited exterior prototype. Room 407 has three independent observation records: a glass, folded note, and bed. Arthur can provide one attributed, uncertain account. The casebook separates observations from testimony and shows Evelyn's available or active Case 001 assignment and acceptance history. These discoveries are independent of acceptance. A bounded authored conversation grammar, limited follow-up context, NPC memory, and a confirmation boundary exist. Versioned local saves persist discoveries, case state, and significant NPC memory.

The game does **not** yet retain complete conversation archives across encounters or reloads: the current in-session transcript is capped and cleared on exit/reload. There is no inspectable photograph collection, evidence image gallery, structured Statements section beyond the existing testimony records, comparison tool, Johnny or garage, Daniel encounter, case resolution, or general natural-language interpreter. These are planned capabilities, not claims about current behavior. Archive storage, encounter identity, retention, and save migration need design before implementation.

## Proposed M4 investigation outline — for review, not implementation

1. **Start with existing Room 407 access.** Keep the current glass, note, and bed records unchanged and available before acceptance. Review an additional physical lead and any new hotel document only after their content, provenance, and inspection permission are approved. No new record should silently identify a culprit or destination.
2. **Consider a photograph collection.** If approved, make every photograph individually inspectable and record neutral visible details for each. A possible connection to Johnny's garage would be a player-interpreted lead, ideally supported by another independently accessible source. The number of images, what they depict, who took or left them, and whether any identifies an address are undecided. Do not treat a photograph as proof that Daniel is presently there.
3. **Give Arthur a bounded role.** His existing midnight account remains uncertain. Additional questions could provide a separately attributed lead or clarify hotel procedure only if exact claims and his plausible knowledge are approved. His willingness may depend on meaningful context, but pressing him or guessing a name must not force confirmation; a physical route should remain if he disengages.
4. **Allow early exploration of a garage if that location is approved.** Its exterior can exist before its case relevance is known. Johnny's presence, cooperation, and knowledge would depend on authored circumstances rather than a case-accepted flag or clue count. An early visit should produce a coherent, non-spoiling interaction. The garage must not become an automatic shortcut to Daniel merely because the player guessed where to go.
5. **Open the next stage through credible action.** Possible approaches include inspecting a specific physical lead, corroborating an address or contact, showing an item to someone who can recognize it, or obtaining a justified introduction. These are alternatives to evaluate, not settled gates. A later Daniel encounter must establish identity and current whereabouts through the encounter itself; a lead or photograph alone cannot do so.

The existing [Chapter 1 plan](chapter-1-bellweather.md) instead proposes a suitcase receipt at **18 Calder Lane**, an uncertain address fragment from Arthur, and a rear room above a repair workshop. That placement and address are explicitly unapproved. Johnny and his garage are not yet defined in repository canon. Decide whether the garage replaces, contains, connects to, or is independent of that proposed refuge **before** authoring M4 content. Do not silently combine the two paths or change Daniel's established status by implication.

## Decisions needed before M4 code

- What does the photograph collection contain, where did it come from, and which details can Kane actually observe? Which images are incidental, and how can every image be revisited?
- What is Johnny's identity, relationship to Daniel, knowledge, and reason to speak or decline? Is his garage the proposed repair workshop, a lead to it, or a separate place?
- What is the approved refuge location and access rationale? If the Calder Lane receipt/Arthur fragment remain, how do they relate to the garage without giving Arthur knowledge he lacks?
- Which independent routes can legitimately lead from Room 407 or Arthur toward Daniel? What happens when a player reaches the garage before finding those leads?
- What exact new claims, documents, source images, and changed circumstances are approved for M4? What may be inferred by the player but must not appear as a verified casebook fact?
- What archive and Statement retention model fits save compatibility, repeat disclosures, NPC/encounter grouping, and player review without turning the casebook into a hint system?

After these decisions, scope M4 into small tests for out-of-order discovery, individual item review, source attribution, alternate access paths, premature visits, and save restoration. No M4 content is implemented by this document.
