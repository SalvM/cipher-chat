import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/services/Api';
import type { ID } from '@/types/utilityTypes';
import type { Chat, ChatInputField } from '@/types/chatTypes';
import type { Cluster, ClusterMessage, Topic } from '@/types/clusterTypes';
import type { Message } from '@/types/messageTypes';
import type { User } from '@/types/userTypes';
import type { Status } from '@/types/utilityTypes';
import type { AuthResponse } from '@/types/authTypes';

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const queryKeys = {
  auth: {
    all: ['auth'] as const,
    me: () => [...queryKeys.auth.all, 'me'] as const,
  },
  chats: {
    all: ['chats'] as const,
    list: () => [...queryKeys.chats.all, 'list'] as const,
    detail: (chatId: ID) => [...queryKeys.chats.all, chatId] as const,
    messages: (chatId: ID) =>
      [...queryKeys.chats.detail(chatId), 'messages'] as const,
  },
  clusters: {
    all: ['clusters'] as const,
    list: () => [...queryKeys.clusters.all, 'list'] as const,
    detail: (clusterId: ID) => [...queryKeys.clusters.all, clusterId] as const,
    topics: (clusterId: ID) =>
      [...queryKeys.clusters.detail(clusterId), 'topics'] as const,
    topic: (clusterId: ID, topicId: ID) =>
      [...queryKeys.clusters.topics(clusterId), topicId] as const,
    messages: (clusterId: ID, topicId: ID) =>
      [...queryKeys.clusters.topic(clusterId, topicId), 'messages'] as const,
  },
  users: {
    all: ['users'] as const,
    search: (query: string) =>
      [...queryKeys.users.all, 'search', query] as const,
  },
} as const;

// ─── Auth Hooks ──────────────────────────────────────────────────────────────

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      const res = await api.post<AuthResponse>('/auth/login', {
        body: { username: data.username, password: data.password },
      });
      if (!res) throw new Error('Login failed');
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      username: string;
      password: string;
      displayName: string;
    }) => {
      const res = await api.post<AuthResponse>('/auth/register', {
        body: {
          username: data.username,
          password: data.password,
          displayName: data.displayName,
        },
      });
      if (!res) throw new Error('Registration failed');
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
    },
  });
}

export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: async () => {
      const res = await api.get<User>('/auth/me');
      if (!res) throw new Error('Failed to fetch current user');
      return res;
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const res = await api.put<User>('/auth/profile', { body: data });
      if (!res) throw new Error('Failed to update profile');
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
    },
  });
}

export function useUpdateStatus() {
  return useMutation({
    mutationFn: async (status: Status) => {
      return api.put('/auth/status', { body: { status } });
    },
  });
}

// ─── Chat Hooks ──────────────────────────────────────────────────────────────

export function useChatsQuery() {
  return useQuery({
    queryKey: queryKeys.chats.list(),
    queryFn: async () => {
      const res = await api.get<{ chats: Chat[] }>('/chats');
      if (!res?.chats) throw new Error('Failed to fetch chats');
      return res.chats;
    },
  });
}

export function useChatQuery(chatId: ID | null) {
  return useQuery({
    queryKey: queryKeys.chats.detail(chatId ?? ''),
    enabled: !!chatId,
    queryFn: async () => {
      const res = await api.get<Chat>(`/chats/${chatId}`);
      if (!res?._id) throw new Error('Failed to fetch chat');
      return res;
    },
  });
}

export function useCreateChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: ID) => {
      const res = await api.post<Chat>('/chats', {
        body: { recipient_id: userId },
      });
      if (!res?._id) throw new Error('Failed to create chat');
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chats.list() });
    },
  });
}

export function useChatMessagesQuery(chatId: ID) {
  return useQuery({
    queryKey: queryKeys.chats.messages(chatId),
    queryFn: async () => {
      const res = await api.get<{ messages: Message[] }>(
        `/chats/${chatId}/messages`
      );
      if (!res?.messages) throw new Error('Failed to fetch chat messages');
      return res.messages;
    },
  });
}

