export type LocationId = 'lobby' | 'staircase' | 'hallway' | 'room407';
export type Facing = -1 | 1;
export interface Point { readonly x: number; readonly y: number }
export interface Rect extends Point { readonly width: number; readonly height: number }
export interface Entry extends Point { readonly facing: Facing }
export interface Player extends Entry { readonly locationId: LocationId }

export interface RecordDefinition {
    readonly id: string;
    readonly kind: 'observation' | 'testimony';
    readonly title: string;
    readonly text: string;
    readonly source: string;
    readonly locationId: LocationId;
    readonly eventTime?: string;
}
export interface Discovery { readonly id: string; readonly recordedAt: number }
export interface KnowledgeRecord extends RecordDefinition { readonly recordedAt: number }
export interface DialogueLine { readonly speaker: string; readonly text: string; readonly recordId?: string }
export interface ConversationDefinition {
    readonly npcId: string;
    readonly name: string;
    readonly greeting: string;
    readonly rememberedAccusationGreeting: string;
    readonly account: DialogueLine;
    readonly room: DialogueLine;
}
export interface NpcMemoryEvent {
    readonly kind: 'accused';
    readonly npcId: string;
    readonly locationId: LocationId;
    readonly recordedAt: number;
}

interface InteractionBase extends Point { readonly id: string; readonly label: string }
export type Interaction = InteractionBase & (
    | { readonly kind: 'exit'; readonly destination: LocationId; readonly entry: string; readonly travelText?: string }
    | { readonly kind: 'examine'; readonly recordId: string }
    | { readonly kind: 'talk'; readonly conversationId: string }
);

export interface Prop extends Rect {
    readonly kind: 'desk' | 'table' | 'bed' | 'door' | 'window' | 'stairs';
    readonly label?: string;
    readonly detail?: 'glass' | 'note';
}
export interface LocationDefinition {
    readonly id: LocationId;
    readonly name: string;
    readonly subtitle: string;
    readonly floor: string;
    readonly width: number;
    readonly walkBounds: Rect;
    readonly entries: Readonly<Record<string, Entry>>;
    readonly obstacles: readonly Rect[];
    readonly props: readonly Prop[];
    readonly interactions: readonly Interaction[];
}
export interface WorldDefinition {
    readonly locations: Readonly<Record<LocationId, LocationDefinition>>;
    readonly records: Readonly<Record<string, RecordDefinition>>;
    readonly conversations: Readonly<Record<string, ConversationDefinition>>;
}
export interface SavedGame {
    readonly version: 2;
    readonly contentVersion: 'bellweather-1';
    readonly player: Player;
    readonly discoveries: readonly Discovery[];
    readonly npcMemories: readonly NpcMemoryEvent[];
}
export interface Conversation {
    readonly id: string;
    readonly name: string;
    readonly history: readonly DialogueLine[];
    readonly pending: boolean;
    readonly error: string;
}
export interface ViewState {
    readonly locationId: LocationId;
    readonly nearby: Interaction | null;
    readonly notebookOpen: boolean;
    readonly conversation: Conversation | null;
    readonly entries: readonly KnowledgeRecord[];
    readonly message: string;
}
