# Bellweather lobby — proposed production spatial layout

**Status:** approved layout direction with revised seating and arrivals for review; nothing here is implemented. The current procedural lobby, its `hotel.ts` geometry, the isolated art preview, all saves, and Detective V2 remain unchanged. Coordinates below are proposed **world pixels** on the approved 1320 × 768 canvas with `(0, 0)` at the upper left. Rectangles use `(x, y, width, height)`; their right and bottom edges are exclusive. Kane's position is the center of his feet, not his head or sprite rectangle.

## Existing baseline and design change

Today the lobby in `src/content/hotel.ts` has a walk rectangle `(30, 500, 1260, 165)`, one desk obstacle `(560, 500, 220, 45)`, the street interaction at `(120, 540)`, Arthur at `(670, 575)`, and the stairs interaction at `(1170, 540)`. The default arrival is `(200, 590)`; `fromTown` is `(190, 550)` and `fromStairs` is `(1130, 555)`. The generic renderer in `src/game/adapters/drawing.ts` paints the wall/floor boundary at `y=500`. The reference-only preview instead draws an opaque 1448 × 1086 composition uniformly scaled to 1024 × 768 at world `(148, 0)`; its baked door, stairs, and wall-to-floor line do not match that baseline. Neither the reference PNG nor the temporary preview layers are spatial production art.

The target below keeps the reference's approximate **wall-to-floor boundary at `y=530`**, but asks the artist to recompose/extend the architecture across the full 1320-pixel width. It must not be made by stretching the 4:3 reference. Kane's 162-pixel silhouette may overlap the wall visually when his feet are near its base; only his **feet** may occupy the floor. Flat carpet and floor markings do not block movement.

## Plan by coordinate band

| World band | Architectural and movement intent |
| --- | --- |
| `y=0–529` | Back wall, dark wood, muted green wallpaper, doors, window, key rack, restrained fixtures. No valid player foot positions. |
| `y=530–621` | Rear part of floor. Door and stair thresholds, plants/posts, solid desk and first stair step; open approaches where obstacles allow. |
| `y=622–695` | Compact waiting area with two walk-through chair–table gaps, plus the desk approach. A route also passes above the seating group. |
| `y=696–755` | Continuous lower circulation lane. Keep `y=710` clear from `x=180` through `x=1260`. |
| `y=756–767` | Bottom visual margin, outside the proposed foot-center range. |

Proposed `walkBounds`: **`(30, 530, 1260, 238)`**. With the unchanged `FOOT_RADIUS = 13`, the initial foot-center envelope is `43 ≤ x ≤ 1277`, `543 ≤ y ≤ 755`. A foot center is valid only if it also clears every solid footprint by 13 pixels, using the existing `canStand` rule. Do not derive collision from opaque pixels or from Kane's 162-pixel visual height.

### Wall openings and fixed architecture

| Element | Proposed visible position | Player contract |
| --- | --- | --- |
| Street-facing door and glass | Frame `x=170–290`, `y=245–530`; transparent glass opening within `x=190–265`, `y=305–465` | Threshold centered at `(230, 530)`; the E anchor is on the floor at `(230, 580)`. No overhead “STREET” sign. |
| Rain-view window | Frame `x=390–585`, `y=205–485`; transparent glass opening within `x=410–565`, `y=235–450` | Exterior view rendered behind the architectural frame, never baked into it. No collision. |
| Wall between window and key rack | `x=600–690`, `y=250–530` | Continuous paneling; **no decorative elevator** in the production layout. |
| Key rack | Back wall `x=770–945`, `y=240–455` | Fixed architectural detail behind Arthur and the desk. Not an interaction in this pass. |
| Staircase opening | `x=1090–1300`, `y=180–555`; visible first step reaches `y=556` | Existing E portal to the separate staircase scene. It is not a new walkable flight in the lobby. Approach at `(1175, 595)`. |

### Proposed solid floor footprints

