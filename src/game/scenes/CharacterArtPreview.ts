import { GameObjects, Input, Scene } from 'phaser';
import { hotel } from '../../content/hotel.ts';
import type { Entry } from '../../core/model.ts';
import { INTERIOR_MOVEMENT, stepMovement } from '../adapters/movement.ts';
import { PlayerVisual } from '../characters/PlayerVisual.ts';
import { simplifiedDetectiveSpriteConfig } from '../characters/detective.ts';
import { createEStyleIdlePreview } from '../characters/eStyleIdlePreview.ts';
import { eStyleWalkPreviewConfig } from '../characters/eStyleWalkPreview.ts';

// Local test geometry only. This scene never reads or writes the saved session.
const stage = {
    ...hotel.locations.lobby,
    width: 1024,
    // Keep both characters on the stage while they share the same movement input.
    walkBounds: { x: 35, y: 550, width: 570, height: 120 },
    obstacles: [],
};

/** Live V2 and E-style comparisons, with no session, save, or gameplay mutation. */
export class CharacterArtPreview extends Scene {
    private visual: PlayerVisual;
    private eStyleVisual?: PlayerVisual;
    private eStyleStatic?: GameObjects.Image;
    private keys: Record<string, Input.Keyboard.Key>;
    private player: Entry = { x: 320, y: 620, facing: 1 };
    private lastHorizontalFacing: -1 | 1 = 1;
    private motion = { vx: 0, vy: 0 };
    private readonly eStyleFoot = { x: 700, y: 620 };

    constructor() { super('CharacterArtPreview'); }

    create(): void {
        this.add.rectangle(512, 384, 1024, 768, 0x11191c);
        this.add.rectangle(512, 660, 1024, 216, 0x292d29);
        this.add.rectangle(512, 550, 1024, 2, 0x907650);
        this.add.text(28, 24, 'DETECTIVE V2 · LIVE IDLE / WALK', {
            fontFamily: 'monospace', fontSize: '18px', color: '#e4d2aa',
        });
        this.add.text(28, 52, 'Original approved sprite · 162 px visible height', {
            fontFamily: 'monospace', fontSize: '13px', color: '#98a4a1',
        });
        this.add.text(625, 24, 'KANE E · IDLE / WALK', {
            fontFamily: 'monospace', fontSize: '18px', color: '#e4d2aa',
        });
        this.add.text(625, 52, '145 px visible height · same foot line', {
            fontFamily: 'monospace', fontSize: '13px', color: '#98a4a1',
        });
        const eStyle = new PlayerVisual(this, eStyleWalkPreviewConfig);
        if (eStyle.usingSprites) {
            this.eStyleVisual = eStyle;
            eStyle.body.setPosition(this.eStyleFoot.x, this.eStyleFoot.y).setDepth(this.eStyleFoot.y);
            eStyle.update({ speed: 0, facing: this.player.facing, deltaMs: 0, paused: false });
        } else {
            eStyle.destroy();
            this.eStyleStatic = createEStyleIdlePreview(this, this.eStyleFoot.x, this.eStyleFoot.y) ?? undefined;
            this.add.text(625, 92, this.eStyleStatic
                ? 'Walk unavailable · static idle fallback' : 'E-style sprite unavailable', {
                fontFamily: 'monospace', fontSize: '13px', color: '#ffced0',
            });
        }
        this.add.rectangle(512, this.eStyleFoot.y, 900, 1, 0x907650, 0.45).setDepth(-100);
        this.visual = new PlayerVisual(this, simplifiedDetectiveSpriteConfig);
        this.visual.body.setPosition(this.player.x, this.player.y).setDepth(this.player.y);
        this.visual.update({ speed: 0, facing: this.player.facing, deltaMs: 0, paused: false });
        this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as Record<string, Input.Keyboard.Key>;
        const clearInput = () => { this.input.keyboard?.resetKeys(); this.motion.vx = 0; this.motion.vy = 0; };
        window.addEventListener('blur', clearInput);
        document.addEventListener('visibilitychange', clearInput);
        this.events.once('shutdown', () => {
            window.removeEventListener('blur', clearInput);
            document.removeEventListener('visibilitychange', clearInput);
            this.visual.destroy();
            this.eStyleVisual?.destroy();
            this.eStyleStatic?.destroy();
        });
    }

    update(_time: number, delta: number): void {
        if (!this.keys) return;
        const down = (name: string) => this.keys[name].isDown;
        const x = Number(down('D') || down('RIGHT')) - Number(down('A') || down('LEFT'));
        const y = Number(down('S') || down('DOWN')) - Number(down('W') || down('UP'));
        if (x !== 0) this.lastHorizontalFacing = x < 0 ? -1 : 1;
        const previous = this.player;
        this.player = stepMovement(stage, previous, this.motion, x, y, delta / 1000, INTERIOR_MOVEMENT);
        this.visual.body.setPosition(this.player.x, this.player.y).setDepth(this.player.y);
        const seconds = Math.min(Math.max(delta / 1000, 0), 0.05);
        const animationInput = {
            speed: seconds > 0 ? Math.hypot(this.player.x - previous.x, this.player.y - previous.y) / seconds : 0,
            facing: this.lastHorizontalFacing, deltaMs: delta, paused: false,
        };
        this.visual.update(animationInput);
        const eX = this.eStyleFoot.x + this.player.x - 320;
        const eY = this.player.y;
        this.eStyleVisual?.body.setPosition(eX, eY).setDepth(eY);
        this.eStyleVisual?.update(animationInput);
        this.eStyleStatic?.setPosition(eX, eY).setDepth(eY)
            .setFlipX(this.lastHorizontalFacing !== eStyleWalkPreviewConfig.idleSourceFacing);
    }
}
