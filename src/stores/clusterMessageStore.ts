import type { ClusterMessage } from '@/types/clusterTypes';
import type { ID } from '@/types/utilityTypes';

type TopicMessageMap = Record<ID, ClusterMessage>; // messageId -> ClusterMessage
type TopicMessagesState = Record<ID, TopicMessageMap>; // topicId -> messages
type ClusterMessagesState = Record<ID, TopicMessagesState>; // clusterId -> topics

export interface ClusterMessageStore {
  messages: ClusterMessagesState;

  fetchMessages: (clusterId: ID, topicId: ID) => Promise<void>;

  addMessage: (clusterId: ID, topicId: ID, message: ClusterMessage) => void;
  updateMessage: (clusterId: ID, topicId: ID, message: ClusterMessage) => void;
  deleteMessage: (clusterId: ID, topicId: ID, messageId: ID) => void;

  sendMessage: (
    clusterId: ID,
    topicId: ID,
    content: string,
    replyToId?: ID
  ) => Promise<void>;

  clearTopic: (clusterId: ID, topicId: ID) => void;
  clearCluster: (clusterId: ID) => void;
}
