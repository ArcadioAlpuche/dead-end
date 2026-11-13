# Detective sprites and animation

Status: Simplified Detective V2 is approved for the current playable milestone. Minor animation imperfections are accepted for now. The original tight-grid configuration remains intact and selectable. Phaser owns rendering; the independent TypeScript animation controller owns only transient presentation state. No gameplay or save-schema change is required.

## Simplified Detective V2 milestone

The active asset is `public/assets/characters/detective-v2/walk.png`, verified programmatically as a 2048 × 256, non-interlaced RGBA8 PNG with eight 256 × 256 cells in one row. Decoded alpha contains 355,195 fully transparent pixels, 17,714 partially transparent pixels, and 151,379 opaque pixels. Every frame's nontransparent top/bottom bounds are rows 20–239 inclusive, at both alpha > 0 and alpha ≥ 128. No artwork touches a cell edge.

- Walk: frames 0–6 repeat at a fixed 8 FPS while collision-resolved speed exceeds 2 px/s. Frame 7 is omitted because it repeats frame 0’s planted stance at the loop boundary. The controller changes clips only on a state change; it does not restart the walk every update.
- Idle: hold frame 0 from that same PNG. No breathing, coin flip, or special-idle configuration is present. Stopping switches directly to frame 0 when resolved movement stops; existing acceleration/deceleration remains unchanged.
- Scale: `162 / 220` (approximately **0.73636×**), based on the 220-pixel visible hat-to-shoe height, giving **162 world pixels** of visible height.
- Floor origin: `(0.5, 240 / 256)`, putting the lower sole edge on the existing foot anchor. X remains centered in the cell. Right-facing artwork mirrors on leftward movement; only the sprite flips, not its root position.
- No per-frame offsets, image edits, stride resampling, or new animation/rendering library. Seven-frame playback at 8 FPS removes the duplicate end hold; existing 235 px/s horizontal and 145 px/s shallow vertical movement is preserved.

To restore the original detective, change `detectiveVariant` in [`detective.ts`](../src/game/characters/detective.ts) from `'simplified'` to `'original'`, then fully reload the browser. `originalDetectiveSpriteConfig` preserves its original settings; `simplifiedDetectiveSpriteConfig` contains V2. This is a development configuration switch, not a runtime character-selection feature. The selected configuration is consumed by the existing Preloader and Game scene without changes to either. Texture namespaces differ so the variants cannot reuse one another's registered clips.

Both idle and walk reference `walk.png`. The unchanged loader registers it under separate clip texture keys; no additional PNG file is created. Missing required textures still use the existing geometry placeholder. The original PNGs in `public/assets/characters/detective/` are untouched.

The approved V2 design is a stylized human detective for this visual test; it does not change narrative facts or add supernatural/cartoon-world rules. Inspect the light speckled edge visible in the source against the dark hotel backgrounds. The artwork is intentionally preserved for evaluation, including any gait/outline issues.

## V2 walking-pause investigation

Original playback was `0, 1, 2, 3, 4, 5, 6, 7` at 8 FPS (1.000 seconds per cycle). Revised playback is `0, 1, 2, 3, 4, 5, 6` at the **same 8 FPS** (0.875 seconds per cycle). Only the frame sequence changes; all eight cells remain in the unchanged PNG. Fully reload the browser to clear the cached animation registration.

Inspection of the legs/shoes (source rows 200–239, alpha ≥ 128) found only 2.6% silhouette difference between frame 7 and frame 0. They are near-duplicate planted poses, not byte-identical images. The loop therefore held almost the same stance for two consecutive 125ms intervals. At the unchanged full horizontal speed of 235 px/s, the detective moved about 58.75 world pixels during that double hold.

Frame 6 has a distinct foot pose and is retained: 6→7 changes 28.2% of the leg silhouette, while the revised seam 6→0 changes 26.7%, making it a comparable step without the extra resting pose. Earlier transitions vary, with the largest change at 4→5 (57.0%). These pixel measurements support the visual diagnosis; they are not a physical gait or perceptual-smoothness model.

The controller's state guard prevents replaying walk on each update; mirroring does not restart it. Animation registration has no repeat delay or extra last-frame duration. V2 uses fixed playback speed (`timeScale = 1`), rather than distance matching: resolved movement selects walk/idle but does not change cadence. There is no evidence of a playback-reset bug during sustained walking. Starting again after a real stop intentionally restarts walk at frame 0.

This correction removes the duplicate stance delay, not all foot sliding. The existing uneven leg progression and fixed cadence cannot guarantee planted feet at every movement speed, especially during acceleration/deceleration or shallow vertical travel. A convincing, physically matched gait may eventually require re-authored contact progression and stride calibration. Neither artwork nor movement mechanics were changed for this correction. Scale remains `162 / 220`, the sole anchor remains row 240, and no frame offsets are used.

## Preserved original detective

The following contract describes the reversible **original** configuration, not the active V2 test.

### Original asset contract and playback

Keep the files in `public/assets/characters/detective/`. The loader uses `assets/characters/detective/` relative to the deployed page. PNGs must be transparent, untrimmed grids with no margins or spacing within each sheet. Frame dimensions are defined **per clip**, so different clips can have different widths.

| File | Verified PNG dimensions | Cell size | Source cells | Playback frames | Rate | Playback |
| --- | --- | --- | --- | --- | --- | --- |
| `idle.png` | 330 × 120 | 55 × 120 | 6 | 0–5 | 5 FPS | Loop |
| `special-idle.png` | 488 × 120 | 61 × 120 | 8 | 0–7 | 8 FPS | Once after 8 seconds idle, then return to idle |
| `walk.png` | 608 × 120 | 76 × 120 | 8 | **0–6 only** | 9 FPS | Loop; frame 7 is never played |

