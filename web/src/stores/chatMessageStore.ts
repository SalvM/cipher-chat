import api from '@/services/Api';
import { create } from 'zustand';

import type { ID, Timestamp } from '@/types/utilityTypes';
import type { Emoji, Message } from '@/types/messageTypes';
import type {
  ChatLoadingMessages,
  ChatMessagesState,
  GenericApiResponse,
  ChatMessageMap,
} from '@/types/storeTypes';
import { chatMessageArrayToMapConverter } from '@/utils/messageUtils';
import { CryptoService } from '@/services/CryptoService';
import { keyService } from '@/services/KeyService';
import { useConversationStore } from '@/stores/conversationStore';
import { useAuthStore } from '@/stores/authStore';

async function decryptSafe(key: CryptoKey, b64: string): Promise<string> {
  try {
    return await CryptoService.decryptMessage(key, b64);
  } catch {
    return '[Encrypted message]';
  }
}

interface ChatMessageStore {
  messages: ChatMessagesState;
  loadingMessages: ChatLoadingMessages;

  setLoadingMessages: (chatId: ID, isLoading: boolean) => void;
  getLoadingMessage: (chatId: ID) => boolean;

  setChatMessages: (chatId: ID, messages: Message[]) => void;
  getChatMessages: (chatId: ID) => ChatMessageMap;

  fetchMessages: (chatId: ID) => Promise<void>;

  sendMessage: (data: {
    chatId: ID;
    content: string;
    disappearingMinutes: number;
    replyToId?: ID;
  }) => GenericApiResponse;

  sendMessageWithAttachment: (data: {
    chatId: ID;
    content: string;
    file: Blob;
    disappearingMinutes: number;
    replyToId?: ID;
  }) => GenericApiResponse;

  editMessage: (
    chatId: ID,
    messageId: ID,
    content: string
  ) => GenericApiResponse;

  deleteMessage: (chatId: ID, messageId: ID) => GenericApiResponse;

  addReaction: (messageId: ID, emoji: Emoji) => GenericApiResponse;
  removeReaction: (messageId: ID, emoji: Emoji) => GenericApiResponse;
}

interface ChatMessageStoreWSActions {
  addMessageFromWs: (message: Message) => void;
  updateMessageFromWs: (messageUpdated: {
    chatId: ID;
    messageId: ID;
    updates: Partial<Message>;
    edited_at: Timestamp;
  }) => void;
  removeMessageFromWs: (chatId: ID, messageId: ID) => void;
  updateMessageReactionFromWS: (messageReaction: {
    chatId: ID;
    messageId: ID;
    emoji: Emoji;
    userId: ID;
    action: 'add' | 'remove';
  }) => void;
}

export const useChatMessageStore = create<
  ChatMessageStore & ChatMessageStoreWSActions