export function useSendChatMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      chatId: ID;
      body: string;
      disappearing_minutes: number;
    }) => {
      const res = await api.post<Message>('/messages', {
        body: {
          chat_id: data.chatId,
          body: data.body,
          disappearing_minutes: data.disappearing_minutes,
        },
      });
      if (!res?._id) throw new Error('Failed to send message');
      return res;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chats.messages(data.chat_id as ID),
      });
    },
  });
}

export function useSendChatMessageWithAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      chatId: ID;
      body: string;
      file: File;
      disappearing_minutes: number;
    }) => {
      const formData = new FormData();
      formData.append('chat_id', data.chatId);
      formData.append('body', data.body);
      formData.append('file', data.file);
      formData.append(
        'disappearing_minutes',
        String(data.disappearing_minutes)
      );

      const res = await api.post<Message>('/messages/with-attachment', {
        body: formData,
      });
      if (!res?._id) throw new Error('Failed to send message with attachment');
      return res;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chats.messages(data.chat_id as ID),
      });
    },
  });
}

export function useEditChatMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { messageId: ID; body: string }) => {
      const res = await api.put<Message>(`/messages/${data.messageId}`, {
        body: { body: data.body },
      });
      if (!res?._id) throw new Error('Failed to edit message');
      return res;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chats.messages(data.chat_id as ID),
      });
    },
  });
}

export function useDeleteChatMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: ID) => {
      return api.delete(`/messages/${messageId}`);
    },
    onSuccess: (_data, messageId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chats.all });
    },
  });
}

export function useAddChatReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { messageId: ID; emoji: string; chatId: ID }) => {
      return api.post(`/messages/${data.messageId}/reactions`, {
        body: { emoji: data.emoji },
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chats.messages(variables.chatId),
      });
    },
  });
}

export function useRemoveChatReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { messageId: ID; emoji: string; chatId: ID }) => {
      return api.delete(
        `/messages/${data.messageId}/reactions/${encodeURIComponent(data.emoji)}`
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chats.messages(variables.chatId),
      });
    },
  });
}

// ─── Cluster Hooks ───────────────────────────────────────────────────────────

export function useClustersQuery() {
  return useQuery({
    queryKey: queryKeys.clusters.list(),
    queryFn: async () => {
      const res = await api.get<{ clusters: Cluster[] }>('/clusters');
      if (!res?.clusters) throw new Error('Failed to fetch clusters');
      return res.clusters;
    },
  });
}

export function useCreateCluster() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const res = await api.post<Cluster>('/clusters', {
        body: { name: data.name, description: data.description },
      });
      if (!res?._id) throw new Error('Failed to create cluster');
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clusters.list() });
    },
  });
}

export function useCreateTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      clusterId: ID;
      name: string;
      description?: string;
      disappearing_minutes?: number;
    }) => {
      const res = await api.post<Topic>(`/clusters/${data.clusterId}/topics`, {
        body: {
          name: data.name,
          description: data.description,
          disappearing_minutes: data.disappearing_minutes,
        },
      });
      if (!res?._id) throw new Error('Failed to create topic');
      return res;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.clusters.topics(variables.clusterId),
      });
    },
  });
}

export function useUpdateTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      clusterId: ID;
      topicId: ID;
      name?: string;
      description?: string;
      disappearingMinutes?: number;
    }) => {
      const body: Record<string, any> = {};
      if (data.name !== undefined) body.name = data.name;
      if (data.description !== undefined) body.description = data.description;
      if (data.disappearingMinutes !== undefined)
        body.disappearing_minutes = data.disappearingMinutes;

      return api.put(`/clusters/${data.clusterId}/topics/${data.topicId}`, {
        body,
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.clusters.topic(
          variables.clusterId,
          variables.topicId
        ),
      });
    },
  });
}

