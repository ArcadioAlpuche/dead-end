import type { Scene } from 'phaser';
import type { AnimationClip, CharacterSpriteConfig, PlayerAnimation } from './animation.ts';

export const textureKey = (config: CharacterSpriteConfig, name: PlayerAnimation): string => `${config.key}.sheet.${name}`;
export const animationKey = (config: CharacterSpriteConfig, name: PlayerAnimation): string => `${config.key}.animation.${name}`;

export function validSpriteConfig(config: CharacterSpriteConfig): boolean {
    const validClip = (clip: AnimationClip) => !!clip.file && clip.frames.length > 0
        && Number.isInteger(clip.frameWidth) && clip.frameWidth > 0
        && Number.isInteger(clip.frameHeight) && clip.frameHeight > 0
        && clip.frames.every(frame => Number.isInteger(frame) && frame >= 0)
        && Number.isFinite(clip.frameRate) && clip.frameRate > 0
        && (!clip.frameOffsetX || Object.entries(clip.frameOffsetX).every(([frame, offset]) =>
            Number.isInteger(Number(frame)) && Number(frame) >= 0 && Number.isFinite(offset)));
    return !!config.key && !!config.assetPath
        && Number.isFinite(config.scale) && config.scale > 0
        && [config.origin.x, config.origin.y].every(value => Number.isFinite(value) && value >= 0 && value <= 1)
        && (config.sourceFacing === 1 || config.sourceFacing === -1)
        && (config.idleSourceFacing === undefined || config.idleSourceFacing === 1 || config.idleSourceFacing === -1)
        && Number.isFinite(config.movingSpeed) && config.movingSpeed >= 0
        && (config.walkCycleDistance === undefined
            || (Number.isFinite(config.walkCycleDistance) && config.walkCycleDistance > 0))
        && validClip(config.idle) && validClip(config.walk)
        && (!config.specialIdle || (validClip(config.specialIdle)
            && Number.isFinite(config.specialIdle.afterMs) && config.specialIdle.afterMs > 0));
}

/** Queue only when explicitly enabled. Relative paths also work with Vite's relative base. */
export function queueCharacterSprites(scene: Pick<Scene, 'load' | 'textures'>, config: CharacterSpriteConfig): void {
    if (!config.enabled || !validSpriteConfig(config)) return;
    const previousPath = scene.load.path;
    const previousPrefix = scene.load.prefix;
    scene.load.setPath('');
    scene.load.setPrefix('');
    try {
        for (const name of ['idle', 'walk', 'specialIdle'] as const) {
            const clip = config[name];
            if (!clip || scene.textures.exists(textureKey(config, name))) continue;
            scene.load.spritesheet(textureKey(config, name), `${config.assetPath.replace(/\/$/, '')}/${clip.file}`,
                { frameWidth: clip.frameWidth, frameHeight: clip.frameHeight }, { responseType: 'blob', timeout: 5000 });
        }
    } finally {
        scene.load.setPath(previousPath);
        scene.load.setPrefix(previousPrefix);
    }
}

export interface SpriteAnimations { readonly idle: string; readonly walk: string; readonly specialIdle?: string }

/** Validate required textures before creating a Sprite, avoiding Phaser's missing-texture tile. */
export function prepareCharacterAnimations(scene: Pick<Scene, 'textures' | 'anims'>, config: CharacterSpriteConfig): SpriteAnimations | null {
    if (!config.enabled || !validSpriteConfig(config)) return null;
    const available = (name: PlayerAnimation): boolean => {
        const clip = config[name];
        const key = textureKey(config, name);
        if (!clip || !scene.textures.exists(key)) return false;
        const texture = scene.textures.get(key);
        const source = texture.getSourceImage();
        // This contract is a tight, untrimmed grid with no atlas packing, margins, or spacing.
        return source.width >= clip.frameWidth && source.height >= clip.frameHeight
            && source.width % clip.frameWidth === 0 && source.height % clip.frameHeight === 0
            && clip.frames.every(frame => texture.has(String(frame))
                && texture.get(frame).width === clip.frameWidth && texture.get(frame).height === clip.frameHeight);
    };
    if (!available('idle') || !available('walk')) return null;
    const register = (name: PlayerAnimation): string | undefined => {
        const clip = config[name]!;
        const key = animationKey(config, name);
        // Animations are game-global; room restarts must reuse them rather than add duplicates.
        if (!scene.anims.exists(key) && !scene.anims.create({
            key,
            frames: clip.frames.map(frame => ({ key: textureKey(config, name), frame })),
            frameRate: clip.frameRate,
            repeat: name === 'specialIdle' ? 0 : -1,
        })) return undefined;
        return key;
    };
    const idle = register('idle');
    const walk = register('walk');
    if (!idle || !walk) return null;
    return { idle, walk, specialIdle: available('specialIdle') ? register('specialIdle') : undefined };
}
