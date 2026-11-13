import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PlayerAnimationController } from '../src/game/characters/animation.ts';
import { originalDetectiveSpriteConfig as detectiveSpriteConfig, detectiveSpriteConfig as activeDetectiveConfig, detectiveVariant, simplifiedDetectiveSpriteConfig } from '../src/game/characters/detective.ts';
import { animationKey, textureKey, queueCharacterSprites, prepareCharacterAnimations, validSpriteConfig } from '../src/game/characters/spriteAssets.ts';
import { PlayerVisual } from '../src/game/characters/PlayerVisual.ts';
import { GameSession } from '../src/core/session.ts';
import { hotel } from '../src/content/hotel.ts';
import { stepMovement } from '../src/game/adapters/movement.ts';
import { FOOT_RADIUS, INTERACTION_RADIUS } from '../src/core/spatial.ts';

const config = { ...detectiveSpriteConfig, enabled: true };
const idleInput = { speed: 0, facing: 1, deltaMs: 100, paused: false };
function controller(settings = {}) {
    const calls = { play: [], flip: [], pause: [], rate: [] };
    const animation = new PlayerAnimationController({ sourceFacing: 1, mirrorX: true, movingSpeed: 2, ...settings }, {
        play: value => calls.play.push(value), setMirrored: value => calls.flip.push(value), setPaused: value => calls.pause.push(value),
        setTimeScale: value => calls.rate.push(value),
    });
    return { animation, calls };
}

// Phaser ports below contain only metadata/spies, not generated images or sprite assets.
function mockScene(available = ['idle', 'walk', 'specialIdle'], character = config) {
    const textures = new Map();
    for (const name of available) {
        const clip = character[name];
        if (!clip) continue;
        textures.set(textureKey(character, name), {
            getSourceImage: () => ({ width: clip.frameWidth * (Math.max(...clip.frames) + 1), height: clip.frameHeight }),
            has: frame => clip.frames.includes(Number(frame)),
            get: () => ({ width: clip.frameWidth, height: clip.frameHeight }),
        });
    }
    const animations = new Map();
    const objects = [];
    const queued = [];
    function object(kind, x = 0, y = 0, children = []) {
        const listeners = new Map();
        const item = {
            kind, x, y, children, scaleX: 1, scaleY: 1, listeners, destroyed: false,
            setOrigin(x, y) { this.origin = { x, y }; return this; },
            setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; },
            setFlipX(value) { this.flipX = value; return this; },
            fillStyle() { return this; }, fillTriangle() { return this; },
            play(key) { this.playCount = (this.playCount ?? 0) + 1; this.playing = key; this.frame = { name: animations.get(key).frames[0].frame }; return this; },
            on(event, callback) { listeners.set(event, callback); return this; },
            off(event, callback) { if (listeners.get(event) === callback) listeners.delete(event); return this; },
            destroy() { this.destroyed = true; children.forEach(child => child.destroy()); },
            anims: { paused: false, pause() { this.paused = true; }, resume() { this.paused = false; } },
        };
        objects.push(item);
        return item;
    }
    const scene = {
        textures: { exists: key => textures.has(key), get: key => textures.get(key) },
        anims: { exists: key => animations.has(key), create: definition => { animations.set(definition.key, definition); return definition; } },
        load: {
            path: 'assets/', prefix: 'old-prefix.',
            setPath(path) { this.path = path; }, setPrefix(prefix) { this.prefix = prefix; },
            spritesheet(...args) { queued.push({ args, path: this.path, prefix: this.prefix }); },
        },
        add: {
            ellipse: (x, y) => object('ellipse', x, y), rectangle: (x, y) => object('rectangle', x, y),
            graphics: () => object('graphics'), sprite: (x, y) => object('sprite', x, y),
            container: (x, y, children) => object('container', x, y, children),
        },
    };
    return { scene, textures, animations, objects, queued };
}

test('idle/walk selection uses resolved speed and does not restart animations every frame', () => {
    const { animation, calls } = controller();
    for (let i = 0; i < 10; i++) animation.update(idleInput);
    animation.update({ ...idleInput, speed: 100 });
    animation.update({ ...idleInput, speed: 150 });
    animation.update({ ...idleInput, speed: 0 });
    assert.deepEqual(calls.play, ['idle', 'walk', 'idle']);
});

