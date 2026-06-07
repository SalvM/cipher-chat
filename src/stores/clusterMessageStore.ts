import api from '@/services/Api';
import { create } from 'zustand';

import type { ID, Timestamp } from '@/types/utilityTypes';
import type { Emoji } from '@/types/messageTypes';
import type { ClusterMessage } from '@/types/clusterTypes';
import type {
  ClusterLoadingState,
  ClusterMessagesState,
  GenericApiResponse,
  TopicMessageMap,
} from '@/types/storeTypes';
import { clusterMessageArrayToMapConverter } from '@/utils/messageUtils';
import { EMPTY_MESSAGES } from '@/utils';
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

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface ClusterMessageStore {
  messages: ClusterMessagesState;
  loadingMessages: ClusterLoadingState;

  setLoadingMessages: (clusterId: ID, topicId: ID, isLoading: boolean) => void;
  getLoadingMessage: (clusterId: ID, topicId: ID) => boolean;

  setTopicMessages: (
    clusterId: ID,
    topicId: ID,
    messages: ClusterMessage[]
  ) => void;
  getTopicMessages: (clusterId: ID, topicId: ID) => TopicMessageMap;

  fetchMessages: (clusterId: ID, topicId: ID) => Promise<void>;

  sendMessage: (data: {
    clusterId: ID;
    topicId: ID;
    content: string;
    replyToId?: ID;
  }) => GenericApiResponse;

  sendMessageWithAttachment: (data: {
    clusterId: ID;
    topicId: ID;
    content: string;
    file: Blob;
    replyToId?: ID;
  }) => GenericApiResponse;

  editMessage: (
    clusterId: ID,
    topicId: ID,
    messageId: ID,
    content: string
  ) => GenericApiResponse;

  deleteMessage: (
    clusterId: ID,
    topicId: ID,
    messageId: ID
  ) => GenericApiResponse;

  addReaction: (messageId: ID, emoji: Emoji) => GenericApiResponse;
  removeReaction: (messageId: ID, emoji: Emoji) => GenericApiResponse;

  clearTopic: (clusterId: ID, topicId: ID) => void;
  clearCluster: (clusterId: ID) => void;
}

