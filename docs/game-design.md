# Dead End — Game Design

Status: design baseline with an implemented exploration slice. The implementation status below distinguishes the current build from the broader design. Technical boundaries are defined in [architecture.md](architecture.md); contributor rules are in [AGENTS.md](../AGENTS.md).

## Current exploration build

The requested first implementation uses a **side view with limited vertical floor depth**, procedural placeholder graphics, and direct WASD/arrow movement. The lobby, staircase, fourth-floor hallway, and Room 407 are connected through named entries. Stair travel explicitly abbreviates three flights; the second and third floors are shown in the stair cutaway but are not explorable. Tab opens and closes the notebook; E advances dialogue and Escape closes blocking UI.

The receptionist has a short scripted conversation. Room 407 is vacant and unlocked for inspection, independent of talking to the receptionist. The champagne glass, folded note, and undisturbed bed produce observations. The receptionist's account is recorded separately as unverified testimony only when heard. These are prototype story details, not an established mystery solution. One browser-local save retains position and discoveries.

This build intentionally implements the exploration subset of the original milestone below. Case offers/acceptance, inventory collection, deductions, accusations, and case resolution remain future work. In particular, the case acceptance checks below are design targets, not claims about the current build.

## Vision and tone

Dead End is a 1940s-inspired, illustrated 2D detective adventure about a flawed, sarcastic private investigator navigating a believable city. Exploration is the primary activity: the player walks through connected places, notices details, meets people, and decides which stories deserve investigation.

The atmosphere is slightly exaggerated noir: rain-streaked windows, hard shadows, weary institutions, private grudges, and people who perform confidence they do not feel. Serious mysteries coexist with dry humor, eccentric gangsters, nightclub owners, police officers, and memorable ordinary residents. The detective's sarcasm should reveal character without trivializing victims or making every conversation a joke.

Classic noir cinema informs the mysteries and moral ambiguity. *Who Framed Roger Rabbit* informs the balance of danger, comic timing, and colorful personalities; *Cuphead* informs expressive staging and visual rhythm. These are tonal references, not setting rules: all characters are human, and there are no cartoon characters or supernatural explanations.

## Design pillars

- **A world before a case:** places, people, and evidence exist whether or not the detective has accepted work.
- **Readable, consistent spaces:** interiors follow believable floor plans, and movement preserves the player's understanding of where they are.
- **Investigation through attention:** observation, questioning, puzzles, and deduction matter more than following objectives.
- **Knowledge has a source:** testimony, direct observation, verified facts, and the player's interpretations remain distinguishable.
- **Agency with consequences:** the player can act on incomplete information, and people respond believably.

## Movement, interaction, and exploration

Use WASD or arrow keys for direct movement. The game does not use point-and-click movement. E activates a nearby, eligible interaction, with a visible prompt naming its target. When targets overlap, choose consistently using distance and facing, with a stable tie-breaker; never leave the player guessing which object will activate.

Optional mouse interaction activates the same nearby targets under the same rules. Clicking a distant object must not teleport the detective, collect evidence remotely, or initiate automatic walking. Core world interactions must be usable with the keyboard.

Opening dialogue or another blocking UI disables world movement and interaction until it closes. UI focus must not also trigger world actions. Tab toggles the notebook; inventory shortcuts remain to be assigned.

Players may explore without accepting any case. Access restrictions should arise from the world—a locked room, private property, an uncooperative person—not an invisible requirement to accept a mission. Story events may change accessibility, but those changes need an authored cause.

## Spatial consistency

Each building has an authored floor plan covering room adjacency, floor levels, doors, landings, and stairs. A door leads to a defined entrance in its destination; returning through it restores the corresponding side of the original connection. Arrival positions and facing must make spatial sense and keep the detective out of walls and transition triggers.

Room layouts remain stable across visits. Doors retain their lock state, collected objects remain collected, and upstairs rooms align plausibly with the building below. Scene boundaries are a rendering choice, not permission to invent impossible connections. Floor labels and stair travel must make changes in elevation understandable.

Location names should feel period-appropriate. Occasional subtle noir references are welcome, but names should work without recognizing the reference. Bellweather Hotel is established; additional names and the city itself are not yet canon.

## Investigation and cases

The recurring activity is to explore, observe or collect, question people, compare accounts, form a theory, and choose how to act. This is not a mandatory sequence: the player can revisit places, discover clues out of order, or decline work.

Cases begin through conversations with potential clients and an explicit choice to accept. Hearing an offer does not automatically accept it. Accepting a case associates previously discovered relevant material with that investigation; it does not spawn the evidence or require collecting it again.

Investigations may include physical evidence, environmental observations, NPC questioning, environmental puzzles, codes, locked doors, and deductions that connect multiple sources. Puzzle answers and case solutions are authored facts. Evidence visibility and availability follow world conditions independently of case acceptance.