These are **collision rectangles**, not art crop boxes. The artist may extend silhouettes and shadows beyond them, provided the player's feet cannot visibly pass through the physical base. The existing collision resolver expands them by the 13-pixel foot radius.

| Solid object | Rectangle `(x, y, w, h)` | Visual/route note |
| --- | --- | --- |
| Potted plant at west wall | `(70, 540, 95, 75)` | Separate foreground art; does not cover the street approach at `x=230`. |
| West architectural post base | `(320, 495, 32, 70)` | Projects into floor to `y=565`; Kane can pass below it. |
| Left upholstered chair | `(270, 625, 70, 50)` | Faces the compact waiting area; pass on either side. |
| Small seating table | `(425, 645, 70, 35)` | Low solid base between the chairs; artwork extends upward. |
| Right upholstered chair | `(580, 625, 75, 50)` | Leaves a second full walking gap to the table. |
| Reception desk | `(730, 530, 280, 80)` | Shifted 20 pixels right within the approved reception area to keep a comfortable gap from seating; Arthur stands behind it. Approach from `y>623`. |
| East architectural post base | `(1025, 495, 32, 70)` | Separates desk and stair composition without blocking the lower lane. |
| First stair step/landing face | `(1110, 530, 155, 26)` | Prevents Kane's feet from crossing into the painted stair flight; the portal anchor remains in front. |

The chair–table gaps are each **85 pixels wide in the physical footprints**: `x=340–425` and `x=495–580`. Subtracting Kane's 13-pixel radius on both sides leaves **59 pixels of foot-center clearance** in each, at `x=353–412` and `x=508–567`. These are walking lanes, not barely passable cracks. The right chair also leaves 75 physical pixels to the shifted desk (`x=655–730`), or 49 pixels of foot-center clearance. The cluster spans only `x=270–655`, keeping it a compact waiting area.

Kane can travel **between** chair and table through the two gaps (for example at `x=382` or `x=538`, from `y=585` to `y>700`), **above** the cluster at roughly `y=590–610`, or **below** it at `y≥696`. The continuous lower route at **`y=710`** connects street, Arthur, and stairs; the desk blocks the upper route across its own width. These routes and the revised anchors/arrivals below were checked in memory with the existing `canStand` and `stepMovement` rules, `FOOT_RADIUS=13`, and current interior movement configuration. The old lobby's narrow walk band and desk obstacle must not be reused with the new artwork.

## Stable interactions and safe arrivals

Keep the existing interaction IDs and destinations. The anchors are reachable standing positions, not centers of wall graphics. Keep the 86-pixel interaction radius and the present E/keyboard behavior.

| ID or entry | Proposed foot position and facing | Why it is safe |
| --- | --- | --- |
| `lobby-town` | Anchor `(230, 580)` | 50 pixels in front of the street threshold; clear of plant/post. Destination remains `town/fromHotel`. |
| `receptionist` | Anchor `(870, 670)` | In front of the shifted desk, directly below Arthur/key rack; conversation ID remains `reception`. |
| `lobby-stairs` | Anchor `(1175, 595)` | In front of the blocked first step. Destination remains `staircase/fromLobby`. |
| `arrival` | `(245, 710)`, facing right | New-session start in the lower lane. |
| `fromTown` | `(230, 690)`, facing right | Directly below the street threshold; 110 pixels from its E anchor, beyond the 86-pixel trigger radius. |
| `fromStairs` | `(1175, 700)`, facing left | Directly below the stair approach; 105 pixels from its E anchor, beyond the 86-pixel trigger radius. |

The reciprocal entry positions **in `town` and `staircase` remain unchanged** for this proposal. The revised arrivals line up horizontally with their visible entrances and place Kane's tall sprite on the floor in front of each threshold; neither starts within E range of the exit. Before implementation, validate each new lobby entry/anchor with `canStand`, walk from each arrival to all three interactions using the existing movement resolver, and test both directions of both portals. Arthur's visual should have its own presentation anchor near `(870, 555)` behind the counter; that is not a player foot position or a second NPC state.

## Occlusion and asset alignment

