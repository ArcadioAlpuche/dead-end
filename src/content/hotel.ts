import type { WorldDefinition } from '../core/model.ts';
import { cases } from './cases.ts';
import { npcConversations } from './npcs.ts';
import { bellweatherEntrance, townBuildings } from './townLayout.ts';

// Prototype story details are deliberately observations and attributed claims, not a case solution.
export const hotel: WorldDefinition = {
    cases,
    locations: {
        town: {
            id: 'town', presentation: 'overworld', name: 'Bellweather block', subtitle: 'TOWN EXTERIOR · PROTOTYPE', floor: 'STREET LEVEL', width: 1600, height: 1200,
            walkBounds: { x: 30, y: 230, width: 1540, height: 920 },
            entries: { arrival: { x: 260, y: 590, facing: 1 }, fromHotel: { x: 825, y: 630, facing: 1 } },
            obstacles: townBuildings.map(building => building.footprint),
            props: [],
            interactions: [
                { id: 'town-hotel', kind: 'exit', label: 'Enter the Bellweather Hotel', ...bellweatherEntrance, destination: 'lobby', entry: 'fromTown' },
            ],
        },
        lobby: {
            id: 'lobby', name: 'The lobby', subtitle: 'BELLWEATHER HOTEL', floor: 'GROUND FLOOR', width: 1320,
            walkBounds: { x: 30, y: 550, width: 1260, height: 218 },
            entries: { arrival: { x: 245, y: 710, facing: 1 }, fromTown: { x: 285, y: 650, facing: 1 }, fromStairs: { x: 1090, y: 625, facing: -1 } },
            obstacles: [
                { x: 440, y: 530, width: 580, height: 60 },
                { x: 1050, y: 530, width: 250, height: 40 },
            ],
            props: [],
            interactions: [
                { id: 'lobby-town', kind: 'exit', label: 'Leave for the street', x: 230, y: 580, destination: 'town', entry: 'fromHotel' },
                { id: 'receptionist', kind: 'talk', label: 'Talk to the receptionist', x: 730, y: 660, conversationId: 'reception' },
                { id: 'lobby-stairs', kind: 'exit', label: 'Enter the staircase', x: 1175, y: 595, destination: 'staircase', entry: 'fromLobby' },
            ],
        },
        staircase: {
            id: 'staircase', name: 'The staircase', subtitle: 'BELLWEATHER HOTEL', floor: 'GROUND → FOURTH', width: 1120,
            walkBounds: { x: 30, y: 500, width: 1060, height: 165 },
            entries: { fromLobby: { x: 190, y: 550, facing: 1 }, fromFourth: { x: 740, y: 560, facing: -1 } },
            obstacles: [],
            props: [
                { kind: 'door', x: 65, y: 300, width: 110, height: 200, label: 'LOBBY' },
                { kind: 'stairs', x: 330, y: 170, width: 660, height: 330 },
            ],
            interactions: [
                { id: 'stairs-lobby', kind: 'exit', label: 'Return to the lobby', x: 120, y: 540, destination: 'lobby', entry: 'fromStairs' },
                { id: 'stairs-fourth', kind: 'exit', label: 'Climb three flights · Floor 4', x: 800, y: 540, destination: 'hallway', entry: 'fromStairs', travelText: 'Second. Third. Fourth. The stairs earn their keep.' },
            ],
        },
        hallway: {
            id: 'hallway', name: 'Fourth-floor hallway', subtitle: 'BELLWEATHER HOTEL', floor: 'FOURTH FLOOR', width: 1480,
            walkBounds: { x: 30, y: 500, width: 1420, height: 165 },
            entries: { fromStairs: { x: 190, y: 550, facing: 1 }, from407: { x: 1160, y: 550, facing: -1 } },
            obstacles: [],
            props: [
                { kind: 'door', x: 65, y: 300, width: 110, height: 200, label: 'STAIRS ↓' },
                { kind: 'door', x: 380, y: 300, width: 110, height: 200, label: '405 · PRIVATE' },
                { kind: 'door', x: 760, y: 300, width: 110, height: 200, label: '406 · PRIVATE' },
                { kind: 'door', x: 1175, y: 300, width: 110, height: 200, label: '407' },
            ],
            interactions: [
                { id: 'fourth-stairs', kind: 'exit', label: 'Descend three flights · Lobby level', x: 120, y: 540, destination: 'staircase', entry: 'fromFourth', travelText: 'Down past the third and second floors to the lobby landing.' },
                { id: 'hall-407', kind: 'exit', label: 'Enter Room 407 · Unlocked', x: 1230, y: 540, destination: 'room407', entry: 'fromHallway' },
            ],
        },
        room407: {
            id: 'room407', name: 'Room 407', subtitle: 'BELLWEATHER HOTEL', floor: 'FOURTH FLOOR', width: 1240,
            walkBounds: { x: 30, y: 500, width: 1180, height: 165 },
            entries: { fromHallway: { x: 190, y: 550, facing: 1 } },
            obstacles: [
                { x: 420, y: 500, width: 120, height: 40 },
                { x: 750, y: 500, width: 140, height: 40 },
                { x: 1010, y: 500, width: 170, height: 80 },
            ],
            props: [
                { kind: 'door', x: 65, y: 300, width: 110, height: 200, label: 'HALLWAY' },
                { kind: 'window', x: 300, y: 200, width: 230, height: 230 },
                { kind: 'table', x: 420, y: 455, width: 120, height: 85, detail: 'glass' },
                { kind: 'table', x: 750, y: 455, width: 140, height: 85, detail: 'note' },
                { kind: 'bed', x: 1010, y: 430, width: 170, height: 150 },
            ],
            interactions: [
                { id: '407-hall', kind: 'exit', label: 'Return to the hallway', x: 120, y: 540, destination: 'hallway', entry: 'from407' },
                { id: 'glass', kind: 'examine', label: 'Examine the champagne glass', x: 480, y: 575, recordId: 'champagne-glass' },
                { id: 'note', kind: 'examine', label: 'Read the folded note', x: 820, y: 575, recordId: 'folded-note' },
                { id: 'bed', kind: 'examine', label: 'Examine the bed', x: 1095, y: 620, recordId: 'undisturbed-bed' },
            ],
        },
    },
    records: {
        'champagne-glass': { id: 'champagne-glass', kind: 'observation', title: 'A champagne glass', locationId: 'room407', source: 'Direct examination · Room 407', text: 'One champagne glass stands on the small table. There is a dark red mark on its rim and a little liquid in the bowl. Neither the drinker nor the contents have been identified.' },
        'folded-note': { id: 'folded-note', kind: 'observation', title: 'The folded note', locationId: 'room407', source: 'Text read · Room 407', text: 'A folded note on the writing table reads: “After the last set. Come alone.” It bears no signature or date. The words do not establish that a meeting took place.' },
        'undisturbed-bed': { id: 'undisturbed-bed', kind: 'observation', title: 'An undisturbed bed', locationId: 'room407', source: 'Direct examination · Room 407', text: 'The coverlet is smooth and the pillows are arranged against the headboard. This does not establish whether anyone slept here earlier.' },
        'receptionist-account': { id: 'receptionist-account', kind: 'testimony', title: 'The receptionist’s account', locationId: 'lobby', source: 'Receptionist · Conversation in the lobby', eventTime: 'Last night, around midnight — according to the receptionist', text: 'The receptionist says someone came down from the upper floors around midnight, carrying a coat. They did not see which room the person left. This account has not been verified.' },
    },
    conversations: npcConversations,
};
