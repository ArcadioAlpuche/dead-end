import { Input, Scene } from 'phaser';
import { hotel } from '../../content/hotel.ts';
import type { Entry } from '../../core/model.ts';
import { drawLobbyArt } from '../adapters/lobbyArt.ts';
import { drawLobbyProductionArt, hasLobbyProductionDesk, LOBBY_PRODUCTION_CANVAS } from '../adapters/lobbyProductionArt.ts';
import { drawArthurOptionB, hasArthurOptionB } from '../adapters/lobbyArthurPreview.ts';
import { LOBBY_PREVIEW_DESK, LOBBY_PREVIEW_WALK_BOUNDS } from '../adapters/lobbyProductionCollision.ts';
import { createLobbySpatialDebug } from '../adapters/lobbySpatialDebug.ts';
import { INTERIOR_MOVEMENT, stepMovement } from '../adapters/movement.ts';
import { PlayerVisual } from '../characters/PlayerVisual.ts';
import { simplifiedDetectiveSpriteConfig } from '../characters/detective.ts';
import { createEStyleIdlePreview } from '../characters/eStyleIdlePreview.ts';
import { eStyleWalkPreviewConfig } from '../characters/eStyleWalkPreview.ts';
import { lobbyArthurPreview, lobbyEStyleIdleMode, lobbyProductionMode, lobbyReferenceMode, lobbySpatialDebugMode } from '../lobbyPreviewMode.ts';

/** Development-only image compositor; never touches the authoritative session or saves. */
export class LobbyArtPreview extends Scene {
    private visual: PlayerVisual;
    private keys: Record<string, Input.Keyboard.Key>;
    private player: Entry;
    private motion = { vx: 0, vy: 0 };
    private spatialDebug?: ReturnType<typeof createLobbySpatialDebug>;
    private eStyleWalk?: PlayerVisual;
    private eStyleIdle?: ReturnType<typeof createEStyleIdlePreview>;
    private lastHorizontalFacing: -1 | 1 = 1;
    private deskCollisionEnabled = false;

    constructor() { super('LobbyArtPreview'); }

    create(): void {
        const location = hotel.locations.lobby;
        const useArthurOptionB = lobbyProductionMode && lobbyArthurPreview.variant === 'optionB'
            && hasArthurOptionB(this);
        const unavailable = lobbyProductionMode
            ? drawLobbyProductionArt(this, useArthurOptionB)
            : drawLobbyArt(this, lobbyReferenceMode ? 'reference' : 'layers');
        if (useArthurOptionB) drawArthurOptionB(this, lobbyArthurPreview);
        else if (lobbyProductionMode && lobbyArthurPreview.variant === 'optionB') {
            unavailable.push('arthur-option-b-cutout.png');
        }
        this.deskCollisionEnabled = lobbyProductionMode && hasLobbyProductionDesk(this);
        // Start each comparison at a useful local view; none of these positions are saved.
        this.player = lobbyReferenceMode ? { x: 660, y: 590, facing: 1 }
            : lobbyProductionMode ? { x: 245, y: 710, facing: 1 } : { ...location.entries.arrival };
        this.visual = new PlayerVisual(this, simplifiedDetectiveSpriteConfig);
        this.visual.body.setPosition(this.player.x, this.player.y).setDepth(this.player.y);
        this.visual.update({ speed: 0, facing: this.player.facing, deltaMs: 0, paused: false });
        if (lobbyEStyleIdleMode) {
            const eStyle = new PlayerVisual(this, eStyleWalkPreviewConfig);
            if (eStyle.usingSprites) {
                this.eStyleWalk = eStyle;
                eStyle.body.setPosition(this.player.x, this.player.y).setDepth(this.player.y);
                eStyle.update({ speed: 0, facing: this.lastHorizontalFacing, deltaMs: 0, paused: false });
                this.visual.body.setVisible(false);
            } else {
                eStyle.destroy();
                this.eStyleIdle = createEStyleIdlePreview(this, this.player.x, this.player.y) ?? undefined;
                if (this.eStyleIdle) {
                    this.eStyleIdle.setFlipX(this.lastHorizontalFacing !== eStyleWalkPreviewConfig.idleSourceFacing);
                    this.visual.body.setVisible(false);
                }
            }
        }
        if (lobbySpatialDebugMode) this.spatialDebug = createLobbySpatialDebug(
            this, LOBBY_PREVIEW_WALK_BOUNDS, this.player, this.deskCollisionEnabled,
        );
        this.cameras.main.setZoom(1).setBounds(0, 0, LOBBY_PRODUCTION_CANVAS.width, LOBBY_PRODUCTION_CANVAS.height);
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
            this.eStyleWalk?.destroy();
            this.eStyleIdle?.destroy();
            this.spatialDebug?.destroy();
        });
        if (unavailable.length) {
            this.add.text(20, 20, `MISSING / WRONG SIZE:\n${unavailable.join('\n')}`, {
                fontFamily: 'monospace', fontSize: '16px', color: '#ffced0', backgroundColor: '#3d171c',
            }).setDepth(1000).setScrollFactor(0);
        }
    }

    update(_time: number, delta: number): void {
        if (!this.keys) return;
        const down = (name: string) => this.keys[name].isDown;
        const x = Number(down('D') || down('RIGHT')) - Number(down('A') || down('LEFT'));
        const y = Number(down('S') || down('DOWN')) - Number(down('W') || down('UP'));
        if (x !== 0) this.lastHorizontalFacing = x < 0 ? -1 : 1;
        const previous = this.player;
        // Art-only collision: the playable lobby and its saved geometry stay untouched.
        const previewLocation = lobbyProductionMode
            ? { ...hotel.locations.lobby, walkBounds: LOBBY_PREVIEW_WALK_BOUNDS,
                obstacles: this.deskCollisionEnabled ? [LOBBY_PREVIEW_DESK] : [] }
            : hotel.locations.lobby;
        this.player = stepMovement(previewLocation, previous, this.motion, x, y,
            delta / 1000, INTERIOR_MOVEMENT);
        this.spatialDebug?.update(this.player);
        this.visual.body.setPosition(this.player.x, this.player.y).setDepth(this.player.y);
        this.eStyleWalk?.body.setPosition(this.player.x, this.player.y).setDepth(this.player.y);
        this.eStyleIdle?.setPosition(this.player.x, this.player.y).setDepth(this.player.y)
            .setFlipX(this.lastHorizontalFacing !== eStyleWalkPreviewConfig.idleSourceFacing);
        const seconds = Math.min(Math.max(delta / 1000, 0), 0.05);
        const animationInput = {
            speed: seconds > 0 ? Math.hypot(this.player.x - previous.x, this.player.y - previous.y) / seconds : 0,
            facing: this.lastHorizontalFacing, deltaMs: delta, paused: false,
        };
        this.visual.update(animationInput);
        this.eStyleWalk?.update(animationInput);
    }
}
