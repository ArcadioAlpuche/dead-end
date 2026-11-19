# Bellweather lobby — proposed production spatial layout

**Status:** the approved illustrated architecture, floor, wide desk, static Option B Arthur, and the tested stair-base footprint are active in the playable lobby. Chair, table, and plant footprints below remain proposals until matching artwork exists. The isolated art preview remains available. Coordinates are **world pixels** on the 1320 × 768 canvas with `(0, 0)` at the upper left. Rectangles use `(x, y, width, height)`; their right and bottom edges are exclusive. Kane's position is the center of his feet, not his head or sprite rectangle.

## Existing baseline and design change

Before activation, the procedural lobby had a walk rectangle `(30, 500, 1260, 165)`, one desk obstacle `(560, 500, 220, 45)`, the street interaction at `(120, 540)`, Arthur at `(670, 575)`, and the stairs interaction at `(1170, 540)`. Its arrivals were `(200, 590)`, `fromTown (190, 550)`, and `fromStairs (1130, 555)`. Those historical values are retained only for save migration. The reference-only preview draws a separate opaque 1448 × 1086 composition; it is not spatial production art.

The aligned production exports keep the **wall-to-floor boundary at `y=530`** without stretching the 4:3 reference. Kane's 145-pixel E-style silhouette may overlap the wall visually when his feet are near its base; only his **feet** may occupy the floor. Flat carpet and floor markings do not block movement.

## Plan by coordinate band

| World band | Architectural and movement intent |
| --- | --- |
| `y=0–529` | Back wall, dark wood, muted green wallpaper, doors, window, key rack, restrained fixtures. No valid player foot positions. |
| `y=530–621` | Rear part of floor. Door and stair thresholds, solid desk and first stair step; plant and post proposals do not block movement. |
| `y=622–695` | Open desk approach. The compact waiting area and chair–table gaps remain reserved for future matching art. |
| `y=696–755` | Continuous lower circulation lane. Keep `y=710` clear from `x=180` through `x=1260`. |
| `y=756–767` | Bottom visual margin, outside the proposed foot-center range. |

Active `walkBounds`: **`(30, 550, 1260, 218)`**. The artwork still transitions from wall to floor at `y=530`; the playable foot boundary is 20 pixels forward. With `FOOT_RADIUS = 13`, the foot-center envelope is `43 ≤ x ≤ 1277`, `563 ≤ y ≤ 755`. A foot center is valid only if it also clears every active solid footprint by 13 pixels, using `canStand`. Collision comes from feet, not opaque pixels or Kane's 145-pixel visual height.

### Wall openings and fixed architecture

| Element | Proposed visible position | Player contract |
| --- | --- | --- |
| Street-facing door and glass | Frame `x=170–290`, `y=245–530`; transparent glass opening within `x=190–265`, `y=305–465` | Threshold centered at `(230, 530)`; the E anchor is on the floor at `(230, 580)`. No overhead “STREET” sign. |
| Rain-view window | Frame `x=390–585`, `y=205–485`; transparent glass opening within `x=410–565`, `y=235–450` | Exterior view rendered behind the architectural frame, never baked into it. No collision. |
| Wall between window and key rack | `x=600–690`, `y=250–530` | Continuous paneling; **no decorative elevator** in the production layout. |
| Key rack | Back wall `x=770–945`, `y=240–455` | Fixed architectural detail behind Arthur and the desk. Not an interaction in this pass. |
| Staircase opening | Upper flight `x=1090–1300`, `y=180–555`; painted bottom-step base extends roughly `x=1050–1300`, `y=530–570` in the current production PNGs | Existing E portal to the separate staircase scene. It is not a new walkable flight in the lobby. Approach at `(1175, 595)`. |

### Proposed solid floor footprints

These are **collision rectangles**, not art crop boxes. The artist may extend silhouettes and shadows beyond them, provided the player's feet cannot visibly pass through the physical base. The existing collision resolver expands them by the 13-pixel foot radius.

