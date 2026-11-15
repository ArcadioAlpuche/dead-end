# Dead End — Architecture

Status: implemented exploration slice plus the original inspected template baseline and expansion plan. Product behavior is defined in [game-design.md](game-design.md).

## Implemented exploration slice

- `src/content/hotel.ts` defines the four locations, named entries, collision footprints, props, interactions, record definitions, and dialogue. Add content there using the contracts in `src/core/model.ts`; `validateWorld` checks reference integrity, safe entries, interaction anchors, and return paths.
- `src/core/session.ts` owns player state, proximity selection, interaction rules, dialogue progression, discovered knowledge, and blocking UI mode. The public snapshot omits continuous player coordinates so React does not rerender every frame. There is no case-acceptance or inventory system yet.
- `src/game/scenes/Game.ts` is a reusable location renderer. `adapters/drawing.ts` creates placeholder geometry; `adapters/movement.ts` executes accelerated kinematic movement, axis-separated foot collisions, and substeps. Shared pure spatial checks live in `src/core/spatial.ts`. No physics plugin is required for this small slice.
- `src/ui/Notebook.tsx` and `Dialogue.tsx` render session snapshots. `App.tsx` coordinates notebook/Escape shortcuts and leaves typing to the conversation UI. Enter submits and Shift+Enter inserts a newline. Notebook arrows scroll notes while movement is blocked. The template scene-ready event and `PhaserGame.tsx` lifecycle bridge remain, with listener-specific cleanup.
- `src/runtime.ts` composes the single session and local persistence. `src/persistence/localSave.ts` preserves invalid saves and reports storage failures. Schema v2 saves contain player state, discovery IDs/timestamps, and significant NPC memory events, not conversation transcripts, duplicated record text, or scene objects. Normal movement is checkpointed every two seconds; state changes and page hiding also trigger saves. A crash may lose the last two seconds of movement.
- Startup follows the existing Boot → Preloader → Game path; the template MainMenu/GameOver examples and assets remain available. The game retains its 1024 × 768 logical resolution and uses FIT scaling with a bounded horizontal follow camera. Build tooling, dependencies, and Vite/TypeScript configuration are unchanged.

All placeholder locations are synchronous and resident in memory. Portal commands validate a named destination, commit location/position together, and restart the shared scene with a short fade. There is no asynchronous asset-loading transition yet; introduce a prepare/commit phase before adding such loading.

The test suite uses Node's built-in test runner and native TypeScript stripping: `node --test tests/*.test.mjs` (Node 22.18+ or Node 24+). No dependency or package-script change is needed. The template's absent package `type` declaration can produce a harmless Node module-detection warning; do not change module configuration just to suppress it.

Current limits: desktop keyboard input, placeholder art, one local save per browser origin, no in-game save reset/recovery UI, abbreviated stair travel, and no case or inventory systems. An unreadable save starts a temporary unsaved session and remains untouched. Optional mouse world interactions, audio, mobile controls, and final story content are deferred.

## Free-form conversations and NPC memory

- `core/conversation.ts` defines the async `ConversationResponder` boundary, text limits, and deliberately narrow deterministic topic classification. `conversation/mockResponder.ts` supplies mock presentation replies; `runtime.ts` injects it into the session. The core imports neither React, Phaser, storage, nor the concrete adapter.
- `hotel.ts` contains stable NPC identity, greeting, and the existing authored account/room lines. `GameSession` owns the active transcript and pending/error state, validates submissions, selects authored lines, and records discoveries. The adapter receives copied current-conversation text and that NPC's memory only; it receives no session reference, world definitions, or hidden solution data. Its return type is text, with no effects or record IDs. Core-selected authored account text is appended separately and can grant its existing testimony record; generated text cannot do so.
- Only a complete “I accuse you” or “I accuse the receptionist” statement triggers the `accused` memory event (case/whitespace normalized, optional final `.` or `!`). A memory stores `npcId`, `kind`, `locationId`, and `recordedAt`. The `(npcId, kind)` pair is unique: this slice remembers the first accusation, not a complete accusation history. The core records it on accepted submission before requesting a response, so leaving or a response failure does not erase the player's statement.
- Active transcripts are transient, capped at 80 lines, and reset on exit/reload. Messages are trimmed, nonblank, and at most 2,000 characters. One request may be pending at a time. Failure releases input and shows an error; closing invalidates late replies, including their possible authored testimony. A future network adapter must implement transport cancellation/timeouts and output validation; this slice uses no network or AI credentials.
- `Dialogue.tsx` owns the draft, scrolling and focus trap; `conversationInput.ts` defines Enter/repeat/composition handling. `App.tsx` bypasses world shortcuts while dialogue is active except Escape. React stops keyboard bubbling from the panel, and Phaser's keyboard plugin is disabled while blocking UI is open. This permits WASD/E, cursor keys, Tab focus navigation, and Shift+Enter editing without game actions.
- Durable memory is separate from knowledge: an accusation is a historical player interaction, not testimony proving an allegation. No numeric relationship or case-resolution system is added.

