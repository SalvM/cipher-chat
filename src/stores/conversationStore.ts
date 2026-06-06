import api from '@/services/Api';
import type { Chat, ChatInputField } from '@/types/chatTypes';
import type { Cluster, ClusterInputField, Topic } from '@/types/clusterTypes';
import type { Message } from '@/types/messageTypes';
import type { ChatType, ID } from '@/types/utilityTypes';
import type { User } from '@/types/userTypes';
import { create } from 'zustand';

// ─── Chat ─────────────────────────────────────────────────────────────────────

interface ChatConversationState {
  chats: Record<ID, Chat>;
  selectedChatId: ID | null;
  typingInCurrentChat: boolean;
}

interface ChatConversationActions {
  getCurrentChat: () => Chat | null;
  setSelectedChatId: (chatId: ID | null) => void;
  isSelectedChatId: (chatId: ID) => boolean;
  fetchChats: () => Promise<void>;
  createChat: (userId: ID) => Promise<void>;
  setChatLastMessage: (message: Message) => void;
  setChatInputField: (chatId: ID, inputField: ChatInputField) => void;
  setChatSettings: (chatId: ID, disappearingMinutes: number) => void;
  setTypingInChat: (isTyping: boolean) => void;
}

// ─── Cluster ──────────────────────────────────────────────────────────────────

interface ClusterConversationState {
  clusters: Record<ID, Cluster>;
  selectedClusterId: ID | null;
  selectedTopicId: ID | null;
  typingInCurrentTopic: Record<ID, boolean>; // userId -> isTyping
}

interface ClusterConversationActions {
  getCurrentCluster: () => Cluster | null;
  getCurrentTopic: () => Topic | null;
  setSelectedClusterId: (clusterId: ID | null) => void;
  setSelectedTopicId: (topicId: ID | null) => void;
  fetchClusters: () => Promise<void>;
  createCluster: (name: string, description: string) => Promise<ID | null>;
  setTopicInputField: (
    clusterId: ID,
    topicId: ID,
    inputField: ClusterInputField
  ) => void;
  setTypingInTopic: (userId: ID, isTyping: boolean) => void;
  setCurrentTopic: (params: {
    name?: string;
    description?: string;
    disappearingMinutes?: number;
  }) => void;
  newTopicFromWS: (params: { clusterId: ID; topic: Topic }) => void;
  updateTopicFromWS: (params: {
    clusterId: ID;
    topicId: ID;
    name?: string;
    description?: string;
    disappearingMinutes?: number;
  }) => void;
  updateCluster: (
    clusterId: ID,
    name: string,
    description: string
  ) => Promise<void>;
  deleteCluster: (clusterId: ID) => Promise<void>;
  updateTopic: (
    clusterId: ID,
    topicId: ID,
    params: {
      name?: string;
      description?: string;
      disappearingMinutes?: number;
    }
  ) => Promise<void>;
  deleteTopic: (clusterId: ID, topicId: ID) => Promise<void>;
  removeMember: (clusterId: ID, memberId: ID) => Promise<void>;
  // WS-only (no API call, pure state mutations)
  updateClusterFromWS: (
    clusterId: ID,
    name: string,
    description?: string
  ) => void;
  deleteClusterFromWS: (clusterId: ID) => void;
  deleteTopicFromWS: (clusterId: ID, topicId: ID) => void;
  memberJoinedFromWS: (clusterId: ID, user: User) => void;
  memberLeftFromWS: (clusterId: ID, userId: ID) => void;
}

// ─── Shared ───────────────────────────────────────────────────────────────────

interface SharedConversationState {
  selectedTab: ChatType;
  isLoading: boolean;
}

