import type { PendingAction } from './actions.ts';
import type { ConversationReferent } from './conversation.ts';

export type LocationId = 'town' | 'lobby' | 'staircase' | 'hallway' | 'room407';
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
export type KaneFactId = 'name' | 'occupation' | 'former-police';
export interface NpcContactState {
    readonly encounteredAt: number;
    // A disclosure records what Kane said, not independent verification of his claim.
    readonly disclosures: Readonly<Partial<Record<KaneFactId, number>>>;
}
export interface ConversationDefinition {
    readonly npcId: string;
    readonly name: string;
    readonly unknownLabel: string;
    readonly greeting: string;
    readonly returningGreeting?: string;
    readonly disclosureReply?: string;
    readonly priorKaneKnowledge?: readonly KaneFactId[];
    readonly rememberedAccusationGreeting: string;
    readonly personality: string;
    readonly patience: number;
    readonly warning: string;
    readonly disengaged: string;
    readonly silent: string;
    readonly reengaged: string;
    readonly accusationReply: string;
    readonly rapport: string;
    readonly smallTalk: string;
    readonly irrelevant: string;
    readonly topics: Readonly<Record<string, NpcTopicDefinition>>;
}
export interface NpcTopicDefinition {
    readonly id: string;
    readonly stance: 'observed' | 'procedure' | 'claim' | 'belief' | 'uncertain' | 'evasion' | 'deception';
    readonly line: DialogueLine;
    readonly followUp: string;
    // The recognizer matches a complete question subject, then the NPC's topic
    // and contextual reply determine what that NPC can actually say.
    readonly recognition?: readonly { readonly entityId: string; readonly kind: 'person' | 'place' | 'object' | 'event'; readonly aliases: readonly string[];
        readonly identity?: 'named' | 'unknown' | 'questioned';
        readonly directIntents?: readonly 'person-about'[] }[];
    readonly contextualReplies?: Readonly<Record<string, string>>;
    readonly replyContext?: Readonly<Record<string, { readonly referents: readonly ConversationReferent[];
        readonly focus?: 'sighting' | 'checkout' | 'room' | 'assignment' }>>;
    readonly establishesIdentity?: boolean;
}
export type NpcIdentityKnowledge =
    | { readonly status: 'claimed'; readonly claimedName: string; readonly recordedAt: number }
    | { readonly status: 'established'; readonly recordedAt: number };
interface MemoryBase {
    readonly kind: 'accused' | 'topic' | 'statement' | 'friction';
    readonly npcId: string;
    readonly locationId: LocationId;
    readonly recordedAt: number;
}
export type NpcMemoryEvent =
    | (MemoryBase & { readonly kind: 'accused' })
    | (MemoryBase & { readonly kind: 'topic'; readonly topicId: string })
    | (MemoryBase & { readonly kind: 'statement'; readonly statementId: string })
    | (MemoryBase & { readonly kind: 'friction'; readonly count: number });
export interface CaseDefinition {
    readonly id: string;
    readonly title: string;
    readonly clientId: string;
    readonly client: string;
    readonly offer: string;
    readonly assignment: string;
}
export interface CaseAcceptance { readonly kind: 'accepted'; readonly recordedAt: number }
export interface CaseState {
    readonly status: 'available' | 'active';
    readonly history: readonly CaseAcceptance[];
}
export interface CasebookEntry extends CaseDefinition, CaseState {}

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
    readonly presentation?: 'overworld';
    readonly height?: number;
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
    readonly cases: Readonly<Record<string, CaseDefinition>>;
    readonly locations: Readonly<Record<LocationId, LocationDefinition>>;
    readonly records: Readonly<Record<string, RecordDefinition>>;
    readonly conversations: Readonly<Record<string, ConversationDefinition>>;
}
export interface SavedGame {
    readonly version: 6;
    readonly contentVersion: 'bellweather-3';
    readonly player: Player;
    readonly discoveries: readonly Discovery[];
    readonly npcMemories: readonly NpcMemoryEvent[];
    readonly npcIdentities: Readonly<Record<string, NpcIdentityKnowledge>>;
    readonly npcContacts: Readonly<Record<string, NpcContactState>>;
    readonly cases: Readonly<Record<string, CaseState>>;
}
export interface Conversation {
    readonly id: string;
    readonly name: string;
    readonly history: readonly DialogueLine[];
    readonly pending: boolean;
    readonly error: string;
}
export interface ViewState {
    readonly pendingAction: PendingAction | null;
    readonly actionError: string;
    readonly locationId: LocationId;
    readonly nearby: Interaction | null;
    readonly notebookOpen: boolean;
    readonly caseOfferId: string | null;
    readonly cases: readonly CasebookEntry[];
    readonly conversation: Conversation | null;
    readonly entries: readonly KnowledgeRecord[];
    readonly message: string;
}