export function useClusterMessagesQuery(clusterId: ID, topicId: ID | null) {
  return useQuery({
    queryKey: queryKeys.clusters.messages(clusterId, topicId ?? 'unknown'),
    enabled: topicId !== null,
    queryFn: async () => {
      if (!topicId) throw new Error('Topic ID is required');
      const res = await api.get<{ messages: Message[] }>(
        `/clusters/${clusterId}/topics/${topicId}/messages`
      );
      if (!res?.messages) throw new Error('Failed to fetch cluster messages');
      return res.messages;
    },
  });
}

export function useSendClusterMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      clusterId: ID;
      topicId: ID;
      body: string;
      disappearing_minutes: number;
    }) => {
      const res = await api.post<ClusterMessage>('/clusterMessages', {
        body: {
          cluster_id: data.clusterId,
          topic_id: data.topicId,
          body: data.body,
          disappearing_minutes: data.disappearing_minutes,
        },
      });
      if (!res?._id) throw new Error('Failed to send cluster message');
      return res;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.clusters.messages(
          data.cluster_id as ID,
          data.topic_id as ID
        ),
      });
    },
  });
}

export function useSendClusterMessageWithAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      clusterId: ID;
      topicId: ID;
      body: string;
      file: File;
      disappearing_minutes: number;
    }) => {
      const formData = new FormData();
      formData.append('cluster_id', data.clusterId);
      formData.append('topic_id', data.topicId);
      formData.append('body', data.body);
      formData.append('file', data.file);
      formData.append(
        'disappearing_minutes',
        String(data.disappearing_minutes)
      );

      const res = await api.post<ClusterMessage>(
        '/clusterMessages/with-attachment',
        {
          body: formData,
        }
      );
      if (!res?._id)
        throw new Error('Failed to send cluster message with attachment');
      return res;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.clusters.messages(
          data.cluster_id as ID,
          data.topic_id as ID
        ),
      });
    },
  });
}

export function useEditClusterMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      messageId: ID;
      body: string;
      clusterId: ID;
      topicId: ID;
    }) => {
      const res = await api.put<Message>(`/clusterMessages/${data.messageId}`, {
        body: { body: data.body },
      });
      if (!res?._id) throw new Error('Failed to edit cluster message');
      return res;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.clusters.messages(
          variables.clusterId,
          variables.topicId
        ),
      });
    },
  });
}

export function useDeleteClusterMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: ID) => {
      return api.delete(`/clusterMessages/${messageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clusters.all });
    },
  });
}

export function useAddClusterReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      messageId: ID;
      emoji: string;
      clusterId: ID;
      topicId: ID;
    }) => {
      return api.post(`/clusterMessages/${data.messageId}/reactions`, {
        body: { emoji: data.emoji },
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.clusters.messages(
          variables.clusterId,
          variables.topicId
        ),
      });
    },
  });
}

export function useRemoveClusterReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      messageId: ID;
      emoji: string;
      clusterId: ID;
      topicId: ID;
    }) => {
      return api.delete(
        `/clusterMessages/${data.messageId}/reactions/${encodeURIComponent(data.emoji)}`
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.clusters.messages(
          variables.clusterId,
          variables.topicId
        ),
      });
    },
  });
}

// ─── User Hooks ──────────────────────────────────────────────────────────────

export function useSearchUsers(query: string, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.users.search(query),
    enabled: enabled && query.length > 3,
    queryFn: async () => {
      const res = await api.get<{ users: User[] }>(
        `/users/search?q=${encodeURIComponent(query)}`
      );
      if (!res?.users) throw new Error('Failed to search users');
      return res.users;
    },
  });
}

// ─── Invitation Hooks ────────────────────────────────────────────────────────

export function useCreateInvitation() {
  return useMutation({
    mutationFn: async (data: { clusterId: ID; expireHours: number }) => {
      const res = await api.post<{ invitationId: string }>('/invitations/', {
        body: { clusterId: data.clusterId, expireHours: data.expireHours },
      });
      if (!res?.invitationId) throw new Error('Failed to create invitation');
      return res;
    },
  });
}

export function useJoinCluster() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      return api.get(`/invitations/${invitationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clusters.list() });
    },
  });
}