>((set, get) => ({
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
      const raw = responseData?.messages ?? [];

      const chat = useConversationStore.getState().chats[chatId];
      const otherUserId = chat?.otherUser?._id;
      const selfId = useAuthStore.getState().user?._id;
      const memberIds = [selfId, otherUserId].filter(Boolean) as ID[];

      let messages = raw;
      try {
        const ck = await keyService.getConversationKey('chat', chatId, memberIds);
        messages = await Promise.all(
          raw.map(async (msg) => ({
            ...msg,
            content: await decryptSafe(ck.key, msg.content),
            ...(msg.reply_to_content && {
              reply_to_content: await decryptSafe(ck.key, msg.reply_to_content),
            }),
          }))
        );
      } catch (e) {
        console.warn('[fetchMessages] Cannot acquire CK, showing raw content', e);
      }

      get().setChatMessages(chatId, messages);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      get().setLoadingMessages(chatId, false);
    }
  },

  sendMessage: async (data) => {
    const { chatId, content, disappearingMinutes, replyToId } = data;
    try {
      const chat = useConversationStore.getState().chats[chatId];
      const otherUserId = chat?.otherUser?._id;
      const selfId = useAuthStore.getState().user?._id;
      const memberIds = [selfId, otherUserId].filter(Boolean) as ID[];

      const ck = await keyService.getConversationKey('chat', chatId, memberIds);
      if (!ck) return { success: false, error: 'Encryption key not yet available. Try again shortly.' };
      const encContent = await CryptoService.encryptMessage(ck.key, content);

      let encReplyContent: string | undefined;
      if (replyToId) {
        const orig = get().messages[chatId]?.[replyToId];
        if (orig?.content) {
          try {
            // orig.content is already plaintext (decrypted in store)
            encReplyContent = await CryptoService.encryptMessage(
              ck.key,
              orig.content.slice(0, 100)
            );
          } catch { /* best-effort */ }
        }
      }

      await api.post<Message>('/messages', {
        body: {
          content: encContent,
          chat_id: chatId,
          disappearing_minutes: disappearingMinutes,
          reply_to: replyToId ?? null,
          ...(encReplyContent ? { reply_to_content: encReplyContent } : {}),
          key_version: ck.version,
        },
      });
      return { success: true };
    } catch (error: any) {
      console.error(error);
      return {
        success: false,
        error: error.data?.detail ?? 'Failed to send message',
      };
    }
  },

  sendMessageWithAttachment: async (data) => {
    const { chatId, content, file, disappearingMinutes, replyToId } = data;
    try {
      const chat = useConversationStore.getState().chats[chatId];
      const otherUserId = chat?.otherUser?._id;
      const selfId = useAuthStore.getState().user?._id;
      const memberIds = [selfId, otherUserId].filter(Boolean) as ID[];

      const ck = await keyService.getConversationKey('chat', chatId, memberIds);
      if (!ck) return { success: false, error: 'Encryption key not yet available. Try again shortly.' };
      const encContent = await CryptoService.encryptMessage(ck.key, content);

      const formData = new FormData();
      formData.append('content', encContent);
      formData.append('chat_id', chatId);
      formData.append('disappearing_minutes', disappearingMinutes?.toString());
      formData.append('file', file);
      formData.append('key_version', ck.version.toString());
      if (replyToId) {
        formData.append('reply_to', replyToId);
      }

      await api.post<Message>('/messages/with-attachment', {
        body: formData,
      });

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.data?.detail ?? 'Upload failed',
      };
    }
  },

  editMessage: async (chatId, messageId, content) => {
    try {
      const existing = get().messages[chatId];
      if (!existing) throw existing;

      const ck = await keyService.getConversationKey('chat', chatId);
      const encContent = await CryptoService.encryptMessage(ck.key, content);

      await api.put(`/messages/${messageId}`, {
        body: { content: encContent, key_version: ck.version },
      });
      set({
        messages: {
          ...get().messages,
          [chatId]: {
            ...existing,
            [messageId]: { ...existing[messageId], content },
          },
        },
      });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.data?.detail ?? 'Failed to edit message',
      };
    }
  },

  deleteMessage: async (chatId, messageId) => {
    try {
      const existing = get().messages[chatId];
      if (!existing) throw existing;
      await api.delete(`/messages/${messageId}`);
      const chat = { ...existing };
      delete chat[messageId];
      set({ messages: { ...get().messages, [chatId]: chat } });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.data?.detail ?? 'Failed to delete message',
      };
    }
  },

  addReaction: async (messageId, emoji) => {
    try {
      await api.post(`/messages/${messageId}/reactions`, { body: { emoji } });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.data?.detail ?? 'Failed to add reaction',
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
        error: error.data?.detail ?? 'Failed to remove reaction',
      };
    }
  },

  // WebSocket actions — content is already decrypted before these are called
  addMessageFromWs: (message: Message) => {
    const chatId = message?.chat_id ?? null;
    if (!chatId) return;
    const chatMessages = get().messages[chatId] ?? {};
    set({
      messages: {
        ...get().messages,
        [chatId]: { ...chatMessages, [message._id]: message },
      },
    });
  },
  updateMessageFromWs: ({ chatId, messageId, updates, edited_at }) => {
    const chatMessages = get().messages[chatId];
    if (!chatMessages) return;
    set({
      messages: {
        ...get().messages,
        [chatId]: {
          ...get().messages[chatId],
          [messageId]: {
            ...get().messages[chatId][messageId],
            ...updates,
            edited_at,
          },
        },
      },
    });
  },
  removeMessageFromWs: (chatId, messageId) => {
    const existing = get().messages[chatId];
    if (!existing) return;
    const chatMessages = { ...existing };
    delete chatMessages[messageId];
    set({
      messages: {
        ...get().messages,
        [chatId]: chatMessages,
      },
    });
  },
  updateMessageReactionFromWS: ({
    chatId,
    messageId,
    emoji,
    userId,
    action,
  }) => {
    const chatMessages = get().messages[chatId];
    if (!chatMessages) return;
    const existingMessage = get().messages[chatId][messageId];
    if (!existingMessage) return;
    const message = { ...existingMessage };
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
          ...chatMessages,
          [messageId]: message,
        },
      },
    });
  },
}));