### Save migration

`SavedGame` now emits schema version `2`, retaining content version `bellweather-1` because existing record IDs and meanings are unchanged. `parseSave` validates v1 data and migrates it to v2 with empty `npcMemories`, preserving player location/facing and all discovery timestamps. It validates v2 memory types, NPC/location references, timestamps and uniqueness. No accusations are inferred from old discoveries.

The storage key remains `dead-end.bellweather.v1` deliberately: its suffix is historical, while the envelope controls versioning. Loading alone does not write; the next normal autosave writes the migrated envelope to the same slot. Unsupported versions, invalid references, corrupt JSON, and malformed memory remain protected by the existing unsaved-session warning. Older application builds cannot read new v2 saves; they preserve them as unsupported rather than discarding them. There is still no recovery UI or downgrade migration.

## Character animation

`src/game/characters/animation.ts` owns a presentation-only idle/walk/special-idle controller; `PlayerVisual.ts` adapts it to a Phaser sprite or the existing placeholder geometry. `detective.ts` configures sheets, frame order/rates, visual origin/scale, mirroring, and optional idle timing. `spriteAssets.ts` handles preload and validates required textures before registering reusable game-global animations. The approved simplified V2 milestone uses one 2048 × 256 PNG with eight 256 × 256 cells: walk frames 0–6 at 8 FPS (redundant frame 7 omitted from the loop) and static frame 0 for idle, with no special idle. A scale of `162 / 220` and origin `(0.5, 240 / 256)` retain the prior visible height and floor anchor. `detectiveVariant` switches between this configuration and the preserved original detective without changing scene or loader logic. No per-frame offsets are configured. Required-asset failures still select the placeholder.

The scene reports collision-resolved speed and facing to the controller while retaining its existing position/depth/camera updates. Animation state is not authoritative world state and is not persisted. `FOOT_RADIUS`, movement, interaction rules, named entries, dialogue, notebook, and autosave formats are unchanged. Blocking UI freezes visuals in idle; shutdown releases visual objects and their completion listeners.

The active asset directory is `public/assets/characters/detective-v2/`; original assets remain in `public/assets/characters/detective/`. See [character-animation.md](character-animation.md) for the export contract, enablement steps, fallback matrix, and testing limits. The supplied artwork is used without modification.

## Inspected repository baseline

Before gameplay implementation, the repository contained the Phaser React TypeScript template, package version `1.1.0` and package name `template-react-ts`. The working tree was clean before documentation was added. Dependencies were checked through `package.json` and `npm ls --depth=0` on November 12, 2026; no dependencies were installed or changed.

| Package | Declared | Installed |
| --- | --- | --- |
| Phaser | `4.0.0` | `4.0.0` |
| React / React DOM | `^19.0.0` | `19.1.0` / `19.1.0` |
| TypeScript | `~5.7.2` | `5.7.3` |
| Vite | `^6.3.1` | `6.3.2` |
| Vite React plugin | `^4.3.4` | `4.4.1` |
| ESLint | `^9.22.0` | `9.25.1` |
| Terser | `^5.28.1` | `5.39.0` |

Other installed development dependencies include React type definitions, `@eslint/js`, `typescript-eslint`, React Hooks and React Refresh lint plugins, and `globals`. There is no dedicated test runner, routing library, persistence library, or state-management library declared. Although the package description mentions Phaser 3, the declared and installed engine is Phaser 4. Do not downgrade it based on the description.

Original template structure and responsibilities (historical baseline):

| Path | Current behavior |
| --- | --- |
| `src/main.tsx` | Mounts React under Strict Mode. |
| `src/App.tsx` | Template demo controls; directly manipulates scenes and demo sprites. |
| `src/PhaserGame.tsx` | Creates/destroys the Phaser instance and exposes game/scene references to React. |
| `src/game/main.ts` | Creates a 1024 × 768 Phaser game using `AUTO`; registers the template scenes. No physics configuration is present. |
| `src/game/EventBus.ts` | Shared Phaser event emitter, including `current-scene-ready`. |
| `src/game/scenes/` | `Boot`, `Preloader`, `MainMenu`, `Game`, and `GameOver` template scenes. |
| `public/assets/` | Template background, logo, and star images. |
| `public/style.css`, `index.html` | Template styles and page shell. |
| `vite/config.dev.mjs` | React plugin, relative base path, development port 8080. |
| `vite/config.prod.mjs` | React plugin, relative base path, separate Phaser chunk, Terser minification. |

Preserve this template and its configuration. The proposed structure extends it incrementally; it is not a request to replace the scaffold, rename package metadata, or change build tooling. Existing demo shortcuts are examples, not the model for authoritative gameplay state.

