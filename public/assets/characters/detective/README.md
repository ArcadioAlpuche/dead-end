# Detective character assets

Current supplied transparent RGBA PNG sheets. Keep these filenames and paths unchanged. Each file uses a single row with no cell spacing or margins.

| File | Actual PNG dimensions | Frame dimensions | Source frames | Playback |
| --- | --- | --- | --- | --- |
| `idle.png` | 330 × 120 | 55 × 120 | 6 | Loop frames 0–5 at 5 FPS |
| `special-idle.png` | 488 × 120 | 61 × 120 | 8 | Frames 0–7 once at 8 FPS, after 8 seconds idle |
| `walk.png` | 608 × 120 | 76 × 120 | 8 | Loop frames **0–6** at 9 FPS; **exclude frame 7** |

Frame indices are zero-based. The configured scale remains 1.5×. Soles reach row 113; origin `(0.5, 114 / 120)` aligns their lower edge to the floor. Minor one-pixel source variation remains. Left/right mirroring and the placeholder fallback are preserved. The coin flip returns to the idle loop on completion and remains interruptible by movement or blocking UI.

Frame dimensions now live on each clip. Fixed 9 FPS walking replaces the previous distance-adjusted cadence; movement speed itself is unchanged. Old 128-pixel-sheet registration offsets are no longer applied. Reload the browser after asset/configuration changes to clear cached textures and animations.

Full contract and artwork limitations: [docs/character-animation.md](../../../../docs/character-animation.md).

Configuration: [src/game/characters/detective.ts](../../../../src/game/characters/detective.ts).