Questioning should expose each person's knowledge, motives, mistakes, and willingness to cooperate. New evidence can unlock topics without converting every conversation into a checklist. Contradictions stay visible rather than silently replacing earlier statements.

Players may accuse suspects before gathering sufficient evidence. Accusations need a deliberate dialogue choice but must not require a complete evidence checklist. Authored consequences can include lost trust, refusal to cooperate, police attention, or a damaged case outcome. Consequences should follow the accusation and circumstances; they must not reveal the culprit merely by labeling the accusation correct or incorrect. The severity and recoverability of these outcomes remain open design decisions.

## Notebook and evidence

The notebook records observations, testimony, people, and timelines. It is a factual memory aid, not a quest guide: it must not prescribe the next action or expose undiscovered information.

| Record | What the notebook may say |
| --- | --- |
| Direct observation | What the detective actually saw or examined, with location and discovery time. |
| Testimony | Who made the statement, what they claimed, and when it was recorded. |
| Verified fact | A specific proposition supported by recorded verification, with links to its supporting sources. |
| Deduction or theory | An interpretation, clearly labeled and linked to its basis; not automatically true. |

For example, “The clerk says the guest left at midnight” is testimony. It does not establish that the guest left at midnight. Even verified physical evidence supports only its actual observation: a monogram on an object does not by itself prove ownership or guilt.

Timeline entries distinguish when something allegedly happened from when the detective learned about it. Unknown times, estimates, and conflicting accounts remain explicit. Corroboration adds support without erasing original provenance. Repeated examination should not produce duplicate evidence or notebook entries.

Physical inventory and knowledge are different. The detective can observe something without taking it; transferring an item does not erase the observation. A case may reference evidence without owning its existence or discovery state.

## Money and relationships

Money, purchases, optional gambling, and relationships may influence access, information, and cooperation. These systems should create meaningful choices grounded in the setting. Gambling is optional; it must not become a mandatory source of investigation progress. Economy balance, relationship visibility, and recovery from financial mistakes are deferred until the basic investigation loop works.

## First playable: Bellweather Hotel

The first playable is a small connected section of the hotel containing a lobby, staircase, upstairs hallway, and Room 407. It demonstrates exploration and trustworthy information handling before attempting a complete mystery.

The connection is lobby ↔ staircase ↔ upstairs hallway ↔ Room 407. Room 407 is on the fourth floor, as confirmed by the implementation request. Stair travel must visibly account for the intervening floors, even if other floors are inaccessible or travel is abbreviated. Do not silently depict a single flight from the lobby as reaching the fourth floor.

Minimum content:

- One controllable detective, illustrated or temporary readable environments, and collision boundaries.
- All four connected spaces, with explicit entrances, return paths, and safe arrival positions.
- At least one NPC, provisionally a hotel clerk, with authored dialogue and an attributed statement.
- At least one inspectable piece of evidence available before accepting a case; its content remains to be authored.
- A notebook recording the observation and testimony separately, plus the relevant person and timeline information without asserting an unverified event.
- A minimal client conversation with an optional case offer, so pre-acceptance discovery and later association can be demonstrated. The client may reuse the same NPC for this slice; final identity and premise are undecided.
- Local save/load for discovered evidence, notebook records, case acceptance, and player location.

Acceptance checks:

1. Start with no accepted case, move with either keyboard scheme, and visit every included space.
2. Travel both directions through each connection; floor changes, arrival position, facing, and collisions remain coherent.
3. Interact with the NPC using E; dialogue blocks movement and closing it restores control without an accidental world action.
4. Discover evidence before accepting the offer; it appears once in the notebook and survives revisiting the room.
5. Accept the case later; previously discovered relevant evidence becomes associated without rediscovery or duplication.
6. Read an NPC claim and a direct observation in the notebook and clearly tell which is which. No entry reveals a solution or tells the player what to do next.
7. Reload the game and retain location, discoveries, testimony, and case status.

Combat, a complete city, a full case resolution, accusation consequences, gambling, an economy, relationship simulation, AI dialogue, and optional mouse controls are outside this first slice. These exclusions narrow the milestone, not the long-term vision.

## Remaining design decisions

| Decision | Proposed starting point |
| --- | --- |
| First investigation content | Agree on the client and case premise before introducing case acceptance; decide whether the prototype testimony and objects become final story content. |
| Detective and setting | Choose the detective's identity, city, approximate year, and boundaries for mature themes before final dialogue. |
| Accusation consequences | Decide whether a case can become irreversibly unsolvable and how recovery or alternate outcomes work. |
| Deduction interface | Start with authored evidence relationships; decide later how players explicitly submit theories or connections. |