| Solid object | Rectangle `(x, y, w, h)` | Visual/route note |
| --- | --- | --- |
| Potted plant at west wall | `(70, 540, 95, 75)` | **Deferred** until matching foreground art exists. |
| West architectural post base | `(320, 495, 32, 70)` | **Removed from playable collision after playtest.** The illustrated floor beside the desk is open; this footprint was invisible. |
| Left upholstered chair | `(270, 625, 70, 50)` | **Deferred** until matching art exists. |
| Small seating table | `(425, 645, 70, 35)` | **Deferred** until matching art exists. |
| Right upholstered chair | `(580, 625, 75, 50)` | **Deferred** until matching art exists. |
| Reception desk | **`(440, 530, 580, 60)`** | **Active.** Matches the approved painted counter body; props above `y=530` are visual. Kane can approach from `y≥603`. |
| East architectural post base | `(1025, 495, 32, 70)` | **Removed from playable collision after playtest.** The desk and stair base provide the required solids. |
| Painted bottom stair base | **`(1050, 530, 250, 40)`** | **Active.** Covers the visible lower step from `x=1050–1300`, `y=530–570`, including `(1194,543)`. It meets the east-post footprint at `x=1050–1057`. |

The earlier chair–table gaps are **not yet a playable collision contract**. The approved wide desk extends to `x=440`, so the old chair and table placement must be reviewed against the actual desk silhouette before furniture art or footprints are activated. No invisible chair, table, or plant blocks Kane in this pass.

Kane can walk in front of the counter, around either end where the desk and stair base allow, and along the continuous lower route at **`y=710`** from street to stairs. The desk blocks the upper route across its width. The active geometry and arrivals are checked with `canStand` and `stepMovement`, using `FOOT_RADIUS=13` and the unchanged interior movement configuration.

The stair base excludes foot centers inside its 13-pixel expansion (`1037 < x < 1313`, `517 < y < 583` under `canStand`). Kane cannot stand at `(1194,543)`. The stair anchor `(1175,595)` is **25 pixels beyond the solid base**, leaving **12 pixels of clearance after Kane's foot radius**; walking up from `fromStairs (1090,625)` reaches its 86-pixel interaction radius from the left side. The clear lower route at `y=710` remains at least 140 pixels below the base. The isolated preview still uses its own desk-only collision.

## Stable interactions and safe arrivals

Keep the existing interaction IDs and destinations. The anchors are reachable standing positions, not centers of wall graphics. Keep the 86-pixel interaction radius and the present E/keyboard behavior.

| ID or entry | Proposed foot position and facing | Why it is safe |
| --- | --- | --- |
| `lobby-town` | Anchor `(230, 580)` | 50 pixels in front of the street threshold; clear of plant/post. Destination remains `town/fromHotel`. |
| `receptionist` | Anchor **`(730, 660)`** | In front of Arthur at `x=730`, beyond the desk's radius-expanded front edge at `y=603`; conversation ID remains `reception`. |
| `lobby-stairs` | Anchor `(1175, 595)` | In front of the revised bottom-step base, outside its 13-pixel foot expansion. Destination remains `staircase/fromLobby`. |
| `arrival` | `(245, 710)`, facing right | New-session start in the lower lane. |
| `fromTown` | `(285, 650)`, facing right | Beside the upper carpet and door approach, 89 pixels from the street E anchor; clear of the desk. |
| `fromStairs` | `(1090, 625)`, facing left | Beside the stair base rather than at the bottom carpet edge, 90 pixels from its E anchor and clear of the desk. |

The reciprocal entry positions **in `town` and `staircase` remain unchanged**. The revised arrivals line up horizontally with their visible entrances; neither starts within E range of the return exit. Arthur's approved visual remains centered at `(730, 535)` behind the counter, at 170 world pixels of visible height. This presentation anchor is not a player foot position or a second NPC state.

## Occlusion and asset alignment

