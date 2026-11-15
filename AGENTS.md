# Dead End — Contributor Instructions

## Project direction

Read [docs/game-design.md](docs/game-design.md) and [docs/architecture.md](docs/architecture.md) before changing gameplay or architecture. They distinguish established requirements, proposed implementation choices, and unresolved decisions. Update them when an accepted change alters those contracts; do not turn illustrative content into unapproved story canon.

Dead End is a grounded, 1940s-inspired 2D noir detective adventure. Preserve direct WASD/arrow movement, proximity interaction with E, exploration without case acceptance, independent evidence discovery, and a notebook that separates testimony from verified facts. Keep human characters, believable spaces, serious mysteries, and dry humor. Do not introduce cartoon characters or supernatural explanations.

## Preserve the scaffold

- Extend the existing Phaser/React/TypeScript template incrementally. Preserve its entry points, assets, and configuration unless the task requires a specific change.
- The installed engine is Phaser **4.0.0**, despite the package description mentioning Phaser 3. Check the installed version before choosing APIs; do not downgrade or replace the template incidentally.
- Use the existing npm workflow and `package-lock.json`. Do not add dependencies, replace tooling, or regenerate configuration for unrelated work.
- Keep scope narrow. A documentation-only task must not modify gameplay, install dependencies, or implement proposed features.
- Inspect the working tree before edits and preserve user changes. Do not reformat unrelated files or remove template examples merely to tidy the repository.

## Architectural rules

- Phaser handles world rendering, movement, collision execution, cameras, and scene lifecycle. Keep narrative and investigation rules out of scenes.
- React handles notebook, dialogue, inventory, and other UI. Local React state is for presentation; authoritative game state belongs to framework-independent TypeScript systems.
- Core systems must not import Phaser, React, or browser persistence APIs. Route gameplay mutations through typed commands with validated conditions and explicit results.
- Maintain one authoritative session. Do not mirror mutable evidence, inventory, or case state independently in scenes and components. Phaser reports resolved spatial state to the session; React receives only the snapshots it needs.
- Use data-driven definitions and stable IDs for locations, characters, interactions, evidence, and cases. Separate immutable authored definitions from mutable save state.
- Reuse the template bridge for presentation integration, with typed contracts for new traffic. Clean up each subscriber's own listeners on shutdown/unmount and account for React Strict Mode.
- Keep the first playable small: Bellweather lobby, staircase, upstairs hallway, Room 407, movement, consistent transitions, basic dialogue, evidence, notebook, and local persistence. Do not expand into a city simulation or full case system without task scope supporting it.

## Investigation and world invariants

- Case acceptance must not create clues or gate their discovery. Previously found evidence must remain available when a relevant case is accepted later.
- Evidence acquisition must be idempotent. Physical possession, observation, testimony, verification, and deduction are distinct concepts.
- Preserve attribution, uncertainty, and discovery versus claimed event time. A witness statement is not established truth; the notebook must not leak hidden solutions or prescribe the next action.
- NPC conversations use free-form player text. Keep transcripts transient and significant NPC memory typed, core-owned, and versioned in saves. Mock or future AI response adapters return presentation text, never authoritative memory/evidence mutations.
- Keep authored case facts and solutions authoritative. Any future AI dialogue is optional presentation constrained by deterministic rules, never a source of new canon or direct state mutations.
- Validate door destinations, return paths, floor levels, and arrival spawns. Do not use scene transitions to conceal inconsistent floor plans.
- Apply the same proximity and access checks to keyboard and optional mouse interactions. Blocking UI must suppress world input.
- Allow premature accusations when that system is implemented, with authored consequences rather than a mandatory evidence-completion gate.
- Use versioned local saves through a replaceable adapter. Validate loads and preserve unreadable saves instead of silently resetting progress.

## Working and verification practices

Prefer small, testable increments with clear ownership over broad frameworks or speculative abstractions. Resolve routine implementation details within the documented boundaries; seek clarification when a decision materially changes gameplay, story canon, or architecture. The unresolved design decisions are listed in the game design document.

Before claiming a check passes, run the relevant command and inspect its result. Existing commands:

- `npm run dev-nolog`: development server, configured for port 8080.
- `npm run build-nolog`: Vite production build without the template logging script.
- `./node_modules/.bin/tsc --noEmit -p tsconfig.json`: separate TypeScript check; establish its baseline before relying on it.
- `node --test tests/*.test.mjs`: domain, collision, content, persistence, and character-animation checks using Node's built-in runner (Node 22.18+ or Node 24+; no added dependencies).

The regular `dev` and `build` scripts also exist and invoke `log.js`. There is currently no test or lint script and no dedicated test runner. Do not claim those checks ran or assume Vite performs type checking. Existing lint/configuration caveats are recorded in the architecture document; handle failures explicitly rather than silently changing tooling.

When implementing rules, add focused tests for meaningful behavior such as out-of-order discovery, duplicate acquisition, testimony provenance, and save restoration. For spatial or UI work, manually verify keyboard movement, collision boundaries, both directions of transitions, input focus, and scene/subscription cleanup. Run checks proportional to the change; documentation-only work needs link, consistency, and scope review rather than new tests.

Conclude work by stating what changed, what was verified, and any unresolved decisions or limitations. Distinguish implemented behavior from proposals.