test('directional mirroring handles either source direction and can be disabled', () => {
    const normal = controller();
    normal.animation.update({ ...idleInput, facing: -1 });
    normal.animation.update({ ...idleInput, facing: -1 });
    normal.animation.update(idleInput);
    assert.deepEqual(normal.calls.flip, [true, false]);
    const left = controller({ sourceFacing: -1 }); left.animation.update(idleInput);
    assert.deepEqual(left.calls.flip, [true]);
    const fixed = controller({ mirrorX: false }); fixed.animation.update({ ...idleInput, facing: -1 });
    assert.deepEqual(fixed.calls.flip, []);
});

test('walk rate follows resolved speed without restarting; idle, special idle and UI use normal time', () => {
    const { animation, calls } = controller({ walkReferenceSpeed: 150, specialIdleAfterMs: 100 });
    for (const speed of [235, 145, 30]) animation.update({ ...idleInput, speed });
    assert.deepEqual(calls.play, ['idle', 'walk']);
    assert.deepEqual(calls.rate, [235 / 150, 145 / 150, 0.2]);
    animation.update(idleInput);
    assert.equal(animation.animation, 'specialIdle');
    assert.equal(calls.rate.at(-1), 1);
    animation.update({ ...idleInput, speed: 235 });
    assert.equal(animation.animation, 'walk');
    animation.update({ ...idleInput, speed: 235, paused: true });
    assert.equal(animation.animation, 'idle');
    assert.equal(calls.rate.at(-1), 1);
    const fixedRate = controller();
    fixedRate.animation.update({ ...idleInput, speed: 235 });
    assert.equal(fixedRate.calls.rate.at(-1), 1);
});

test('special idle runs once, returns on completion, and waits the full delay before repeating', () => {
    const { animation, calls } = controller({ specialIdleAfterMs: 300 });
    animation.update(idleInput); animation.update(idleInput);
    assert.equal(animation.animation, 'idle');
    animation.update(idleInput); animation.update(idleInput);
    assert.deepEqual(calls.play, ['idle', 'specialIdle']);
    animation.complete('specialIdle'); animation.update(idleInput);
    assert.equal(animation.animation, 'idle');
    animation.update(idleInput); animation.update(idleInput);
    assert.deepEqual(calls.play, ['idle', 'specialIdle', 'idle', 'specialIdle']);
});

test('walking interrupts special idle and ignores a late completion event', () => {
    const { animation } = controller({ specialIdleAfterMs: 100 });
    animation.update(idleInput);
    animation.update({ ...idleInput, speed: 10 });
    animation.complete('specialIdle');
    assert.equal(animation.animation, 'walk');
});

test('blocking UI cancels special idle, freezes idle, and resumes without accumulating idle time', () => {
    const { animation, calls } = controller({ specialIdleAfterMs: 200 });
    animation.update(idleInput); animation.update(idleInput);
    for (let i = 0; i < 50; i++) animation.update({ ...idleInput, paused: true });
    assert.equal(animation.animation, 'idle');
    animation.update(idleInput);
    assert.equal(animation.animation, 'idle');
    assert.deepEqual(calls.pause, [true, false]);
    animation.update(idleInput); assert.equal(animation.animation, 'specialIdle');
});

test('special idle is optional and long suspension gaps do not instantly trigger it', () => {
    const disabled = controller();
    for (let i = 0; i < 100; i++) disabled.animation.update(idleInput);
    assert.equal(disabled.animation.animation, 'idle');
    const timed = controller({ specialIdleAfterMs: 8000 });
    timed.animation.update({ ...idleInput, deltaMs: 100000 });
    assert.equal(timed.animation.animation, 'idle');
});

test('explicitly disabling sprites keeps placeholder rendering and queues no files', () => {
    const fake = mockScene();
    const disabled = { ...detectiveSpriteConfig, enabled: false };
    queueCharacterSprites(fake.scene, disabled);
    assert.equal(fake.queued.length, 0);
    const visual = new PlayerVisual(fake.scene, disabled);
    assert.equal(visual.usingSprites, false);
    assert.equal(fake.objects.some(o => o.kind === 'sprite'), false);
    visual.update({ ...idleInput, speed: 100, facing: -1 });
    assert.equal(visual.body.scaleX, -1);
    visual.destroy(); assert.equal(visual.body.destroyed, true);
});

test('loader uses configured grid and clean paths, restores loader context, and avoids cached textures', () => {
    const fake = mockScene([]);
    queueCharacterSprites(fake.scene, config);
    assert.equal(fake.queued.length, 3);
    assert.equal(fake.queued[0].args[1], 'assets/characters/detective/idle.png');
    assert.deepEqual(fake.queued.map(item => item.args[2]), [
        { frameWidth: 55, frameHeight: 120 }, { frameWidth: 76, frameHeight: 120 }, { frameWidth: 61, frameHeight: 120 },
    ]);
    assert.ok(fake.queued.every(item => item.path === '' && item.prefix === ''));
    assert.equal(fake.scene.load.path, 'assets/'); assert.equal(fake.scene.load.prefix, 'old-prefix.');
    const cached = mockScene(); queueCharacterSprites(cached.scene, config); assert.equal(cached.queued.length, 0);
});