## Ownership boundaries

| Layer | Owns | Must not own |
| --- | --- | --- |
| Phaser adapters and scenes | World rendering, input sampling, movement and collision execution, cameras, animation, scene lifecycle. | Case truth, evidence acquisition rules, inventory transactions, or durable narrative state. |
| React UI | Notebook, dialogue, inventory, menus, accessible controls, transient presentation state. | Independent copies of authoritative gameplay state or direct gameplay mutations on scene objects. |
| Framework-independent TypeScript systems | Authoritative world state, player location, interactions, evidence, knowledge, cases, inventory, and later money/relationships. | Phaser objects, React components, browser storage APIs, or rendering concerns. |
| Authored content | Location topology, characters, interactions, dialogue, evidence, case facts, and solutions. | Runtime mutable state or executable UI code. |
| Persistence adapter | Reading/writing and validating local save envelopes. | Deciding case outcomes or inferring missing facts. |

Phaser executes continuous movement and collision resolution. Its adapter reports resolved player position to the TypeScript session, which retains the authoritative location and position used by interaction checks, transitions, and saves. Do not publish every frame to React. Scene-local velocity, tweens, cameras, and sprites are transient; restoring a scene reconstructs them from the session and content.

Keep the core dependency direction inward: Phaser, React, and persistence adapters depend on core types and commands; the core imports none of those adapters. The existing Phaser-backed `EventBus` stays outside the core.

## Proposed module layout

Create modules only when a feature needs them; this is a responsibility map, not a requirement to create empty folders.

```text
src/
  App.tsx                     # Existing React shell / future composition point
  PhaserGame.tsx              # Existing engine lifecycle bridge
  core/
    model/                    # Serializable state, IDs, knowledge provenance
    systems/                  # Interaction, evidence, case, inventory rules
    session.ts                # Commands, snapshots, subscriptions
  content/
    locations/                # Room geometry, connections, spawns
    characters/               # People and authored dialogue
    interactions/             # Inspect, talk, door and item definitions
    evidence/                 # Evidence definitions independent of cases
    cases/                    # Offers, associations, facts, resolution rules
  game/
    main.ts                   # Existing Phaser configuration and startup
    EventBus.ts               # Existing presentation bridge
    scenes/                   # Existing scenes; future thin location scenes
    adapters/                 # Input, spatial reports, session subscriptions
  ui/                         # React notebook, dialogue, inventory
  persistence/                # Local storage and save validation/migration
public/assets/                # Existing asset convention
```

Use stable IDs for references across authored data, state, and saves. Prefer typed TypeScript definitions initially, with serializable values and explicit condition/effect types. Validate references and topology; TypeScript alone cannot detect a door pointing at an absent spawn. Introduce a content editor or generalized scripting language only if authoring needs justify it.

## State and knowledge model

Separate immutable definitions from mutable state:

- **World state:** current location, player position/facing, door and object states, world event flags, NPC availability, and later relationships and money.
- **Evidence state:** discovered evidence IDs, acquisition metadata, and physical custody where applicable. Discovering evidence is idempotent and independent of case status.
- **Knowledge records:** observations, attributed testimony, verified propositions with supporting sources, and explicitly labeled deductions. Store source IDs, discovery time, claimed event time or range, and uncertainty separately.
- **Case state:** offered/accepted/resolved status, known associations, accusation history, and authored consequences. Associations do not transfer ownership of evidence to a case.
- **Inventory state:** held item instances or quantities, distinct from knowledge of those objects.

Authored case truth and solutions are available to deterministic rules but excluded from player-facing snapshots until actually learned. In a local client this is a presentation and correctness boundary, not a promise that bundled secrets cannot be inspected.

Notebook views derive from knowledge records. A witness's claim does not become a fact through repetition or case acceptance. Verification is an explicit authored rule with supporting sources. Preserve contradictions and provenance when adding corroboration. Never save a separate notebook copy that can drift away from the knowledge state.

## Commands, events, and UI integration

Use a small session service with typed commands, read-only snapshots/selectors, and subscriptions. No additional state library is needed initially. React renders selected snapshots; scenes render world state. Commands return explicit success/failure results and commit related changes together.

Example interaction flow:

1. Phaser identifies a nearby candidate from location data and the current resolved position.
2. E or an optional mouse action submits an interaction command with its target ID.
3. The core validates location, proximity, availability, input mode, and authored conditions. The adapter supplies spatial information; UI selection alone is not proof of reachability.
4. The core applies effects once, such as recording evidence and the corresponding observation, then emits a state-change notification.
5. Phaser updates the object presentation, React refreshes its notebook view, and persistence schedules a save of committed state.

