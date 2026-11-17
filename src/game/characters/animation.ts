export type PlayerAnimation = 'idle' | 'walk' | 'specialIdle';

export interface AnimationClip {
    readonly file: string;
    readonly frameWidth: number;
    readonly frameHeight: number;
    readonly frames: readonly number[];
    readonly frameRate: number;
    /** Optional horizontal registration correction per source frame, in artwork pixels. */
    readonly frameOffsetX?: Readonly<Record<number, number>>;
}

export interface CharacterSpriteConfig {
    readonly enabled: boolean;
    readonly key: string;
    readonly assetPath: string;
    readonly origin: { readonly x: number; readonly y: number };
    readonly scale: number;
    readonly sourceFacing: -1 | 1;
    /** Native orientation of idle art when it differs from the walking sheet. */
    readonly idleSourceFacing?: -1 | 1;
    readonly mirrorX: boolean;
    readonly movingSpeed: number;
    readonly idle: AnimationClip;
    readonly walk: AnimationClip;
    /** Estimated travel per complete walk cycle, in unscaled artwork pixels. */
    readonly walkCycleDistance?: number;
    readonly specialIdle?: AnimationClip & { readonly afterMs: number };
}

export interface AnimationInput {
    /** Collision-resolved speed, in world pixels per second; not keyboard intent. */
    readonly speed: number;
    readonly facing: -1 | 1;
    readonly deltaMs: number;
    readonly paused: boolean;
}

export interface AnimationPlayback {
    play(animation: PlayerAnimation): void;
    setMirrored(mirrored: boolean): void;
    setPaused(paused: boolean): void;
    setTimeScale(scale: number): void;
}

export interface AnimationSettings {
    readonly sourceFacing: -1 | 1;
    readonly idleSourceFacing?: -1 | 1;
    readonly mirrorX: boolean;
    readonly movingSpeed: number;
    /** World pixels/second matching the walk clip's configured frame rate. */
    readonly walkReferenceSpeed?: number;
    /** Omit if the optional special-idle asset is unavailable. */
    readonly specialIdleAfterMs?: number;
}

/** Presentation-only state machine. No session, storage, physics, or Phaser dependency. */
export class PlayerAnimationController {
    private current: PlayerAnimation = 'idle';
    private idleMs = 0;
    private paused = false;
    private mirrored = false;
    private facing: -1 | 1;
    private readonly settings: AnimationSettings;
    private readonly playback: AnimationPlayback;

    constructor(settings: AnimationSettings, playback: AnimationPlayback) {
        this.settings = settings;
        this.playback = playback;
        this.facing = settings.sourceFacing;
        playback.play('idle');
        this.applyFacing();
    }

    get animation(): PlayerAnimation { return this.current; }

    private select(animation: PlayerAnimation): void {
        if (this.current === animation) return;
        this.current = animation;
        this.playback.play(animation);
        this.applyFacing();
    }

    private applyFacing(): void {
        const sourceFacing = this.current === 'idle'
            ? this.settings.idleSourceFacing ?? this.settings.sourceFacing
            : this.settings.sourceFacing;
        const mirrored = this.settings.mirrorX && this.facing !== sourceFacing;
        if (mirrored === this.mirrored) return;
        this.mirrored = mirrored;
        this.playback.setMirrored(mirrored);
    }

    update(input: AnimationInput): void {
        this.facing = input.facing;
        if (input.paused) {
            this.idleMs = 0;
            this.select('idle');
        } else if (input.speed > this.settings.movingSpeed) {
            this.idleMs = 0;
            this.select('walk');
        } else if (this.current !== 'specialIdle') {
            this.select('idle');
            // Ignore long tab-suspension gaps rather than immediately firing a special idle.
            this.idleMs += Number.isFinite(input.deltaMs) ? Math.max(0, Math.min(input.deltaMs, 100)) : 0;
            if (this.settings.specialIdleAfterMs !== undefined && this.idleMs >= this.settings.specialIdleAfterMs) {
                this.select('specialIdle');
            }
        }
        this.applyFacing();
        // Change playback rate without restarting the cycle as movement accelerates or slows.
        this.playback.setTimeScale(this.current === 'walk' && this.settings.walkReferenceSpeed
            ? input.speed / this.settings.walkReferenceSpeed : 1);
        if (input.paused !== this.paused) {
            this.paused = input.paused;
            this.playback.setPaused(input.paused);
        }
    }

    complete(animation: PlayerAnimation): void {
        if (animation !== 'specialIdle' || this.current !== 'specialIdle') return;
        this.idleMs = 0;
        this.select('idle');
    }
}
