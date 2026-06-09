import { useMemo } from 'react';
import { useClusterMessageStore } from '@/stores/clusterMessageStore';
import type { ID } from '@/types/utilityTypes';
import { clusterMessageMapToArrayConvert } from '@/utils/messageUtils';

export function useClusterMessages(clusterId: ID, topicId: ID | null) {
  const {
    editMessage,
    deleteMessage,
    fetchMessages,
    sendMessage,
    sendMessageWithAttachment,
    addReaction,
    removeReaction,
    removeMessageFromWs,
  } = useClusterMessageStore();

  const messages = useClusterMessageStore((s) =>
    topicId ? s.getTopicMessages(clusterId, topicId) : {}
  );

  const isLoading = useClusterMessageStore((s) =>
    topicId ? (s.loadingMessages[clusterId]?.[topicId] ?? false) : false
  );

  const messagesArray = useMemo(
    () => clusterMessageMapToArrayConvert(messages),
    [messages]
  );

  return {
    messages: messagesArray,
    isLoading,
    editMessage,
    deleteMessage,
    fetchMessages,
    sendMessage,
    sendMessageWithAttachment,
    addReaction,
    removeReaction,
    removeMessageFromWs,
  };
}
