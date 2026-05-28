import api from '@/services/Api';
import type { Chat } from '@/types/chatTypes';
import type { Cluster } from '@/types/clusterTypes';
import type { ChatType } from '@/types/utilityTypes';
import { create } from 'zustand';

interface ConversationStore {
  chats: Record<string, Chat>;
  clusters: Record<string, Cluster>;
  selectedChatId: string | null;
  selectedClusterId: string | null;
  selectedTab: ChatType;
  isLoading: boolean;
}

interface ConversationStoreActions {
  getCurrentChat: () => Chat | null;
  getCurrentCluster: () => Cluster | null;
  setSelectedTab: (chatType: ChatType) => void;
  setSelectedChatId: (chatId: string | null) => void;
  setSelectedClusterId: (clusterId: string | null) => void;
  fetchChats: () => void;
  fetchClusters: () => void;
  createChat: (userId: string) => void;
}

export const useConversationStore = create<
  ConversationStore & ConversationStoreActions
>((set, get) => ({
  chats: {},
  clusters: {},
  selectedChatId: null,
  selectedClusterId: null,
  selectedTab: 'chat' as ChatType,
  isLoading: false,

  getCurrentChat: () => {
    const chatId = get().selectedChatId;
    if (!chatId) return null;
    return get().chats[chatId];
  },
  getCurrentCluster: () => {
    const clusterId = get().selectedClusterId;
    if (!clusterId) return null;
    return get().clusters[clusterId];
  },
  setSelectedChatId: (chatId: string | null) =>
    set({
      selectedChatId: chatId,
    }),
  setSelectedClusterId: (clusterId: string | null) =>
    set({
      selectedClusterId: clusterId,
    }),
  setSelectedTab: (tab: ChatType) => set({ selectedTab: tab }),

  fetchChats: async () => {
    set({ isLoading: true });
    try {
      const responseData = await api.get<{ chats: Chat[] }>('/chats');
      if (!responseData?.chats) throw responseData;
      const chats = Object.fromEntries(
        responseData.chats.map((chat) => [chat._id, chat])
      );
      set({ chats });
    } catch (e) {
      console.error('[fetchChats]', e);
    } finally {
      set({ isLoading: false });
    }
  },
  fetchClusters: async () => {
    set({ isLoading: true });
    try {
      const responseData = await api.get<{ clusters: Cluster[] }>('/clusters');
      if (!responseData?.clusters) throw responseData;
      const clusters = Object.fromEntries(
        responseData.clusters.map((cluster) => [cluster._id, cluster])
      );
      set({ clusters });
    } catch (e) {
      console.error('[fetchClusters]', e);
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
      if (!responseData || !responseData._id) throw responseData;
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
}));