test('missing required sheets or frames fall back; missing optional idle preserves idle/walk sprites', () => {
    assert.equal(prepareCharacterAnimations(mockScene([]).scene, config), null);
    assert.equal(prepareCharacterAnimations(mockScene(['idle']).scene, config), null);
    const partial = mockScene(['idle', 'walk']);
    assert.equal(prepareCharacterAnimations(partial.scene, config).specialIdle, undefined);
    partial.textures.get(textureKey(config, 'walk')).has = () => false;
    assert.equal(prepareCharacterAnimations(partial.scene, config), null);
    const visual = new PlayerVisual(partial.scene, config);
    assert.equal(visual.usingSprites, false);
});

test('malformed grids and invalid configuration are rejected without constructing a broken sprite', () => {
    const fake = mockScene();
    fake.textures.get(textureKey(config, 'idle')).getSourceImage = () => ({ width: 129, height: 128 });
    assert.equal(prepareCharacterAnimations(fake.scene, config), null);
    for (const override of [{ idle: { ...config.idle, frameWidth: 0 } }, { walk: { ...config.walk, frameHeight: 0 } }, { scale: -1 }, { movingSpeed: NaN },
        { walkCycleDistance: 0 }, { walkCycleDistance: NaN }, { walkCycleDistance: -80 },
        { walk: { ...config.walk, frameOffsetX: { 0: NaN } } },
        { walk: { ...config.walk, frameRate: 0 } }, { idle: { ...config.idle, frames: [-1] } }]) {
        const invalid = { ...config, ...override };
        assert.equal(validSpriteConfig(invalid), false);
        queueCharacterSprites(fake.scene, invalid);
        assert.equal(prepareCharacterAnimations(fake.scene, invalid), null);
    }
    assert.equal(fake.queued.length, 0);
});

test('registration respects frame order/rates, loops locomotion, and reuses global animations on scene restart', () => {
    const custom = { ...config, walk: { ...config.walk, frames: [3, 1, 2], frameRate: 14 } };
    const fake = mockScene(['idle', 'walk', 'specialIdle'], custom);
    prepareCharacterAnimations(fake.scene, custom); prepareCharacterAnimations(fake.scene, custom);
    assert.equal(fake.animations.size, 3);
    const walk = fake.animations.get(animationKey(custom, 'walk'));
    assert.deepEqual(walk.frames.map(f => f.frame), [3, 1, 2]); assert.equal(walk.frameRate, 14);
    assert.equal(walk.repeat, -1);
    assert.equal(fake.animations.get(animationKey(custom, 'specialIdle')).repeat, 0);
});

test('supplied animation registrations use all idle/coin frames and only walking frames 0–6', () => {
    const fake = mockScene();
    prepareCharacterAnimations(fake.scene, config);
    for (const [name, count, rate, repeat] of [['idle', 6, 5, -1], ['walk', 7, 9, -1], ['specialIdle', 8, 8, 0]]) {
        const clip = fake.animations.get(animationKey(config, name));
        assert.deepEqual(clip.frames.map(frame => frame.frame), Array.from({ length: count }, (_, i) => i));
        assert.equal(clip.frameRate, rate);
        assert.equal(clip.repeat, repeat);
    }
    assert.equal(config.walkCycleDistance, undefined);
    assert.equal(config.walk.frameOffsetX, undefined);
});