All production images share a **1320 × 768 master canvas** and top-left origin `(0, 0)`. Export full-canvas RGBA layers for `exterior-door`, `exterior-window`, `architecture`, `floor`, and optional `lighting`. Outside their intended painted regions, pixels must be transparent. The architectural layer retains wooden frames and panes but leaves the specified **glass openings transparent**; exterior variants sit behind it and can later change with weather/time without repainting interior woodwork. The opaque approved reference cannot supply those openings by cropping. The artist must provide aligned exports/recomposition, not an automatic resize or procedural redraw.

Suggested crop boxes for separate objects are **placement targets**, to be finalized against actual art before export. Each crop records its top-left master-canvas coordinate; do not auto-trim it afterward:

| Future asset | Crop `(x, y, w, h)` | Suggested depth/contact rule |
| --- | --- | --- |
| Approved Option B Arthur cutout | 1024 × 1536 source canvas | Draw at center `x=730`, foot `y=535`, visible height 170, depth 500, behind the desk. |
| `desk.png` | Alpha bounds `x=440–1019, y=365–589` | Full-canvas 1320 × 768 layer at depth 590; active collision `(440,530,580,60)`. |
| `chair-left.png` | `(255, 560, 100, 135)` | Sort at base `y=675`; keep painted arms out of the adjacent walking gap. |
| `table.png` | `(410, 600, 100, 95)` | Sort at base `y=680`; keep its footprint visually compact. |
| `chair-right.png` | `(565, 560, 105, 135)` | Sort at base `y=675`; keep painted arms out of the adjacent walking gap. |
| `plant.png` | `(50, 435, 135, 200)` | Sort near base `y=615`; Kane behind at shallower foot y and in front farther downfloor. |
| `post-west.png` | `(300, 310, 65, 270)` | Foreground occlusion around base `y=565`. |
| `post-east.png` | `(1005, 310, 65, 270)` | Foreground occlusion around base `y=565`. |
| `stair-rail.png` | `(1070, 330, 245, 300)` | Foreground over the flight edge; avoid obscuring the E approach. |

Suggested back-to-front ordering: exterior views → architecture → floor → Arthur → desk/furniture/plant/posts/rail according to their **floor-contact depth** → player according to foot `y` → subtle lighting. A single full-room foreground image must not cover Kane everywhere. Furniture front faces should cover him only when his foot position is farther back than their contact line; when he walks in front, he should cover them. Keep UI prompts above world art. This is a layer contract, not a request to create art in this phase.

## Existing-save migration required before activation

`parseSave` checks saved coordinates with the location's `canStand`. The old lobby layout allowed positions now blocked by the wide desk, stair base, or the higher floor boundary. A subsequent `bellweather-2` layout allowed feet between `y=543` and `y=562`, which the playtest found too close to the back wall. The chair and table are deferred and do not invalidate saves in this pass.

The playable migration accepts `bellweather-1` and `bellweather-2` saves only after validating their positions against their respective historical lobby geometry. If a legitimate old lobby position is now blocked, it relocates only the player to the safe `(245,710)` arrival. It preserves discoveries, case history, NPC memory, timestamps, and valid positions. At the lobby activation milestone, content revision `bellweather-3` was introduced without changing schema v4 or the existing local save key. The later NPC-identification milestone emits schema v5, retaining this same layout migration and content revision. Invalid or unsupported saves remain unreadable and are not overwritten by the loader.

## Remaining visual review

- The bright vertical strip at the desk's left/front edge is baked into `desk.png`: source pixels around `(445,480)` are fully opaque near-white. It is not a layer seam or scaling artifact. The approved PNG remains unchanged pending review of a minimal corrected export.
- Review the approved `y=530` floor line and painted stair base in motion; the stair portal remains an E transition, not a walkable flight.
- Chair, table, and plant artwork is absent. Revisit their placement and walking gaps against the wide desk before enabling their proposed footprints.
- E-style Kane is active in the lobby; the other interiors retain Detective V2 pending their own visual upgrades.
