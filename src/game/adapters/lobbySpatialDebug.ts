import type { Scene } from 'phaser';
import type { Point, Rect } from '../../core/model.ts';
import { FOOT_RADIUS, INTERACTION_RADIUS } from '../../core/spatial.ts';
import { LOBBY_PREVIEW_DESK } from './lobbyProductionCollision.ts';

// Planning overlay only. Active footprints also appear in hotel.ts; proposed
// furniture and plant rectangles remain visual marks, never movement obstacles.
export const LOBBY_PROPOSED_DEBUG_OBSTACLES = [
    { label: 'Plant', x: 70, y: 540, width: 95, height: 75 },
    { label: 'West post', x: 320, y: 495, width: 32, height: 70 },
    { label: 'Left chair', x: 270, y: 625, width: 70, height: 50 },
    { label: 'Table', x: 425, y: 645, width: 70, height: 35 },
    { label: 'Right chair', x: 580, y: 625, width: 75, height: 50 },
    { label: 'Desk', x: 440, y: 530, width: 580, height: 60 },
    { label: 'East post', x: 1025, y: 495, width: 32, height: 70 },
    { label: 'Stair base', x: 1050, y: 530, width: 250, height: 40 },
] as const;
export const LOBBY_PROPOSED_STAIR_ANCHOR = { x: 1175, y: 595 } as const;

/** Preview-only marks in world coordinates; never changes spatial rules. */
export function createLobbySpatialDebug(scene: Pick<Scene, 'add'>, bounds: Rect, foot: Point, activeDesk = true) {
    const boundary = scene.add.graphics().setDepth(1200);
    boundary.lineStyle(2, 0x00e5ff, 0.95).strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    boundary.lineStyle(1, 0xffca56, 0.95).strokeRect(
        bounds.x + FOOT_RADIUS, bounds.y + FOOT_RADIUS,
        bounds.width - FOOT_RADIUS * 2, bounds.height - FOOT_RADIUS * 2,
    );
    const proposed = scene.add.graphics().setDepth(1201);
    const annotations: Array<{ destroy(): void }> = [];
    for (const obstacle of LOBBY_PROPOSED_DEBUG_OBSTACLES) {
        proposed.fillStyle(0xff8b3d, 0.16).fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        proposed.lineStyle(2, 0xff8b3d, 1).strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        annotations.push(scene.add.text(obstacle.x, obstacle.y - 17, obstacle.label, {
            fontFamily: 'monospace', fontSize: '12px', color: '#ffcfaa', backgroundColor: '#40200f',
        }).setDepth(1202));
    }
    if (activeDesk) {
        proposed.lineStyle(3, 0x4fa8ff, 1).strokeRect(
            LOBBY_PREVIEW_DESK.x, LOBBY_PREVIEW_DESK.y,
            LOBBY_PREVIEW_DESK.width, LOBBY_PREVIEW_DESK.height,
        );
        annotations.push(scene.add.text(LOBBY_PREVIEW_DESK.x, LOBBY_PREVIEW_DESK.y + 4,
            'ACTIVE PREVIEW DESK', {
                fontFamily: 'monospace', fontSize: '12px', color: '#d2e9ff', backgroundColor: '#123258',
            }).setDepth(1202));
    }
    proposed.lineStyle(2, 0x62ff83, 1).strokeCircle(
        LOBBY_PROPOSED_STAIR_ANCHOR.x, LOBBY_PROPOSED_STAIR_ANCHOR.y, INTERACTION_RADIUS,
    );
    proposed.fillStyle(0x62ff83, 1).fillCircle(
        LOBBY_PROPOSED_STAIR_ANCHOR.x, LOBBY_PROPOSED_STAIR_ANCHOR.y, 4,
    );
    annotations.push(scene.add.text(LOBBY_PROPOSED_STAIR_ANCHOR.x - 48,
        LOBBY_PROPOSED_STAIR_ANCHOR.y + 8, 'Stairs E · r86', {
            fontFamily: 'monospace', fontSize: '12px', color: '#c8ffd3', backgroundColor: '#11351b',
        }).setDepth(1202));
    const marker = scene.add.graphics().setDepth(1201);
    const label = scene.add.text(20, 105, '', {
        fontFamily: 'monospace', fontSize: '15px', color: '#ffffff', backgroundColor: '#16313a',
    }).setDepth(1202).setScrollFactor(0);

    const update = (position: Point) => {
        marker.clear();
        marker.lineStyle(2, 0xff4f91, 1).strokeCircle(position.x, position.y, FOOT_RADIUS);
        marker.fillStyle(0xff4f91, 1).fillCircle(position.x, position.y, 3);
        label.setText(`FOOT x=${position.x.toFixed(1)} y=${position.y.toFixed(1)}  r=${FOOT_RADIUS}\n`
            + `cyan: walk  amber: foot centers  ${activeDesk ? 'blue: active desk  ' : ''}`
            + `orange: proposed  green: stairs E`);
    };
    update(foot);
    return {
        update,
        destroy: () => { boundary.destroy(); proposed.destroy(); marker.destroy(); label.destroy();
            for (const annotation of annotations) annotation.destroy(); },
    };
}
