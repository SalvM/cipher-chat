import api from '@/services/Api';
import { create } from 'zustand';

import type { ID } from '@/types/utilityTypes';
import type { Emoji, Message } from '@/types/messageTypes';
import type {
  ChatLoadingMessages,
  ChatMessagesState,
  GenericApiResponse,
  ChatMessageMap,
} from '@/types/storeTypes';
import { chatMessageArrayToMapConverter } from '@/utils/messageUtils';

interface ChatMessageStore {
  messages: ChatMessagesState;
  loadingMessages: ChatLoadingMessages;

  setLoadingMessages: (chatId: ID, isLoading: boolean) => void;
  getLoadingMessage: (chatId: ID) => boolean;

  setChatMessages: (chatId: ID, messages: Message[]) => void;
  getChatMessages: (chatId: ID) => ChatMessageMap;

  fetchMessages: (chatId: ID) => Promise<void>;

  sendMessage: (
    chatId: ID,
    content: string,
    replyToId?: ID
  ) => GenericApiResponse;

  sendMessageWithAttachment: (
    chatId: ID,
    content: string,
    file: Blob,
    replyToId?: ID
  ) => GenericApiResponse;

  editMessage: (
    chatId: ID,
    messageId: ID,
    content: string
  ) => GenericApiResponse;

  deleteMessage: (chatId: ID, messageId: ID) => GenericApiResponse;

  addReaction: (messageId: ID, emoji: Emoji) => GenericApiResponse;
  removeReaction: (messageId: ID, emoji: Emoji) => GenericApiResponse;
  updateMessageReaction: (
    chatId: ID,
    messageId: ID,
    emoji: Emoji,
    userId: ID,
    action: 'add' | 'remove'
  ) => void;
  // Cleaaning (for LRU futuro)
  // clearChat: (chatId: ID) => void;
}

export const useChatMessageStore = create<ChatMessageStore>((set, get) => ({
  messages: {},
  loadingMessages: {},

  setLoadingMessages: (chatId: ID, isLoading: boolean) =>
    set({ loadingMessages: { ...get().loadingMessages, [chatId]: isLoading } }),
  getLoadingMessage: (chatId: ID) => get().loadingMessages[chatId],

  setChatMessages: (chatId: ID, messages: Message[]) =>
    set({
      messages: {
        ...get().messages,
        [chatId]: chatMessageArrayToMapConverter(messages),
      },
    }),

  getChatMessages: (chatId: ID) => {
    return get().messages[chatId];
  },

  fetchMessages: async (chatId: ID) => {
    try {
      get().setLoadingMessages(chatId, true);
      const responseData = await api.get<{ messages: Message[] }>(
        `/chats/${chatId}/messages`
      );
      get().setChatMessages(chatId, responseData?.messages ?? []);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      get().setLoadingMessages(chatId, false);
    }
  },

  sendMessage: async (chatId, content, replyToId?) => {
    try {
      await api.post<Message>('/messages', {
        body: {
          content,
          chat_id: chatId,
          reply_to: replyToId ?? null,
        },
      });
      return { success: true };
    } catch (error: any) {
      console.error(error);
      return {
        success: false,
        error: error.response?.detail ?? 'Failed to send message',
      };
    }
  },

  sendMessageWithAttachment: async (chatId, content, file, replyToId?) => {
    try {
      const formData = new FormData();
      formData.append('content', content);
      formData.append('chat_id', chatId);
      formData.append('file', file);
      if (replyToId) {
        formData.append('reply_to', replyToId);
      }

      await api.post<Message>('/messages/with-attachment', {
        headers: { 'Content-Type': 'multipart/form-data' },
        body: formData,
      });

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.detail ?? 'Upload failed',
      };
    }
  },

  editMessage: async (chatId, messageId, content) => {
    try {
      await api.put(`/messages/${messageId}`, { body: { content } });
      set({
        ...get().messages,
        [chatId]: {
          ...get().messages[chatId],
          [messageId]: { ...get().messages[chatId][messageId], content },
        },
      });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.detail ?? 'Failed to send message',
      };
    }
  },

  deleteMessage: async (chatId, messageId) => {
    try {
      await api.delete(`/messages/${messageId}`);
      const chat = { ...get().messages[chatId] };
      delete chat[messageId];
      set({ messages: { ...get().messages, [chatId]: chat } });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.detail ?? 'Failed to send message',
      };
    }
  },

  // Message reactions
  addReaction: async (messageId, emoji) => {
    try {
      await api.post(`/messages/${messageId}/reactions`, { body: { emoji } });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.detail ?? 'Failed to add reaction',
      };
    }
  },

  removeReaction: async (messageId, emoji) => {
    try {
      await api.delete(
        `/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`
      );
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.detail ?? 'Failed to remove reaction',
      };
    }
  },

  // FE calls it after WS update
  updateMessageReaction: (chatId, messageId, emoji, userId, action) => {
    const message = { ...get().messages[chatId][messageId] };
    const reactions = { ...message.reactions };
    if (action === 'add') {
      reactions[emoji] = [...(reactions[emoji] || []), userId];
    } else {
      reactions[emoji] = (reactions[emoji] || []).filter((id) => id !== userId);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    }
    message.reactions = reactions;
    set({
      messages: {
        ...get().messages,
        [chatId]: {
          ...get().messages[chatId],
          [messageId]: message,
        },
      },
    });
  },
}));
