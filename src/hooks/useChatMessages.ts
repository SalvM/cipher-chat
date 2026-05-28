import { useChatMessageStore } from '@/stores/chatMessageStore';
import type { ID } from '@/types/utilityTypes';
import { chatMessageMapToArrayConvert } from '@/utils/messageUtils';
import { useMemo } from 'react';

export function useChatMessages(chatId: ID) {
  const {
    editMessage,
    deleteMessage,
    fetchMessages,
    sendMessage,
    sendMessageWithAttachment,
    addReaction,
    removeReaction,
  } = useChatMessageStore();

  const messages = useChatMessageStore((s) => s.getChatMessages(chatId));
  const messagesArray = useMemo(
    () => chatMessageMapToArrayConvert(messages),
    [messages]
  );

  const isLoading = useChatMessageStore(
    (s) => s.loadingMessages[chatId] ?? false
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
  };
}