All production images share a **1320 × 768 master canvas** and top-left origin `(0, 0)`. Export full-canvas RGBA layers for `exterior-door`, `exterior-window`, `architecture`, `floor`, and optional `lighting`. Outside their intended painted regions, pixels must be transparent. The architectural layer retains wooden frames and panes but leaves the specified **glass openings transparent**; exterior variants sit behind it and can later change with weather/time without repainting interior woodwork. The opaque approved reference cannot supply those openings by cropping. The artist must provide aligned exports/recomposition, not an automatic resize or procedural redraw.

Suggested crop boxes for separate objects are **placement targets**, to be finalized against actual art before export. Each crop records its top-left master-canvas coordinate; do not auto-trim it afterward:

| Future asset | Crop `(x, y, w, h)` | Suggested depth/contact rule |
| --- | --- | --- |
| `arthur.png` | `(825, 390, 90, 170)` | Behind desk; visual feet around `y=555`. |
| `desk.png` | `(710, 390, 320, 245)` | Sort near physical front `y=610`; artwork can reach `y=635`. |
| `chair-left.png` | `(255, 560, 100, 135)` | Sort at base `y=675`; keep painted arms out of the adjacent walking gap. |
| `table.png` | `(410, 600, 100, 95)` | Sort at base `y=680`; keep its footprint visually compact. |
| `chair-right.png` | `(565, 560, 105, 135)` | Sort at base `y=675`; keep painted arms out of the adjacent walking gap. |
| `plant.png` | `(50, 435, 135, 200)` | Sort near base `y=615`; Kane behind at shallower foot y and in front farther downfloor. |
| `post-west.png` | `(300, 310, 65, 270)` | Foreground occlusion around base `y=565`. |
| `post-east.png` | `(1005, 310, 65, 270)` | Foreground occlusion around base `y=565`. |
| `stair-rail.png` | `(1070, 330, 245, 300)` | Foreground over the flight edge; avoid obscuring the E approach. |

Suggested back-to-front ordering: exterior views → architecture → floor → Arthur → desk/furniture/plant/posts/rail according to their **floor-contact depth** → player according to foot `y` → subtle lighting. A single full-room foreground image must not cover Kane everywhere. Furniture front faces should cover him only when his foot position is farther back than their contact line; when he walks in front, he should cover them. Keep UI prompts above world art. This is a layer contract, not a request to create art in this phase.

## Existing-save migration required before activation

`parseSave` currently checks saved coordinates with the **current** location's `canStand`; a new obstacle can therefore make an otherwise valid old save unreadable. Examples include an old lobby position near `(800, 560)` (new desk), `(315, 650)` (new chair), `(450, 660)` (new table), or `(1130, 555)` (new first stair step). The proposed higher floor boundary also invalidates some previously valid shallow positions.

Before switching the playable lobby, add an explicit **content-layout migration** (or equivalent versioned save migration) for old `bellweather-1` positions. Validate the incoming position against the old layout first; if it was legitimate but is blocked in the new layout, relocate only the player's lobby coordinates to a documented safe point such as `(245, 710)`, retaining location, facing where sensible, discoveries, case states/history, NPC memories, and all timestamps. Preserve positions that remain valid. Never treat malformed or unsupported saves as relocatable, and never overwrite an unreadable original save. Write the upgraded version only through the normal validated save path. Test old saves at the desk, chairs, stairs and wall edge, plus unaffected positions and non-lobby locations. Do not change the save key or schema merely to move furniture; choose the content-version strategy before activation.

## Remaining concerns before art production

- The approved `y=530` floor line and 1320-pixel width require an aligned new export. The 4:3 opaque reference cannot be stretched into this map or used to infer collision.
- The 85-pixel furniture gaps are comfortable under the foot-circle rule, but the illustrated chair arms and table top must also leave those visible passages clear. Check at gameplay scale against Detective V2 before locking each crop box.
- The old-save migration described above must ship **with**, not after, any playable collision change. The current save implementation is untouched by this specification.
