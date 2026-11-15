import { GameObjects, Input, Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { session } from '../../runtime';
import { drawLocation } from '../adapters/drawing';
import { stepMovement } from '../adapters/movement';
import { PlayerVisual } from '../characters/PlayerVisual';
import { detectiveSpriteConfig } from '../characters/detective';
import type { LocationId } from '../../core/model';

export class Game extends Scene {
    private detective: GameObjects.Container;
    private playerVisual: PlayerVisual;
    private keys: Record<string, Input.Keyboard.Key>;
    private locationId: LocationId;
    private motion = { vx: 0, vy: 0 };
    private marker: GameObjects.Ellipse;
    private transitioning = false;

    constructor() { super('Game'); }

    create(): void {
        this.locationId = session.getPlayer().locationId;
        this.transitioning = false;
        const location = session.world.locations[this.locationId];
        drawLocation(this, location);
        this.playerVisual = new PlayerVisual(this, detectiveSpriteConfig);
        this.detective = this.playerVisual.body;
        const player = session.getPlayer();
        this.detective.setPosition(player.x, player.y).setDepth(player.y);
        this.playerVisual.update({ speed: 0, facing: player.facing, deltaMs: 0, paused: session.isBlocked() });
        this.marker = this.add.ellipse(0, 0, 58, 18).setStrokeStyle(2, 0xd3b77c, 0.85).setDepth(498);
        this.cameras.main.setBounds(0, 0, location.width, 768);
        this.cameras.main.startFollow(this.detective, true, 0.12, 1);
        this.cameras.main.centerOn(player.x, 384);
        this.cameras.main.fadeIn(220, 12, 20, 26);
        const keyboard = this.input.keyboard!;
        this.keys = keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E') as Record<string, Input.Keyboard.Key>;
        const clearInput = () => { keyboard.resetKeys(); this.motion.vx = 0; this.motion.vy = 0; };
        clearInput();
        let blocked = session.isBlocked();
        keyboard.enabled = !blocked;
        const sync = () => {
            const view = session.getSnapshot();
            if (view.locationId !== this.locationId && !this.transitioning) {
                this.transitioning = true;
                clearInput();
                this.scene.restart();
                return;
            }
            if (blocked !== session.isBlocked()) { clearInput(); blocked = session.isBlocked(); }
            keyboard.enabled = !blocked; // Keep scene input inactive while React owns focus.
            this.marker.setVisible(!!view.nearby && !blocked);
            if (view.nearby) this.marker.setPosition(view.nearby.x, view.nearby.y + 8);
        };
        const interact = (event: KeyboardEvent) => {
            if (event.repeat || this.transitioning || session.isBlocked()) return;
            // Phaser can replay its input queue during a scene restart. Consume this event
            // across scenes so one E cannot immediately activate the destination's return door.
            event.stopPropagation();
            const nearby = session.getSnapshot().nearby;
            if (nearby) session.interact(nearby.id);
        };
        const unsubscribe = session.subscribe(sync);
        keyboard.on('keydown-E', interact);
        window.addEventListener('blur', clearInput);
        document.addEventListener('visibilitychange', clearInput);
        this.events.once('shutdown', () => {
            keyboard.enabled = true;
            unsubscribe(); clearInput(); keyboard.off('keydown-E', interact);
            window.removeEventListener('blur', clearInput);
            document.removeEventListener('visibilitychange', clearInput);
            this.playerVisual.destroy();
        });
        sync();
        EventBus.emit('current-scene-ready', this);
    }

    update(_time: number, delta: number): void {
        if (this.transitioning || !this.keys) return;
        if (session.isBlocked()) {
            this.playerVisual.update({ speed: 0, facing: session.getPlayer().facing, deltaMs: 0, paused: true });
            return;
        }
        const down = (name: string) => this.keys[name].isDown;
        const x = Number(down('D') || down('RIGHT')) - Number(down('A') || down('LEFT'));
        const y = Number(down('S') || down('DOWN')) - Number(down('W') || down('UP'));
        const previous = session.getPlayer();
        const player = stepMovement(session.world.locations[this.locationId], previous, this.motion, x, y, delta / 1000);
        session.moveTo(player);
        this.detective.setPosition(player.x, player.y).setDepth(player.y);
        const seconds = Math.min(Math.max(delta / 1000, 0), 0.05);
        const speed = seconds > 0 ? Math.hypot(player.x - previous.x, player.y - previous.y) / seconds : 0;
        this.playerVisual.update({ speed, facing: player.facing, deltaMs: delta, paused: false });
    }
}
