import type { ClusterMessage } from '@/types/clusterTypes';
import type { Message } from '@/types/messageTypes';

export type ID = string;
export type Timestamp = string; // ISO date string
export type Status = 'online' | 'offline' | 'away' | 'dnd' | 'invisible';
export type ReactionAction = 'add' | 'remove';
export type ChatType = 'chat' | 'cluster';
export type AnyMessage = Message | ClusterMessage;
