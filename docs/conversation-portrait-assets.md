# Bellweather conversation portraits

`docs/references/approved-conversation-interface.png` is the approved conversation layout reference. The interface keeps its portraits, scenery, speech bubbles, and controls separate.

## Source artwork and review portraits

| Character | Approved identity reference, unchanged | New transparent conversation portrait |
| --- | --- | --- |
| Thomas Kane | `public/assets/characters/kane/references/kane-e-style-idle-preview.png` | `public/assets/characters/conversation/kane-portrait-v1.png` |
| Arthur Finch | `public/assets/characters/arthur-finch/arthur-option-b-approved.png` | `public/assets/characters/conversation/arthur-portrait-v1.png` |

The two `v1` portraits were generated from the approved source images and mockup, then approved for the conversation interface. They are not replacements for the approved gameplay sprites. Kane's portrait is 1170 × 1344 RGBA; Arthur's is 1161 × 1355 RGBA. Both have transparent outer rows and separate upper-body crops. Kane faces right, Arthur faces left, and Arthur's badge reads `B` without a CSS mirror. The dialogue presentation selects these assets through `src/ui/conversationPresentation.ts`, so another approved revision can replace the mappings without changing game state or the lobby.

The approved layout shows both portraits in matching full-height windows. The generated portraits are intentionally static. The lobby background continues to use its independent architectural, floor, desk, and exterior-view layers.

## Generation brief used for this pass

- **Kane:** Create a transparent, waist-up, right-facing conversation portrait using the approved E-style idle image as the identity reference and the mockup as composition reference. Preserve the fedora, angular brows, compact proportions, tan trench coat, white shirt, red tie, bold contours, and restrained warm shading. No scenery, UI, or extra props.
- **Arthur:** Create a transparent, waist-up, left-facing portrait from approved Option B and the mockup. Preserve silver hair, lined face, round spectacles, prominent nose, gray moustache, guarded expression, cream sleeves, dark brown vest, red tie, chain, and correctly oriented `B` badge. No mechanical flip, scenery, UI, or extra props.

Both outputs were requested with a genuinely transparent background and were saved separately from their source files.
