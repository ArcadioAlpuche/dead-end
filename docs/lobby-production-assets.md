# Bellweather lobby — production art export contract

**Status:** candidate illustrated exports are present for review. This contract implements only an isolated art preview; the normal playable lobby, its collisions/interactions, saves, and Detective V2 are unchanged. The approved spatial plan is in [lobby-production-layout.md](lobby-production-layout.md).

## First architectural milestone

Export **four** 8-bit RGBA PNGs to `public/assets/locations/bellweather/lobby/production/`. Each must be exactly **1320 × 768 pixels**, with the same top-left master-canvas origin `(0, 0)`. Do not crop, auto-trim, pad, rescale, or stretch an export. Filename case must match exactly. `LOBBY_PRODUCTION_LAYERS` in `src/game/adapters/lobbyProductionArt.ts` is the loading and depth contract.

| Back-to-front | Filename | Depth | Painted region and transparency |
| --- | --- | ---: | --- |
| 1 | `exterior-door.png` | −400 | Exterior view only behind the street-door glass opening, approximately `x=190–265, y=305–465`; transparent elsewhere. No weather baked in. |
| 2 | `exterior-window.png` | −390 | Exterior view only behind the window glass opening, approximately `x=410–565, y=235–450`; transparent elsewhere. Independent from the door view and weather-neutral. |
| 3 | `architecture.png` | −300 | Permanent wall, wallpaper, trim, street-door frame, window frame, key rack and staircase. Street-door frame `x=170–290, y=245–530`; window frame `x=390–585, y=205–485`; staircase `x=1090–1300, y=180–555`. The two glass openings must remain transparent so the exterior layers show through. Transparent over the floor except for approved architectural overlap such as the first stair step. No furniture, characters, exterior views, rain, or lighting effects. |
| 4 | `floor.png` | −200 | Wood and carpet on the floor from **y=530** through the bottom of the world. Transparent above y=530. No furniture, characters, or weather. Avoid an opaque strip that covers the stair step or door threshold. |

The wall-to-floor transition is at **y=530**. The street threshold is centered at `(230,530)` and the staircase approach centers on `x=1175`. These are placement targets from the approved layout, not permission to resize the opaque 1448 × 1086 reference. The artist must recompose/extend the architecture at the world aspect ratio and export aligned transparent layers. The existing reference remains an untouched composition comparison.

The four architectural PNGs remain required. Arthur and the desk are now separate **optional** preview exports in the same directory. Both use a full **1320 × 768 RGBA** canvas and `(0,0)` origin; neither is stretched or cropped in-engine. Missing or wrong-size optional files are skipped without marking the four-layer architectural preview incomplete.

| Optional PNG | Depth | Placement rule |
| --- | ---: | --- |
| `arthur.png` | 500 | Behind the desk and in front of architecture/floor. No NPC state or interaction is created by the art. |
| `desk.png` | 590 | In front of Arthur; Kane sorts by his foot `y` and appears in front after clearing the painted base at `y=590`. |

### Approved Option B Arthur

Option B Arthur, with his original darker vest and static pose, is the approved default in the isolated development production preview. Add `&arthur=original` to compare the earlier full-canvas `arthur.png`. The selected cutout is `public/assets/characters/arthur-finch/arthur-option-b-cutout.png`; if missing or the wrong size, the preview warns and falls back to the original. The approved source `arthur-option-b-approved.png` remains unchanged. Its canvas is 1024 × 1536 RGBA and mostly transparent already; the painted oval floor shadow was removed from the separate cutout by changing alpha only. Arthur's character pixels and RGB channels were preserved. The cutout's visible bounds at alpha ≥ 128 are `x=253–752, y=29–1498`.

