import type { Message } from '@/types/messageTypes';
import type { ClusterMessage } from '@/types/clusterTypes';
import type { ID } from '@/types/utilityTypes';

// ─── Chat ────────────────────────────────────────────────────────────────────

export type ChatMessageMap = Record<ID, Message>; // messageId -> Message
export type ChatMessagesState = Record<ID, ChatMessageMap>; // chatId -> messages
export type ChatLoadingMessages = Record<ID, boolean>; // chatId -> isLoading

// ─── Cluster ─────────────────────────────────────────────────────────────────

export type TopicMessageMap = Record<ID, ClusterMessage>; // messageId -> ClusterMessage
export type TopicMessagesState = Record<ID, TopicMessageMap>; // topicId -> messages
export type ClusterMessagesState = Record<ID, TopicMessagesState>; // clusterId -> topics

export type TopicLoadingState = Record<ID, boolean>; // topicId -> isLoading
export type ClusterLoadingState = Record<ID, TopicLoadingState>; // clusterId -> topics

// ─── Shared ───────────────────────────────────────────────────────────────────

export type GenericApiResponse = Promise<{ success: boolean; error?: string }>;
