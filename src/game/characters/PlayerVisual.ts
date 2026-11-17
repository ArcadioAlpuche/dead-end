import type { Animations, GameObjects, Scene } from 'phaser';
import { drawDetective } from '../adapters/drawing.ts';
import { PlayerAnimationController } from './animation.ts';
import type { AnimationInput, CharacterSpriteConfig, PlayerAnimation } from './animation.ts';
import { prepareCharacterAnimations, textureKey } from './spriteAssets.ts';

/** Owns only presentation. The scene positions this foot anchor and follows it with the camera. */
export class PlayerVisual {
    readonly body: GameObjects.Container;
    readonly usingSprites: boolean;
    private readonly controller: PlayerAnimationController;
    private readonly legs: GameObjects.Rectangle[];
    private readonly cleanup: () => void;
    private elapsedMs = 0;

    constructor(scene: Scene, config: CharacterSpriteConfig) {
        const animations = prepareCharacterAnimations(scene, config);
        this.usingSprites = animations !== null;
        if (animations) {
            const shadow = scene.add.ellipse(0, 0, 48, 15, 0x05090c, 0.5);
            const sprite = scene.add.sprite(0, 0, textureKey(config, 'idle'), config.idle.frames[0])
                .setOrigin(config.origin.x, config.origin.y).setScale(config.scale);
            this.body = scene.add.container(0, 0, [shadow, sprite]);
            this.legs = [];
            let activeClip: PlayerAnimation = 'idle';
            const alignFrame = () => {
                const offset = config[activeClip]?.frameOffsetX?.[Number(sprite.frame.name)] ?? 0;
                sprite.x = offset * config.scale * (sprite.flipX ? -1 : 1);
            };
            sprite.on('animationupdate', alignFrame);
            this.controller = new PlayerAnimationController({
                sourceFacing: config.sourceFacing, idleSourceFacing: config.idleSourceFacing,
                mirrorX: config.mirrorX, movingSpeed: config.movingSpeed,
                walkReferenceSpeed: config.walkCycleDistance === undefined ? undefined
                    : config.walkCycleDistance * config.scale * config.walk.frameRate / config.walk.frames.length,
                specialIdleAfterMs: animations.specialIdle ? config.specialIdle?.afterMs : undefined,
            }, {
                play: name => {
                    activeClip = name;
                    sprite.play(animations[name] ?? animations.idle);
                    alignFrame();
                },
                setMirrored: mirrored => { sprite.setFlipX(mirrored); alignFrame(); },
                setPaused: paused => { if (paused) sprite.anims.pause(); else sprite.anims.resume(); },
                setTimeScale: scale => { sprite.anims.timeScale = scale; },
            });
            const onComplete = (animation: Animations.Animation) => {
                if (animation.key === animations.specialIdle) this.controller.complete('specialIdle');
            };
            sprite.on('animationcomplete', onComplete);
            this.cleanup = () => {
                sprite.off('animationcomplete', onComplete);
                sprite.off('animationupdate', alignFrame);
            };
        } else {
            const placeholder = drawDetective(scene);
            this.body = placeholder.body;
            this.legs = placeholder.legs;
            // Placeholder artwork always faces right, regardless of any proposed sheet settings.
            this.controller = new PlayerAnimationController({ sourceFacing: 1, mirrorX: true, movingSpeed: 2 }, {
                play: () => {},
                setMirrored: mirrored => { this.body.setScale(mirrored ? -1 : 1, 1); },
                setPaused: () => {},
                setTimeScale: () => {},
            });
            this.cleanup = () => {};
        }
    }

    update(input: AnimationInput): void {
        this.controller.update(input);
        if (this.legs.length) {
            if (!input.paused) this.elapsedMs += Math.max(0, Math.min(input.deltaMs, 100));
            const stride = this.controller.animation === 'walk' ? Math.min(1, input.speed / 120) : 0;
            const offset = Math.sin(this.elapsedMs / 95) * 4 * stride;
            this.legs[0].y = -15 + offset;
            this.legs[1].y = -15 - offset;
        }
    }

    destroy(): void {
        this.cleanup();
        this.body.destroy();
    }
}