test('sprite adapter anchors visuals separately, handles completion/pause, and removes its listener on shutdown', () => {
    const fake = mockScene();
    const visual = new PlayerVisual(fake.scene, config);
    const sprite = fake.objects.find(o => o.kind === 'sprite');
    assert.equal(visual.usingSprites, true);
    assert.deepEqual(sprite.origin, { x: 0.5, y: 114 / 120 });
    assert.equal(sprite.scaleY, 1.5);
    for (let i = 0; i < 80; i++) visual.update(idleInput);
    assert.equal(sprite.playing, animationKey(config, 'specialIdle'));
    sprite.listeners.get('animationcomplete')({ key: animationKey(config, 'specialIdle') });
    assert.equal(sprite.playing, animationKey(config, 'idle'));
    visual.update({ ...idleInput, speed: 100, facing: -1 });
    assert.equal(sprite.flipX, true); assert.equal(visual.body.scaleX, 1);
    // Requested fixed 9 FPS is preserved at either movement speed.
    visual.update({ ...idleInput, speed: 235 });
    assert.equal(sprite.anims.timeScale * config.walk.frameRate, 9);
    visual.update({ ...idleInput, speed: 145 });
    assert.equal(sprite.anims.timeScale * config.walk.frameRate, 9);
    visual.update({ ...idleInput, paused: true }); assert.equal(sprite.anims.paused, true);
    assert.equal(sprite.anims.timeScale, 1);
    visual.update(idleInput); assert.equal(sprite.anims.paused, false);
    visual.destroy(); assert.equal(sprite.listeners.size, 0); assert.equal(sprite.destroyed, true);
});

test('detective grids match actual RGBA PNGs and exclude the final walking cell', () => {
    assert.equal(detectiveSpriteConfig.enabled, true);
    for (const [name, count, width, rate] of [['idle', 6, 55, 5], ['walk', 8, 76, 9], ['specialIdle', 8, 61, 8]]) {
        const clip = detectiveSpriteConfig[name];
        const png = readFileSync(new URL(`../public/assets/characters/detective/${clip.file}`, import.meta.url));
        assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
        assert.equal(png.toString('ascii', 12, 16), 'IHDR');
        assert.equal(png.readUInt32BE(16), count * width);
        assert.equal(png.readUInt32BE(20), 120);
        assert.equal(png[24], 8); assert.equal(png[25], 6); // RGBA8
        assert.equal(clip.frameWidth, width); assert.equal(clip.frameHeight, 120);
        assert.equal(clip.frameRate, rate);
        assert.ok(clip.frames.every(frame => frame >= 0 && frame < count));
        assert.deepEqual(clip.frames, Array.from({ length: name === 'walk' ? 7 : count }, (_, i) => i));
    }
});

test('optional frame registration follows walking, mirroring, and stopping without moving the foot anchor', () => {
    const registered = { ...config, walk: { ...config.walk, frameOffsetX: { 0: -18, 6: 25 } } };
    const fake = mockScene(['idle', 'walk', 'specialIdle'], registered);
    const visual = new PlayerVisual(fake.scene, registered);
    const sprite = fake.objects.find(o => o.kind === 'sprite');
    visual.update({ ...idleInput, speed: 235 });
    assert.equal(sprite.x, -27);
    sprite.frame.name = 6;
    sprite.listeners.get('animationupdate')();
    assert.equal(sprite.x, 37.5);
    visual.update({ ...idleInput, speed: 235, facing: -1 });
    assert.equal(sprite.x, -37.5);
    sprite.frame.name = 4;
    sprite.listeners.get('animationupdate')();
    assert.equal(Math.abs(sprite.x), 0);
    visual.update(idleInput);
    assert.equal(sprite.x, 0);
    assert.deepEqual([sprite.y, visual.body.x, visual.body.y], [0, 0, 0]);
    visual.destroy();
    assert.equal(sprite.listeners.size, 0);
});

test('visible detective height fits hotel doors and scaling leaves the soles on the foot anchor', () => {
    // Inspected supplied PNG alpha bounds: top row 6, last opaque sole row 113.
    const top = 6, soleEdge = 114;
    const height = (soleEdge - top) * config.scale;
    const doors = Object.values(hotel.locations).flatMap(location => location.props.filter(prop => prop.kind === 'door'));
    assert.ok(doors.length > 0);
    for (const door of doors) assert.ok(height / door.height >= 0.75 && height / door.height <= 0.85);
    assert.equal((soleEdge - config.origin.y * config.idle.frameHeight) * config.scale, 0);
    assert.equal(INTERACTION_RADIUS, 86);
});

test('visual scale/frame size do not alter the foot collision boundary, movement, or saved state', () => {
    const session = new GameSession(hotel);
    const before = session.getSave();
    const large = { ...config, scale: 3,
        idle: { ...config.idle, frameWidth: 512, frameHeight: 768 },
        walk: { ...config.walk, frameWidth: 512, frameHeight: 768 },
    };
    const visuals = [new PlayerVisual(mockScene().scene, config), new PlayerVisual(mockScene(['idle', 'walk'], large).scene, large)];
    const positions = visuals.map(visual => {
        let position = { x: 390, y: 520, facing: 1 };
        const motion = { vx: 0, vy: 0 };
        for (let i = 0; i < 100; i++) {
            const next = stepMovement(hotel.locations.room407, position, motion, 1, 0, 1 / 60);
            visual.update({ ...idleInput, speed: (next.x - position.x) * 60 }); position = next;
        }
        return position;
    });
    assert.deepEqual(positions[0], positions[1]); assert.ok(positions[0].x <= 407);
    assert.equal(FOOT_RADIUS, 13); assert.deepEqual(session.getSave(), before);
});

