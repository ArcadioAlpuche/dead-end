import { Input, Scene } from 'phaser';
import { hotel } from '../../content/hotel.ts';
import type { Entry } from '../../core/model.ts';
import { drawLobbyArt } from '../adapters/lobbyArt.ts';
import { INTERIOR_MOVEMENT, stepMovement } from '../adapters/movement.ts';
import { PlayerVisual } from '../characters/PlayerVisual.ts';
import { simplifiedDetectiveSpriteConfig } from '../characters/detective.ts';

/** Development-only image compositor; never touches the authoritative session or saves. */
export class LobbyArtPreview extends Scene {
    private visual: PlayerVisual;
    private keys: Record<string, Input.Keyboard.Key>;
    private player: Entry;
    private motion = { vx: 0, vy: 0 };

    constructor() { super('LobbyArtPreview'); }

    create(): void {
        const location = hotel.locations.lobby;
        const unavailable = drawLobbyArt(this);
        this.player = { ...location.entries.arrival };
        this.visual = new PlayerVisual(this, simplifiedDetectiveSpriteConfig);
        this.visual.body.setPosition(this.player.x, this.player.y).setDepth(this.player.y);
        this.visual.update({ speed: 0, facing: this.player.facing, deltaMs: 0, paused: false });
        this.cameras.main.setZoom(1).setBounds(0, 0, location.width, 768);
        this.cameras.main.startFollow(this.visual.body, true, 0.12, 1);
        this.cameras.main.centerOn(this.player.x, 384);
        this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as Record<string, Input.Keyboard.Key>;
        const clearInput = () => { this.input.keyboard?.resetKeys(); this.motion.vx = 0; this.motion.vy = 0; };
        window.addEventListener('blur', clearInput);
        document.addEventListener('visibilitychange', clearInput);
        this.events.once('shutdown', () => {
            window.removeEventListener('blur', clearInput);
            document.removeEventListener('visibilitychange', clearInput);
            this.visual.destroy();
        });
        if (unavailable.length) {
            this.add.text(20, 20, `MISSING / WRONG SIZE: ${unavailable.join(', ')}`, {
                fontFamily: 'monospace', fontSize: '16px', color: '#ffced0', backgroundColor: '#3d171c',
            }).setDepth(1000).setScrollFactor(0);
        }
    }

    update(_time: number, delta: number): void {
        if (!this.keys) return;
        const down = (name: string) => this.keys[name].isDown;
        const x = Number(down('D') || down('RIGHT')) - Number(down('A') || down('LEFT'));
        const y = Number(down('S') || down('DOWN')) - Number(down('W') || down('UP'));
        const previous = this.player;
        this.player = stepMovement(hotel.locations.lobby, previous, this.motion, x, y,
            delta / 1000, INTERIOR_MOVEMENT);
        this.visual.body.setPosition(this.player.x, this.player.y).setDepth(this.player.y);
        const seconds = Math.min(Math.max(delta / 1000, 0), 0.05);
        this.visual.update({
            speed: seconds > 0 ? Math.hypot(this.player.x - previous.x, this.player.y - previous.y) / seconds : 0,
            facing: this.player.facing, deltaMs: delta, paused: false,
        });
    }
}