Indices start at zero, left to right and then top to bottom. The inspected files contain a single row each. All three are 8-bit RGBA PNGs with fully transparent background pixels and partially transparent edges. No files were renamed, relocated, or edited during this integration. The previous asset README described 128 × 128 sheets; it has been updated to match the actual files and requested playback.

### Original configuration

[`detective.ts`](../src/game/characters/detective.ts) contains both presentation configurations. Each `AnimationClip` owns its `file`, `frameWidth`, `frameHeight`, ordered `frames`, and `frameRate`. The loader and texture validator use that clip's dimensions rather than a character-wide grid. All referenced cells must exist and both sheet dimensions must be exact multiples of the clip's cell dimensions.

- `enabled` enables sprites; `false` forces the existing geometry placeholder and skips sprite requests.
- `key` namespaces global texture and animation registrations. It is now `detective-v3` to distinguish this grid from previous sheets.
- `scale: 1.5` preserves the detective's current visual scale. Most poses are approximately 108 source pixels tall, giving a visible height of about 162 world pixels against the hotel's 200-pixel door panels.
- `origin: { x: 0.5, y: 114 / 120 }` anchors the sole edge at the existing ground position. Soles reach row 113, leaving six rows below them. Some frames have their alpha ≥ 128 boundary on row 112; the source artwork still has minor one-pixel variation.
- `sourceFacing: 1` and `mirrorX: true` use right-facing artwork with horizontal mirroring. Vertical movement retains the previous horizontal facing.
- `movingSpeed: 2` selects walk using collision-resolved movement rather than keyboard intent. A blocked player returns to idle.
- `specialIdle.afterMs: 8000` keeps the existing occasional coin flip. All eight frames play once; completion returns to the idle loop. Movement and blocking UI retain their existing ability to interrupt it.

The detective intentionally omits `walkCycleDistance`: the requested 9 FPS is a fixed playback rate, at both horizontal and shallow vertical speeds. Movement remains 235 px/s horizontally and 145 px/s vertically, with its existing acceleration. The reusable controller still supports optional distance-matched playback for future configurations, but enabling it would alter the requested cadence. Fixed-rate walking and uneven source contact poses can still produce foot sliding.

Optional per-clip `frameOffsetX` remains available for other artwork. It maps source indices to horizontal offsets in unscaled artwork pixels; `PlayerVisual` scales and mirrors those offsets without moving the collision/camera anchor. The previous −18/+25 corrections were specific to the old 128-pixel sheets and have been removed from this detective configuration.

Perform a full browser reload after replacing assets or changing configuration. Phaser textures and animations are cached globally for the game instance; Vite hot updates alone may retain an old renderer.

## Rendering, lifecycle, and fallback

`Preloader` calls `queueCharacterSprites`, which preserves the loader's path/prefix, queues each sheet with its own cell dimensions and a five-second timeout, and skips cached textures. `prepareCharacterAnimations` validates required grids/frames before creating a sprite, then registers global animations once. Idle and walk repeat indefinitely; special idle uses `repeat: 0`.

`PlayerVisual` exposes the same foot-anchor container for scene position, depth sorting, and camera following. Origin, scale, mirroring, and optional frame corrections affect the sprite child. The 13-pixel foot collision radius, 86-pixel interaction distance, movement rules, named entries, dialogue, notebook, and autosave remain unchanged. No physics body is derived from the bitmap size.

`PlayerAnimationController` imports neither Phaser nor authoritative game state. It consumes speed, facing, elapsed time, and pause state through a playback interface. It does not restart a clip every frame. Coin-flip completion restarts the idle delay; long browser suspensions contribute at most 100 ms per update to that delay. Blocking UI selects and freezes idle, then resumes normally. Scene shutdown removes both frame-update and completion listeners and destroys the visual container.

| Condition | Result |
| --- | --- |
| Disabled or invalid configuration | Existing placeholder; no sprite file requests. |
| Required idle/walk sheet missing, failed, wrong grid, or missing a referenced frame | Existing animated placeholder. |
| Valid optional special-idle configuration but missing/invalid texture | Idle and walk sprites work; no coin-flip timer. |
| All required assets valid | Configured sprite playback and mirroring. |

Invalid optional clip configuration invalidates the configuration; omit or correct it. Failed files do not trigger generation, retries on room changes, or replacement downloads. Correct the files and reload.

## Verification and remaining artwork limitations

Run `node --test tests/*.test.mjs`, `./node_modules/.bin/tsc --noEmit -p tsconfig.json`, and `npm run build-nolog`. Tests cover actual PNG headers, per-clip loading/validation, exact frame orders/rates, walk-frame-7 exclusion, completion/interruption, mirroring, fallback, cleanup, and collision/save independence. Browser checks should include idle cycling, walk/stop, coin completion, notebook pause, and both directions of a room transition.

The files are substantially cleaner than the first experimental art. Small silhouette/foot-position changes remain across idle and coin frames. Walk frame 0 is shorter than the main poses, and several later poses remain similar; excluding frame 7 removes its problematic pose but cannot make the remaining gait perfectly even. These are source-art limitations, not reasons to change movement or silently retouch the PNGs.

Historical pre-revision assets may be retained locally in `asset-backups/detective/pre-revision-20261113T002030Z/`, outside `public`. This backup directory is intentionally excluded from the milestone commit. They describe an older 128 × 128 format and are not a backup of this newly supplied set. Their old configuration predates per-clip dimensions and must be adapted before reuse with the current loader.