test('simplified detective skips the redundant loop-end pose while retaining the eight-cell PNG and 8 FPS', () => {
    const character = simplifiedDetectiveSpriteConfig;
    assert.equal(activeDetectiveConfig, { original: detectiveSpriteConfig, simplified: character }[detectiveVariant]);
    const png = readFileSync(new URL('../public/assets/characters/detective-v2/walk.png', import.meta.url));
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(png.readUInt32BE(16), 2048); assert.equal(png.readUInt32BE(20), 256);
    assert.equal(png[24], 8); assert.equal(png[25], 6); // RGBA8
    assert.equal(character.specialIdle, undefined);
    assert.equal(character.walkCycleDistance, undefined);
    assert.equal(character.walk.frameOffsetX, undefined);
    assert.equal(220 * character.scale, 162);
    assert.equal((240 - character.origin.y * 256) * character.scale, 0);
    const fake = mockScene(['idle', 'walk'], character);
    prepareCharacterAnimations(fake.scene, character);
    const idle = fake.animations.get(animationKey(character, 'idle'));
    const walk = fake.animations.get(animationKey(character, 'walk'));
    assert.deepEqual(idle.frames.map(frame => frame.frame), [0]);
    assert.deepEqual(walk.frames.map(frame => frame.frame), [0, 1, 2, 3, 4, 5, 6]);
    assert.equal(walk.frameRate, 8); assert.equal(walk.repeat, -1);
    assert.equal(walk.frames.length / walk.frameRate, 0.875);
    const unloaded = mockScene([], character);
    queueCharacterSprites(unloaded.scene, character);
    assert.equal(unloaded.queued.length, 2); // Existing loader registers the same sheet for each clip.
    for (const item of unloaded.queued) {
        assert.equal(item.args[1], 'assets/characters/detective-v2/walk.png');
        assert.deepEqual(item.args[2], { frameWidth: 256, frameHeight: 256 });
    }
});

test('simplified detective stops immediately at frame zero, never plays special idle, and flips without moving its anchor', () => {
    const character = simplifiedDetectiveSpriteConfig;
    const fake = mockScene(['idle', 'walk'], character);
    const visual = new PlayerVisual(fake.scene, character);
    const sprite = fake.objects.find(object => object.kind === 'sprite');
    visual.body.x = 1160; visual.body.y = 550;
    for (let i = 0; i < 120; i++) visual.update({ ...idleInput, speed: 235 });
    assert.equal(sprite.playCount, 2); // Initial idle + one walk start, not a restart every update.
    assert.equal(sprite.playing, animationKey(character, 'walk'));
    assert.equal(sprite.anims.timeScale, 1);
    visual.update({ ...idleInput, speed: 235, facing: -1 });
    assert.equal(sprite.flipX, true);
    assert.equal(sprite.playCount, 2);
    assert.deepEqual([visual.body.x, visual.body.y, sprite.y], [1160, 550, 0]);
    assert.equal(Math.abs(sprite.x), 0);
    visual.update(idleInput);
    assert.equal(sprite.frame.name, 0);
    assert.equal(sprite.playing, animationKey(character, 'idle'));
    for (let i = 0; i < 200; i++) visual.update(idleInput);
    assert.equal(sprite.playCount, 3);
    // A restart after a real stop is intentional; repeated movement and direction changes are not.
    visual.update({ ...idleInput, speed: 235, facing: -1 });
    assert.equal(sprite.playCount, 4);
    for (const facing of [-1, 1, -1, 1]) {
        for (let i = 0; i < 60; i++) visual.update({ ...idleInput, speed: 235, facing });
        assert.equal(sprite.playCount, 4);
        assert.equal(sprite.anims.timeScale, 1);
        assert.deepEqual([visual.body.x, visual.body.y, sprite.y], [1160, 550, 0]);
        assert.equal(Math.abs(sprite.x), 0);
    }
    visual.update(idleInput);
    assert.equal(sprite.frame.name, 0);
    assert.equal(sprite.playCount, 5);
    visual.destroy();
    assert.equal(sprite.listeners.size, 0);
    assert.equal(new PlayerVisual(mockScene([], character).scene, character).usingSprites, false);
});