Option B is centered at world **`x=730`**, aligned with the desk emblem, with an implied foot anchor at **`y=535`**, full visible height **170 world pixels**, and depth `500`, behind the unchanged desk at depth `590`. The scale is `170 / 1470 ≈ 0.11565`, based on visible artwork rather than the 1536-pixel canvas. The desk covers his hands and lower body while his head, shoulders, and upper torso remain visible above the counter. These are presentation coordinates only; they do not change an NPC interaction anchor or collision.

Optional tuning parameters are `arthurX=730` (700–1000), `arthurY=535` (foot y, 500–650), and `arthurHeight=170` (visible world pixels, 120–240). Invalid values use the defaults. The original comparison is `?lobbyPreview=1&production=1&kaneIdle=1&arthur=original`; the redesigned default is `?lobbyPreview=1&production=1&kaneIdle=1`. Add `&arthurHeight=185&arthurX=840` to revisit the earlier larger placement. All Arthur flags are ignored outside the development production preview.

Chairs, table, plant, posts, stair rail, and other foreground objects remain separate future exports so they can be sorted around Kane by floor-contact depth. Optional localized lighting and weather/time variants also remain future layers; permanent architecture and floor should stay neutral enough to support them. Future objects may use documented crop coordinates from the layout spec, but all six currently declared exports use the full shared canvas.

## Isolated in-engine check

Run `npm run dev-nolog` and open `http://localhost:8080/?lobbyPreview=1&production=1`. This development-only scene queues the four required and two optional production paths. It draws every valid texture at `(0,0)` at native scale and warns only when a required layer is missing or wrong-size. It **does not draw replacement scenery**. Detective V2 retains his current sprite, scale and foot anchor. The preview's local floor envelope starts at y=530 and applies one desk-body collision rectangle, `(440,530,580,60)`, using the existing 13-pixel foot radius. It has no interactions or saves. The playable lobby in `hotel.ts` retains its old collision plan until a separate, save-compatible activation milestone.

Add `&kaneIdle=1` to the production preview URL to substitute the approved E-style Kane idle/walk sprite. The legacy flag name is retained for existing preview links. At full horizontal speed, the six-frame walk plays near 12 FPS; stopping returns to the static idle. The character keeps the same world foot position, 145-pixel visible height, and per-clip left/right mirroring as the isolated character comparison. If the walk sheet is missing or invalid, the static idle remains available; without either E-style texture, V2 remains visible. The standard preview still shows V2, and no playable lobby character changes.

Add `&debug=1` to this URL to show a preview-only spatial overlay. Cyan outlines the configured walk rectangle `(30,530,1260,238)`; amber outlines the valid foot-center range after the 13-pixel radius inset; magenta marks Kane's foot center and its 13-pixel radius. A fixed label shows his world coordinates. The marks appear only in the development production preview and do not alter movement or collision.

The same debug flag outlines the eight proposed solid footprints from the approved [production layout](lobby-production-layout.md) in orange, including the earlier `(730,530,280,80)` desk proposal. Green marks the proposed staircase interaction anchor `(1175,595)` and its 86-pixel E radius. Orange marks are **visual planning marks only**. A blue outline marks the active preview-only desk collision. The current `desk.png` has alpha bounds `x=440–1019, y=365–589` and a wide lower body; the earlier proposed footprint covers only its right half. This preview correction leaves the approved production-layout proposal and the playable lobby unchanged. Kane can still walk through the other orange marks.

`?lobbyPreview=1` still shows the six explicitly temporary test layers. `?lobbyPreview=1&reference=1` still shows the unchanged opaque reference at uniform scale; if both `reference=1` and `production=1` are supplied, the reference comparison takes priority. A production build ignores all preview query flags.

Before accepting delivered art, inspect PNG dimensions, RGBA color type and transparent regions programmatically. Then verify in-engine at 1×: door/window alignment, the y=530 seam, V2 foot contact, alpha fringes, pan to both world edges, and relative scale. Browser image loading checks dimensions but cannot prove that the illustration actually contains transparent openings or excludes baked-in weather and furniture. The architectural exports will be reviewed before any playable collision or save migration is attempted.
