import api from '@/services/Api';
import type { Chat, ChatInputField } from '@/types/chatTypes';
import type { Cluster } from '@/types/clusterTypes';
import type { Message } from '@/types/messageTypes';
import type { ChatType, ID } from '@/types/utilityTypes';
import { create } from 'zustand';

interface ConversationStore {
  chats: Record<string, Chat>;
  clusters: Record<string, Cluster>;
  selectedChatId: string | null;
  selectedClusterId: string | null;
  selectedTab: ChatType;
  typingInCurrentChat: boolean; // true if otherUser is typing
  typingInCurrentTopic: Record<ID, boolean>; // [userId]: true/false
  isLoading: boolean;
}

interface ConversationStoreActions {
  getCurrentChat: () => Chat | null;
  getCurrentCluster: () => Cluster | null;
  setSelectedTab: (chatType: ChatType) => void;
  setSelectedChatId: (chatId: string | null) => void;
  setSelectedClusterId: (clusterId: string | null) => void;
  isSelectedChatId: (chatId: ID) => boolean;
  fetchChats: () => void;
  fetchClusters: () => void;
  createChat: (userId: string) => void;
  setChatLastMessage: (message: Message) => void;
  setChatInputField: (chatId: ID, chatInputField: ChatInputField) => void;
  setLoading: (loading: boolean) => void;
  setTypingInChat: (isTyping: boolean) => void;
}

export const useConversationStore = create<
  ConversationStore & ConversationStoreActions
>((set, get) => ({
  chats: {},
  clusters: {},
  selectedChatId: null,
  selectedClusterId: null,
  selectedTab: 'chat' as ChatType,
  typingInCurrentChat: false,
  typingInCurrentTopic: {},
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
  getCurrenctConversation: () => {
    switch (get().selectedTab) {
      case 'chat':
        return get().getCurrentChat();
      case 'cluster':
        return get().getCurrentCluster();
      default:
        return [];
    }
  },
  setSelectedChatId: (chatId: string | null) =>
    set({
      selectedChatId: chatId,
      typingInCurrentChat: false,
    }),
  setSelectedClusterId: (clusterId: string | null) =>
    set({
      selectedClusterId: clusterId,
    }),
  setSelectedTab: (tab: ChatType) => set({ selectedTab: tab }),
  isSelectedChatId: (chatId: ID) => {
    return get().selectedChatId === chatId;
  },
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

  setChatLastMessage: (message) => {
    const chat = get().chats[message.chat_id ?? ''];
    if (!chat) return;
    set({
      chats: {
        ...get().chats,
        [message.chat_id]: {
          ...chat,
          last_message: message,
        },
      },
    });
  },

  setChatInputField: (chatId: ID, chatInputField: ChatInputField) => {
    const chat = get().chats[chatId];
    if (!chat) return;
    set({
      chats: {
        ...get().chats,
        [chatId]: {
          ...chat,
          chatInputField: {
            ...chat.chatInputField,
            ...chatInputField,
          },
        },
      },
    });
  },

  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setTypingInChat: (isTyping: boolean) =>
    set({ typingInCurrentChat: isTyping }),
}));
