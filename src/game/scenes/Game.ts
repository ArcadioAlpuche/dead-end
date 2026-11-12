import { GameObjects, Input, Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { session } from '../../runtime';
import { drawDetective, drawLocation } from '../adapters/drawing';
import { stepMovement } from '../adapters/movement';
import type { LocationId } from '../../core/model';

export class Game extends Scene {
    private detective: GameObjects.Container;
    private legs: GameObjects.Rectangle[];
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
        const actor = drawDetective(this);
        this.detective = actor.body;
        this.legs = actor.legs;
        const player = session.getPlayer();
        this.detective.setPosition(player.x, player.y).setScale(player.facing, 1).setDepth(player.y);
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
        const sync = () => {
            const view = session.getSnapshot();
            if (view.locationId !== this.locationId && !this.transitioning) {
                this.transitioning = true;
                clearInput();
                this.scene.restart();
                return;
            }
            if (blocked !== session.isBlocked()) { clearInput(); blocked = session.isBlocked(); }
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
            unsubscribe(); clearInput(); keyboard.off('keydown-E', interact);
            window.removeEventListener('blur', clearInput);
            document.removeEventListener('visibilitychange', clearInput);
        });
        sync();
        EventBus.emit('current-scene-ready', this);
    }

    update(time: number, delta: number): void {
        if (this.transitioning || session.isBlocked() || !this.keys) return;
        const down = (name: string) => this.keys[name].isDown;
        const x = Number(down('D') || down('RIGHT')) - Number(down('A') || down('LEFT'));
        const y = Number(down('S') || down('DOWN')) - Number(down('W') || down('UP'));
        const player = stepMovement(session.world.locations[this.locationId], session.getPlayer(), this.motion, x, y, delta / 1000);
        session.moveTo(player);
        this.detective.setPosition(player.x, player.y).setScale(player.facing, 1).setDepth(player.y);
        const stride = Math.min(1, Math.hypot(this.motion.vx, this.motion.vy) / 120);
        this.legs[0].y = -15 + Math.sin(time / 95) * 4 * stride;
        this.legs[1].y = -15 - Math.sin(time / 95) * 4 * stride;
    }
}