interface SharedConversationActions {
  setSelectedTab: (tab: ChatType) => void;
  setLoading: (loading: boolean) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

type ConversationStore = ChatConversationState &
  ChatConversationActions &
  ClusterConversationState &
  ClusterConversationActions &
  SharedConversationState &
  SharedConversationActions;

export const useConversationStore = create<ConversationStore>((set, get) => ({
  // ── Chat state ─────────────────────────────────────────────────────────────
  chats: {},
  selectedChatId: null,
  typingInCurrentChat: false,

  getCurrentChat: () => {
    const chatId = get().selectedChatId;
    if (!chatId) return null;
    return get().chats[chatId] ?? null;
  },

  setSelectedChatId: (chatId) =>
    set({ selectedChatId: chatId, typingInCurrentChat: false }),

  isSelectedChatId: (chatId) => get().selectedChatId === chatId,

  fetchChats: async () => {
    set({ isLoading: true });
    try {
      const responseData = await api.get<{ chats: Chat[] }>('/chats');
      if (!responseData?.chats) throw responseData;
      set({
        chats: Object.fromEntries(
          responseData.chats.map((chat) => [chat._id, chat])
        ),
      });
    } catch (e) {
      console.error('[fetchChats]', e);
    } finally {
      set({ isLoading: false });
    }
  },

  createChat: async (userId) => {
    set({ isLoading: true });
    try {
      const responseData = await api.post<Chat>('/chats', {
        body: { recipient_id: userId },
      });
      if (!responseData?._id) throw responseData;
      set({
        chats: { ...get().chats, [responseData._id]: responseData },
        selectedChatId: responseData._id,
        selectedTab: 'chat',
      });
    } catch (e) {
      console.error('[createChat]', e);
    } finally {
      set({ isLoading: false });
    }
  },

  setChatLastMessage: (message) => {
    const chat = get().chats[message.chat_id ?? ''];
    if (!chat) return;
    set({
      chats: {
        ...get().chats,
        [message.chat_id]: { ...chat, last_message: message },
      },
    });
  },

  setChatInputField: (chatId, inputField) => {
    const chat = get().chats[chatId];
    if (!chat) return;
    set({
      chats: {
        ...get().chats,
        [chatId]: {
          ...chat,
          chatInputField: { ...chat.chatInputField, ...inputField },
        },
      },
    });
  },

  setChatSettings: async (chatId, disappearingMinutes) => {
    if (
      isNaN(disappearingMinutes) ||
      ![0, 1, 5, 30, 60, 1440, 10080].includes(disappearingMinutes)
    )
      return;
    const chat = get().chats[chatId];
    if (!chat) return;
    set({
      chats: {
        ...get().chats,
        [chatId]: { ...chat, disappearing_minutes: disappearingMinutes },
      },
    });
  },

  setTypingInChat: (isTyping) => set({ typingInCurrentChat: isTyping }),

  // ── Cluster state ──────────────────────────────────────────────────────────

  clusters: {},
  selectedClusterId: null,
  selectedTopicId: null,
  typingInCurrentTopic: {},

  getCurrentCluster: () => {
    const clusterId = get().selectedClusterId;
    if (!clusterId) return null;
    return get().clusters[clusterId] ?? null;
  },

  getCurrentTopic: () => {
    const topicId = get().selectedTopicId;
    if (!topicId) return null;
    const cluster = get().getCurrentCluster();
    return cluster?.topics?.find((t) => t._id === topicId) ?? null;
  },

  setSelectedClusterId: (clusterId) =>
    set({
      selectedClusterId: clusterId,
      selectedTopicId: null,
      typingInCurrentTopic: {},
    }),

  setSelectedTopicId: (topicId) =>
    set({ selectedTopicId: topicId, typingInCurrentTopic: {} }),

  fetchClusters: async () => {
    set({ isLoading: true });
    try {
      const responseData = await api.get<{ clusters: Cluster[] }>('/clusters');
      if (!responseData?.clusters) throw responseData;
      set({
        clusters: Object.fromEntries(
          responseData.clusters.map((cluster) => [cluster._id, cluster])
        ),
      });
    } catch (e) {
      console.error('[fetchClusters]', e);
    } finally {
      set({ isLoading: false });
    }
  },

  createCluster: async (name, description) => {
    set({ isLoading: true });
    let clusterId: ID | null = null;
    try {
      const responseData = await api.post<Cluster>('/clusters', {
        body: { name, description },
      });
      if (!responseData?._id) throw responseData;
      set({
        clusters: { ...get().clusters, [responseData._id]: responseData },
        selectedClusterId: responseData._id,
        selectedTab: 'cluster',
      });
      clusterId = responseData._id;
    } catch (e) {
      console.error('[createCluster]', e);
    } finally {
      set({ isLoading: false });
    }
    return clusterId;
  },

  setTopicInputField: (clusterId, topicId, inputField) => {
    const cluster = get().clusters[clusterId];
    if (!cluster?.topics) return;
    set({
      clusters: {
        ...get().clusters,
        [clusterId]: {
          ...cluster,
          topics: cluster.topics.map((t) =>
            t._id === topicId
              ? {
                  ...t,
                  clusterInputField: { ...t.clusterInputField, ...inputField },
                }
              : t
          ),
        },
      },
    });
  },

  setTypingInTopic: (userId, isTyping) =>
    set({
      typingInCurrentTopic: {
        ...get().typingInCurrentTopic,
        [userId]: isTyping,
      },
    }),
  setCurrentTopic: async (params) => {
    const { name, description, disappearingMinutes } = params;
    const { clusters } = get();
    const currentCluster = get().getCurrentCluster();
    const currentTopic = get().getCurrentTopic();
    if (!currentCluster || !currentTopic) return;
    const currentTopics = [...(currentCluster.topics ?? [])];
    const updatedTopicIndex = currentTopics.findIndex(
      (topic) => topic._id === currentTopic._id
    );
    if (updatedTopicIndex === -1) return;

    set({ isLoading: true });
    try {
      const responseData = await api.put<boolean>(
        `/clusters/${currentCluster?._id}/topics/${currentTopic?._id}`,
        {
          body: {
            name,
            description,
            disappearing_minutes: disappearingMinutes,
          },
        }
      );
      if (!responseData) throw responseData;

      const oldTopic = currentTopics[updatedTopicIndex];
      const updatedTopic = {
        ...oldTopic,
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(disappearingMinutes !== undefined
          ? { disappearing_minutes: disappearingMinutes }
          : {}),
      };

      currentTopics[updatedTopicIndex] = updatedTopic;
      set({
        clusters: {
          ...clusters,
          [currentCluster._id]: {
            ...currentCluster,
            topics: [...currentTopics],
          },
        },
      });
    } catch (e) {
      console.error('[conversationStore] setCurrentTopic', e);
    } finally {
      set({ isLoading: false });
    }
  },
  newTopicFromWS: (data) => {
    const { clusterId, topic } = data;
    if (!clusterId || !topic) return;
    const clusters = get().clusters;
    const cluster = clusters[clusterId];
    if (!cluster) return;
    const topics = cluster.topics ?? [];
    set({
      clusters: {
        ...get().clusters,
        [clusterId]: {
          ...cluster,
          topics: [...topics, topic],
        },
      },
    });
  },
  updateTopicFromWS: (params) => {
    const { clusterId, topicId, name, description, disappearingMinutes } =
      params;
    const { clusters } = get();

    if (!clusterId || !topicId) return;

    const cluster = clusters[clusterId];
    if (!cluster) return;
    if (!cluster.topics) return;

    const topicIndex = cluster.topics.findIndex((t) => t._id === topicId);
    if (topicIndex === -1) return;

    const oldTopic = cluster.topics[topicIndex];
    const updatedTopic = {
      ...oldTopic,
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(disappearingMinutes !== undefined
        ? { disappearing_minutes: disappearingMinutes }
        : {}),
    };

    const updatedTopics = [...cluster.topics];
    updatedTopics[topicIndex] = updatedTopic;

    set({
      clusters: {
        ...clusters,
        [clusterId]: {
          ...cluster,
          topics: updatedTopics,
        },
      },
    });
  },

  updateCluster: async (clusterId, name, description) => {
    set({ isLoading: true });
    try {
      await api.put(`/clusters/${clusterId}`, { body: { name, description } });
      const cluster = get().clusters[clusterId];
      if (!cluster) return;
      set({
        clusters: {
          ...get().clusters,
          [clusterId]: { ...cluster, name, description },
        },
      });
    } catch (e) {
      console.error('[updateCluster]', e);
    } finally {
      set({ isLoading: false });
    }
  },

  deleteCluster: async (clusterId) => {
    set({ isLoading: true });
    try {
      await api.delete(`/clusters/${clusterId}`);
      const updated = { ...get().clusters };
      delete updated[clusterId];
      const { selectedClusterId } = get();
      set({
        clusters: updated,
        ...(selectedClusterId === clusterId
          ? { selectedClusterId: null, selectedTopicId: null }
          : {}),
      });
    } catch (e) {
      console.error('[deleteCluster]', e);
    } finally {
      set({ isLoading: false });
    }
  },

  updateTopic: async (clusterId, topicId, params) => {
    const { name, description, disappearingMinutes } = params;
    set({ isLoading: true });
    try {
      await api.put(`/clusters/${clusterId}/topics/${topicId}`, {
        body: {
          name,
          description,
          disappearing_minutes: disappearingMinutes,
        },
      });
      const cluster = get().clusters[clusterId];
      if (!cluster?.topics) return;
      set({
        clusters: {
          ...get().clusters,
          [clusterId]: {
            ...cluster,
            topics: cluster.topics.map((t) =>
              t._id === topicId
                ? {
                    ...t,
                    ...(name !== undefined ? { name } : {}),
                    ...(description !== undefined ? { description } : {}),
                    ...(disappearingMinutes !== undefined
                      ? { disappearing_minutes: disappearingMinutes }
                      : {}),
                  }
                : t
            ),
          },
        },
      });
    } catch (e) {
      console.error('[updateTopic]', e);
    } finally {
      set({ isLoading: false });
    }
  },

  deleteTopic: async (clusterId, topicId) => {
    set({ isLoading: true });
    try {
      await api.delete(`/clusters/${clusterId}/topics/${topicId}`);
      const cluster = get().clusters[clusterId];
      if (!cluster?.topics) return;
      const { selectedTopicId } = get();
      set({
        clusters: {
          ...get().clusters,
          [clusterId]: {
            ...cluster,
            topics: cluster.topics.filter((t) => t._id !== topicId),
          },
        },
        ...(selectedTopicId === topicId ? { selectedTopicId: null } : {}),
      });
    } catch (e) {
      console.error('[deleteTopic]', e);
    } finally {
      set({ isLoading: false });
    }
  },

  removeMember: async (clusterId, memberId) => {
    set({ isLoading: true });
    try {
      await api.delete(`/clusters/${clusterId}/members/${memberId}`);
      const cluster = get().clusters[clusterId];
      if (!cluster) return;
      set({
        clusters: {
          ...get().clusters,
          [clusterId]: {
            ...cluster,
            members: cluster.members?.filter((m) => m._id !== memberId),
            member_details: cluster.member_details?.filter(
              (m) => m._id !== memberId
            ),
          },
        },
      });
    } catch (e) {
      console.error('[removeMember]', e);
    } finally {
      set({ isLoading: false });
    }
  },

  updateClusterFromWS: (clusterId, name, description) => {
    const cluster = get().clusters[clusterId];
    if (!cluster) return;
    set({
      clusters: {
        ...get().clusters,
        [clusterId]: {
          ...cluster,
          name,
          ...(description !== undefined ? { description } : {}),
        },
      },
    });
  },

  deleteClusterFromWS: (clusterId) => {
    const updated = { ...get().clusters };
    delete updated[clusterId];
    const { selectedClusterId } = get();
    set({
      clusters: updated,
      ...(selectedClusterId === clusterId
        ? { selectedClusterId: null, selectedTopicId: null }
        : {}),
    });
  },

  deleteTopicFromWS: (clusterId, topicId) => {
    const cluster = get().clusters[clusterId];
    if (!cluster?.topics) return;
    const { selectedTopicId } = get();
    set({
      clusters: {
        ...get().clusters,
        [clusterId]: {
          ...cluster,
          topics: cluster.topics.filter((t) => t._id !== topicId),
        },
      },
      ...(selectedTopicId === topicId ? { selectedTopicId: null } : {}),
    });
  },

  memberJoinedFromWS: (clusterId, user) => {
    const cluster = get().clusters[clusterId];
    if (!cluster) return;
    const alreadyIn = cluster.member_details?.some((m) => m._id === user._id);
    if (alreadyIn) return;
    set({
      clusters: {
        ...get().clusters,
        [clusterId]: {
          ...cluster,
          members: [...(cluster.members ?? []), user],
          member_details: [...(cluster.member_details ?? []), user],
        },
      },
    });
  },

  memberLeftFromWS: (clusterId, userId) => {
    const cluster = get().clusters[clusterId];
    if (!cluster) return;
    set({
      clusters: {
        ...get().clusters,
        [clusterId]: {
          ...cluster,
          members: cluster.members?.filter((m) => m._id !== userId),
          member_details: cluster.member_details?.filter(
            (m) => m._id !== userId
          ),
        },
      },
    });
  },

  // ── Shared state ───────────────────────────────────────────────────────────

  selectedTab: 'chat' as ChatType,
  isLoading: false,

  setSelectedTab: (tab) => set({ selectedTab: tab }),
  setLoading: (loading) => set({ isLoading: loading }),
}));
