import type { Message } from '@/types/messageTypes';
import type { User } from '@/types/userTypes';
import type { ID, Timestamp } from '@/types/utilityTypes';

export interface Cluster {
  id: ID;
  name: string;
  description?: string;
  owner_id: ID;
  created_at: Timestamp;
  members?: User[];
  topics?: Topic[];

  // Populated fields
  avatar?: string;
  member_details?: User[];
  member_count?: number;
}

export interface ClusterMessage extends Omit<Message, 'chat_id' | 'read_by'> {
  cluster_id: ID;
  topic_id: ID;
}

export interface SendClusterMessageResponse {
  success: boolean;
  message?: ClusterMessage;
  error?: string;
}

export interface Topic {
  id: ID;
  name: string;
  description?: string;
  created_at: Timestamp;
}