interface ClusterMessageStoreWSActions {
  addMessageFromWs: (payload: {
    clusterId: ID;
    topicId: ID;
    message: ClusterMessage;
  }) => void;
  updateMessageFromWs: (payload: {
    clusterId: ID;
    topicId: ID;
    messageId: ID;
    updates: Partial<ClusterMessage>;
    edited_at: Timestamp;
  }) => void;
  removeMessageFromWs: (payload: {
    clusterId: ID;
    topicId: ID;
    messageId: ID;
  }) => void;
  updateMessageReactionFromWS: (payload: {
    clusterId: ID;
    topicId: ID;
    messageId: ID;
    emoji: Emoji;
    userId: ID;
    action: 'add' | 'remove';
  }) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useClusterMessageStore = create<
  ClusterMessageStore & ClusterMessageStoreWSActions
>((set, get) => ({
  messages: {},
  loadingMessages: {},

  // ── Loading ────────────────────────────────────────────────────────────────

  setLoadingMessages: (clusterId, topicId, isLoading) =>
    set({
      loadingMessages: {
        ...get().loadingMessages,
        [clusterId]: {
          ...get().loadingMessages[clusterId],
          [topicId]: isLoading,
        },
      },
    }),

  getLoadingMessage: (clusterId, topicId) =>
    get().loadingMessages[clusterId]?.[topicId] ?? false,

  // ── Getters / setters ──────────────────────────────────────────────────────

  setTopicMessages: (clusterId, topicId, messages) =>
    set({
      messages: {
        ...get().messages,
        [clusterId]: {
          ...get().messages[clusterId],
          [topicId]: clusterMessageArrayToMapConverter(messages),
        },
      },
    }),

  getTopicMessages: (clusterId, topicId) =>
    get().messages[clusterId]?.[topicId] ?? EMPTY_MESSAGES,

  // ── Fetch ──────────────────────────────────────────────────────────────────

  fetchMessages: async (clusterId, topicId) => {
    try {
      get().setLoadingMessages(clusterId, topicId, true);
      const responseData = await api.get<{ messages: ClusterMessage[] }>(
        `/clusters/${clusterId}/topics/${topicId}/messages`
      );
      const raw = responseData?.messages ?? [];

      const cluster = useConversationStore.getState().clusters[clusterId];
      const selfId = useAuthStore.getState().user?._id;
      const memberIds = [
        ...(cluster?.member_details?.map((m) => m._id) ??
          cluster?.members?.map((m) => m._id) ??
          []),
      ];
      if (selfId && !memberIds.includes(selfId)) memberIds.push(selfId);

      let messages = raw;
      try {
        const ck = await keyService.getConversationKey(
          'cluster',
          clusterId,
          memberIds
        );
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
        console.warn(
          '[fetchClusterMessages] Cannot acquire CK, showing raw content',
          e
        );
      }

      get().setTopicMessages(clusterId, topicId, messages);
    } catch (error) {
      console.error('Failed to fetch cluster messages:', error);
    } finally {
      get().setLoadingMessages(clusterId, topicId, false);
    }
  },

  // ── Send ───────────────────────────────────────────────────────────────────

  // disappearing_minutes is NOT forwarded: each topic already has its own
  // default expiry configured server-side.
  sendMessage: async ({ clusterId, topicId, content, replyToId }) => {
    try {
      const cluster = useConversationStore.getState().clusters[clusterId];
      const selfId = useAuthStore.getState().user?._id;
      const memberIds = [
        ...(cluster?.member_details?.map((m) => m._id) ??
          cluster?.members?.map((m) => m._id) ??
          []),
      ];
      if (selfId && !memberIds.includes(selfId)) memberIds.push(selfId);

      const ck = await keyService.getConversationKey(
        'cluster',
        clusterId,
        memberIds
      );
      if (!ck)
        return {
          success: false,
          error: 'Encryption key not yet available. Try again shortly.',
        };
      const encContent = await CryptoService.encryptMessage(ck.key, content);

      let encReplyContent: string | undefined;
      if (replyToId) {
        const orig = get().messages[clusterId]?.[topicId]?.[replyToId];
        if (orig?.content) {
          try {
            // orig.content is already plaintext (decrypted in store)
            encReplyContent = await CryptoService.encryptMessage(
              ck.key,
              orig.content.slice(0, 100)
            );
          } catch {
            /* best-effort */
          }
        }
      }

      await api.post<ClusterMessage>(`/clusterMessages`, {
        body: {
          content: encContent,
          cluster_id: clusterId,
          topic_id: topicId,
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

  sendMessageWithAttachment: async ({
    clusterId,
    topicId,
    content,
    file,
    replyToId,
  }) => {
    try {
      const cluster = useConversationStore.getState().clusters[clusterId];
      const selfId = useAuthStore.getState().user?._id;
      const memberIds = [
        ...(cluster?.member_details?.map((m) => m._id) ??
          cluster?.members?.map((m) => m._id) ??
          []),
      ];
      if (selfId && !memberIds.includes(selfId)) memberIds.push(selfId);

      const ck = await keyService.getConversationKey(
        'cluster',
        clusterId,
        memberIds
      );
      if (!ck)
        return {
          success: false,
          error: 'Encryption key not yet available. Try again shortly.',
        };
      const encContent = await CryptoService.encryptMessage(ck.key, content);

      const formData = new FormData();
      formData.append('content', encContent);
      formData.append('cluster_id', clusterId);
      formData.append('topic_id', topicId);
      if (replyToId) formData.append('reply_to', replyToId);
      formData.append('file', file);
      formData.append('key_version', ck.version.toString());

      await api.post<ClusterMessage>(`/clusterMessages/with-attachment`, {
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

  // ── Edit / Delete ──────────────────────────────────────────────────────────

  editMessage: async (clusterId, topicId, messageId, content) => {
    try {
      const existing = get().messages[clusterId]?.[topicId];
      if (!existing) throw new Error('Topic not loaded');

      const ck = await keyService.getConversationKey('cluster', clusterId);
      const encContent = await CryptoService.encryptMessage(ck.key, content);

      await api.put(`/clusterMessages/${messageId}`, {
        body: { content: encContent, key_version: ck.version },
      });
      set({
        messages: {
          ...get().messages,
          [clusterId]: {
            ...get().messages[clusterId],
            [topicId]: {
              ...existing,
              [messageId]: { ...existing[messageId], content },
            },
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

  deleteMessage: async (clusterId, topicId, messageId) => {
    try {
      const existing = get().messages[clusterId]?.[topicId];
      if (!existing) throw new Error('Topic not loaded');
      await api.delete(`/clusterMessages/${messageId}`);
      const updated = { ...existing };
      delete updated[messageId];
      set({
        messages: {
          ...get().messages,
          [clusterId]: {
            ...get().messages[clusterId],
            [topicId]: updated,
          },
        },
      });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.data?.detail ?? 'Failed to delete message',
      };
    }
  },

  // ── Reactions ─────────────────────────────────────────────────────────────

  addReaction: async (messageId, emoji) => {
    try {
      await api.post(`/clusterMessages/${messageId}/reactions`, {
        body: { emoji },
      });
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
        `/clusterMessages/${messageId}/reactions/${encodeURIComponent(emoji)}`
      );
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.data?.detail ?? 'Failed to remove reaction',
      };
    }
  },

  // ── Cleaning ───────────────────────────────────────────────────────────────

  clearTopic: (clusterId, topicId) => {
    const cluster = get().messages[clusterId];
    if (!cluster) return;
    const updated = { ...cluster };
    delete updated[topicId];
    set({ messages: { ...get().messages, [clusterId]: updated } });
  },

  clearCluster: (clusterId) => {
    const updated = { ...get().messages };
    delete updated[clusterId];
    set({ messages: updated });
  },

  // ── WebSocket (content already decrypted before these are called) ──────────

  addMessageFromWs: ({ clusterId, topicId, message }) => {
    if (!clusterId || !topicId) return;
    const topicMessages = get().messages[clusterId]?.[topicId];
    if (!topicMessages) return;
    set({
      messages: {
        ...get().messages,
        [clusterId]: {
          ...get().messages[clusterId],
          [topicId]: { ...topicMessages, [message._id]: message },
        },
      },
    });
  },

  updateMessageFromWs: ({
    clusterId,
    topicId,
    messageId,
    updates,
    edited_at,
  }) => {
    const topicMessages = get().messages[clusterId]?.[topicId];
    if (!topicMessages) return;
    set({
      messages: {
        ...get().messages,
        [clusterId]: {
          ...get().messages[clusterId],
          [topicId]: {
            ...topicMessages,
            [messageId]: {
              ...topicMessages[messageId],
              ...updates,
              edited_at,
            },
          },
        },
      },
    });
  },

  removeMessageFromWs: ({ clusterId, topicId, messageId }) => {
    const topicMessages = get().messages[clusterId]?.[topicId];
    if (!topicMessages) return;
    const updated = { ...topicMessages };
    delete updated[messageId];
    set({
      messages: {
        ...get().messages,
        [clusterId]: {
          ...get().messages[clusterId],
          [topicId]: updated,
        },
      },
    });
  },

  updateMessageReactionFromWS: ({
    clusterId,
    topicId,
    messageId,
    emoji,
    userId,
    action,
  }) => {
    const topicMessages = get().messages[clusterId]?.[topicId];
    if (!topicMessages) return;
    const existingMessage = topicMessages[messageId];
    if (!existingMessage) return;

    const reactions = { ...existingMessage.reactions };
    if (action === 'add') {
      reactions[emoji] = [...(reactions[emoji] ?? []), userId];
    } else {
      reactions[emoji] = (reactions[emoji] ?? []).filter((id) => id !== userId);
      if (reactions[emoji]!.length === 0) delete reactions[emoji];
    }

    set({
      messages: {
        ...get().messages,
        [clusterId]: {
          ...get().messages[clusterId],
          [topicId]: {
            ...topicMessages,
            [messageId]: { ...existingMessage, reactions },
          },
        },
      },
    });
  },
}));
