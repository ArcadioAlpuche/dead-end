# Bellweather lobby layer preview

Status: development-only compositor test. The six `preview-*.png` files are deliberately simple temporary test images, **not approved lobby artwork**. The playable lobby still uses `drawLocation` and its existing geometry.

## View the test

Run `npm run dev-nolog`, then open `http://localhost:8080/?lobbyPreview=1`. Move Detective V2 with WASD or the arrow keys. The preview uses the existing lobby's 13-pixel foot collision, 235/145 px/s interior movement, desk obstacle, and 1× interior camera. It has no E interactions, casebook, dialogue, or autosave; the test scene never changes `GameSession`. Remove the query parameter (or use a production build) for the normal game. A red panel and a missing/wrong-size message indicate a broken layer; neither silently substitutes final art.

For a **composition-only view** of the approved handoff, open `?lobbyPreview=1&reference=1` instead. This displays the unchanged `reference/approved-architectural-reference.png` behind Detective V2. It does not replace any transparent layer or the playable lobby. The temporary six-layer preview remains the default when `reference=1` is absent.

The preview deliberately shows the current collision plan, not a proposed new lobby layout. Its door, desk, and Arthur positions are visual alignment references only. Their production positions remain in `src/content/hotel.ts` until a separate layout change is approved and saved positions are handled.

The review-only spatial proposal for final art is in [lobby-production-layout.md](lobby-production-layout.md). It does not change this preview or the playable lobby.

## Export contract

- World canvas: **1320 × 768 world pixels**, origin `(0, 0)` at the top left. The game viewport is 1024 × 768, so horizontal camera panning reveals the whole lobby. Do not resize the canvas or change the global Phaser scale to fit one image.
- Export each layer as an **RGBA PNG** at its exact dimensions below. Transparent pixels are required outside the intended object on cropped layers and wherever one layer reveals another. Do not auto-trim after assigning its crop rectangle or add atlas padding. A cropped file's `(x, y)` is the top-left coordinate of that crop on the shared world canvas.
- Names are lowercase, hyphenated, and role-based. Replace each temporary `preview-*.png` with a final asset in a separate production path; keep preview files visibly labeled until they are retired. `LOBBY_ART_LAYERS` in `src/game/adapters/lobbyArt.ts` is the placement/depth manifest. An export with a different crop size or location requires a manifest update.
- Keep environment detail on a consistent pixel grid. Test the grid beside the unchanged 162-world-pixel Detective V2 before selecting final source resolution. The preview does **not** alter global texture filtering, camera zoom, or character scale. A future per-layer sampling choice should be reviewed against both the environment and character in-engine.

| Draw order | Temporary PNG | World position | PNG size | Depth | Intended role |
| --- | --- | --- | --- | --- | --- |
| 1 | `preview-architecture.png` | (0, 0) | 1320 × 500 | −300 | Wall, doors, windows, fixed trim |
| 2 | `preview-floor.png` | (0, 500) | 1320 × 268 | −200 | Wood and carpet under feet |
| 3 | `preview-arthur.png` | (635, 350) | 70 × 110 | 500 | Separate Arthur visual, behind desk |
| 4 | `preview-desk.png` | (540, 390) | 260 × 165 | 545 | Counter at current floor contact `y=545` |
| 5 | `preview-foreground.png` | (900, 475) | 90 × 210 | 680 | Occlusion column in front of walk band |
| 6 | `preview-lighting.png` | (0, 0) | 1320 × 768 | 900 | Optional transparent color/light overlay |

Detective V2 is positioned by his **foot anchor** at depth equal to foot `y`, between the back layers and the desk/foreground as appropriate. The desk's depth of 545 provides a sorting threshold, although the current desk collision only lets Kane approach its front. Arthur remains a separate layer; his visual is not an NPC state object. Future furniture can use the same placed-layer pattern, with collision footprints kept in content data rather than inferred from PNG transparency.

The lighting image is a conventional alpha overlay, not dynamic lighting or a promise of the final grade. The final environment can omit it or replace it with multiple localized overlays. Final art should be reviewed at FIT-scaled browser sizes for seams, blur, alpha fringes, foot alignment, and contrast against V2.

## Approved architectural reference: preparation limits

The handoff PNG is **1448 × 1086, 8-bit RGB**, with no alpha channel. Its 4:3 aspect ratio differs from the 1320 × 768 world canvas (55:32, about 1.719:1). Stretching it to the canvas would use different horizontal and vertical scales and distort the architecture. Fitting the entire image to the 768-pixel world height uses one scale, `768 / 1086`, yielding **1024 × 768** at `(148, 0)` with 148-pixel margins on each side. Fitting its width instead would yield 1320 × 990 and crop about 222 vertical pixels. The reference preview chooses the full-height fit to preserve the complete composition. It is a reduced, uniformly scaled comparison, not a production export; the original PNG bytes are preserved. The existing 1320-pixel world, collision, and camera remain unchanged, so the side margins and current desk obstacle are **not** an approved layout.

The street scenes visible through the door and window are baked into this opaque image. The plant, staircase, key cubbies, and lighting are also baked in. The reference door and stairs do not align with the current playable lobby's interaction anchors or collision plan. Cropping the image or adding a second exterior image on top would not create true independent openings. A production handoff needs an aligned architecture export with transparent glass/opening regions and a separate exterior-view PNG behind it, plus separate desk, Arthur, and foreground occlusion exports. Those assets should share the target world-canvas origin or carry explicit crop coordinates in the layer manifest. The architectural export should not lock daytime/rain conditions into permanent interior pixels. Until those exports exist, this reference must remain a comparison image only.

## Implementation boundary

`Preloader` queues the preview images only for the development query flag. `LobbyArtPreview` draws them and owns a local test position; `Game` and `drawing.ts` are unchanged. The preview uses the approved simplified V2 sprite configuration directly, so a future playable character-variant switch does not silently change this comparison. Switching to a future character visual requires replacing only the preview's `PlayerVisual` configuration. No save schema, case content, NPC memory, or interaction ID changes are involved.
