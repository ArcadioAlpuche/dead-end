import type { GameObjects, Scene } from 'phaser';
import type { AnimationInput } from './animation.ts';

type Heading = 'north' | 'south' | 'east' | 'west';
type OverworldInput = AnimationInput & { readonly axisX?: number; readonly axisY?: number };

/** Temporary four-direction drawing; the interior sprite and its controller are untouched. */
export class OverworldVisual {
    readonly body: GameObjects.Container;
    private readonly figure: GameObjects.Graphics;
    private heading: Heading = 'south';
    private elapsedMs = 0;

    constructor(scene: Scene) {
        const shadow = scene.add.ellipse(0, 1, 34, 10, 0x080e13, 0.55);
        this.figure = scene.add.graphics();
        this.body = scene.add.container(0, 0, [shadow, this.figure]);
        this.draw(0);
    }

    update(input: OverworldInput): void {
        if (!input.paused) {
            if (input.axisY) this.heading = input.axisY < 0 ? 'north' : 'south';
            else if (input.axisX) this.heading = input.axisX < 0 ? 'west' : 'east';
            this.elapsedMs += Math.max(0, Math.min(input.deltaMs, 100));
        }
        const stride = !input.paused && input.speed > 2 ? Math.sin(this.elapsedMs / 75) * 3 : 0;
        this.draw(stride);
    }

    private draw(stride: number): void {
        const g = this.figure;
        const side = this.heading === 'east' || this.heading === 'west';
        const sign = this.heading === 'west' ? -1 : 1;
        g.clear();
        // Soles and coat use the container origin as the foot anchor.
        g.fillStyle(0x171b20).fillEllipse(-6, -3 + stride, 12, 7).fillEllipse(6, -3 - stride, 12, 7);
        g.fillStyle(0x242b2d).fillRect(-11, -24 + stride, 8, 20).fillRect(3, -24 - stride, 8, 20);
        g.fillStyle(0x71654f).fillTriangle(-19, -43, 19, -43, 23, -20).fillTriangle(-19, -43, 23, -20, -23, -20);
        g.fillStyle(0x514938).fillRect(-15, -43, 30, 7);
        if (this.heading !== 'north') {
            g.fillStyle(0xc6a888).fillEllipse(side ? 4 * sign : 0, -52, side ? 19 : 22, 20);
            if (this.heading === 'south') {
                g.fillStyle(0xa34038).fillTriangle(-3, -41, 3, -41, 0, -29);
                g.fillStyle(0x1d262a).fillCircle(-5, -53, 1).fillCircle(5, -53, 1);
            } else {
                g.fillStyle(0x1d262a).fillCircle(9 * sign, -53, 1);
            }
        }
        g.fillStyle(0x292a29).fillRect(-13, -67, 26, 15);
        g.fillStyle(0x171d1e).fillRect(-13, -57, 26, 4);
        g.fillStyle(0x292a29).fillRect(side ? -19 + 3 * sign : -22, -55, side ? 38 : 44, 5);
    }

    destroy(): void { this.body.destroy(); }
}