Free-form dialogue submits text through `GameSession.submitMessage`. Core rules classify the narrow mock intent and own any durable changes. The response adapter returns presentation text only; React never decides that a statement is verified or that an accusation is correct. Case acceptance and broader dialogue consequences remain unimplemented.

Keep typed contracts around new bridge traffic. Retain the existing `current-scene-ready` lifecycle contract where appropriate; do not use an event emitter as a second state store. Dispose subscriptions on scene shutdown and React unmount, removing only handlers owned by that subscriber. React Strict Mode remounts must not duplicate listeners, commands, or the active game session.

An explicit input mode coordinates exploration and blocking UI. On opening dialogue or the notebook, disable the Phaser scene keyboard plugin and suppress world movement; clear held input when focus changes and resume safely when the UI closes. Keyboard and mouse routes use the same domain commands.

## Locations and transitions

Location definitions describe floor level, navigable geometry, collision boundaries, interaction anchors, and portals. Each portal identifies its destination location, destination spawn, arrival facing, and access conditions. Spawns are named data, not coordinates scattered through scene code.

For the first slice, use room-sized scene lifecycles backed by shared location behavior. Whether this uses one reusable location scene or small subclasses is an implementation choice; do not duplicate investigation rules per room.

A transition checks the portal and access conditions, locks input, loads the destination presentation, and commits the destination location and spawn when ready. On load failure, retain the last valid location and restore control. Prevent immediate retriggering at the arrival spawn. Persist only a completed transition, never a half-loaded scene.

The Bellweather location graph supports reversible travel through lobby, staircase, fourth-floor hallway, and Room 407. Validate reciprocal links unless a connection is intentionally one-way, safe spawn placement, floor labels, and stair elevation. The implementation request confirmed fourth-floor Room 407 and a side view with limited vertical depth.

## Local persistence

Start with a browser `localStorage` adapter and one local save slot for the small slice. Keep the storage interface replaceable if save size or later requirements justify IndexedDB. The core produces a serializable snapshot and does not call browser APIs.

The save envelope includes a schema version, content version, and committed mutable state. Store IDs and values, never scenes, functions, event emitters, or authored solution copies. Save after meaningful changes and completed transitions; checkpoint movement at a throttled interval rather than writing every frame. Explicitly document that abrupt closure can lose movement since the last checkpoint.

On load, validate shape, versions, references, and the player spawn before applying state. Migrate only supported old versions. Invalid, newer, or incompatible saves must produce a clear recovery choice; do not silently discard discoveries or overwrite the unreadable save. Handle unavailable storage and quota failures by keeping the session playable and showing that saving failed. Save error messages belong in React.

## Future AI dialogue boundary

The first playable uses authored dialogue only. If generated dialogue is introduced later, give it only approved character knowledge and permitted conversational context. It may vary expression but cannot establish facts, create evidence, change solutions, or mutate state.

Deterministic systems select allowed topics and effects. Generated output must be checked against that contract, with authored fallback text when it fails. Any world-changing action still goes through an authorized typed command. Generated claims cannot enter the factual notebook automatically, and hidden solution data must not be supplied merely to make dialogue more fluent.

## Incremental implementation and validation

Future implementation should proceed in small reviewable steps:

1. Define the hotel floor plan, stable IDs, minimal session state, and validated portal data.
2. Add controllable movement, collisions, input focus handling, and reversible transitions through the four spaces.
3. Add a nearby inspect interaction, evidence acquisition, and the React notebook.
4. Add authored NPC dialogue, attributed testimony, and optional case acceptance that recognizes earlier discoveries.
5. Add local persistence and exercise the complete milestone acceptance checks in the design document.

Keep each step playable and preserve the template entry points and build setup. Add focused domain tests when implementing meaningful rules: collecting twice, discovering before acceptance, preserving testimony provenance, invalid transitions, and save/load round trips. The exploration tests now use Node's built-in runner; no dedicated runner dependency is installed.

Current commands are `npm run dev`, `npm run build`, `npm run dev-nolog`, and `npm run build-nolog`. Prefer the existing `-nolog` variants for routine local checks; the other variants invoke template `log.js`. Builds use Vite and do not run TypeScript checking. A separate local check can use `./node_modules/.bin/tsc --noEmit -p tsconfig.json`; verify its baseline before treating it as a passing project check.

There are no package scripts for linting or tests. The repository has legacy `.eslintrc.cjs` alongside ESLint 9, and `tsconfig.node.json` includes `vite.config.ts` while actual Vite configs live under `vite/` as `.mjs`. These are existing configuration observations, not changes to make as part of documentation. Investigate any effect when introducing checks and report baseline failures separately.

For gameplay changes, combine appropriate domain checks, a production build, and manual browser checks for keyboard control, focus, scene travel, and reload behavior. Documentation-only changes require checking links, consistency, and change scope; no gameplay build or dependency installation is necessary.
