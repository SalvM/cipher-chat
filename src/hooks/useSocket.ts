import { useEffect } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { useConversationStore } from '@/stores/conversationStore';
import { socketService } from '@/services/SocketService';
import { WS_URL } from '@/utils';
import type { Emoji, Message } from '@/types/messageTypes';
import type { ID, Timestamp } from '@/types/utilityTypes';
import { useChatMessageStore } from '@/stores/chatMessageStore';
import { useClusterMessageStore } from '@/stores/clusterMessageStore';
import type { ClusterMessage, Topic } from '@/types/clusterTypes';
import type { User } from '@/types/userTypes';

export const useSocket = () => {
  const { token, user } = useAuthStore();
  const {
    addMessageFromWs,
    updateMessageFromWs,
    updateMessageReactionFromWS,
    removeMessageFromWs,
  } = useChatMessageStore();

  const {
    addMessageFromWs: addClusterMessageFromWs,
    updateMessageFromWs: updateClusterMessageFromWs,
    updateMessageReactionFromWS: updateClusterMessageReactionFromWS,
    removeMessageFromWs: removeClusterMessageFromWs,
  } = useClusterMessageStore();

  const {
    isSelectedChatId,
    setChatLastMessage,
    setTypingInChat,
    setChatSettings,
    newTopicFromWS,
    updateTopicFromWS,
    updateClusterFromWS,
    deleteClusterFromWS,
    deleteTopicFromWS,
    memberJoinedFromWS,
    memberLeftFromWS,
    setTypingInTopic,
  } = useConversationStore();

  useEffect(() => {
    if (!token || !user?._id) return;

    const socket = socketService.connect(WS_URL, token);

    // Listener handlers
    const onConnect = () => console.info('Socket connected');
    const onDisconnect = () => console.info('Socket disconnected');

    // Private chats
    const onNewMessage = (message: Message) => {
      addMessageFromWs(message);
      setChatLastMessage(message); // Update last message for chat
    };
    const onMessageEdited = (data: {
      chat_id: ID;
      message_id: ID;
      content: Partial<Message>;
      edited_at: Timestamp;
    }) =>
      updateMessageFromWs({
        chatId: data.chat_id,
        messageId: data.message_id,
        updates: data.content,
        edited_at: data.edited_at,
      });
    const onMessageDeleted = (data: { chat_id: ID; message_id: ID }) =>
      removeMessageFromWs(data.chat_id, data.message_id);
    const onMessageReaction = (data: {
      action: 'add' | 'remove';
      emoji: Emoji;
      chat_id: ID;
      message_id: ID;
      user_id: ID;
    }) => {
      updateMessageReactionFromWS({
        chatId: data.chat_id,
        messageId: data.message_id,
        emoji: data.emoji,
        userId: data.user_id,
        action: data.action,
      });
    };
    const onUserTyping = (data: { chat_id: string; is_typing: boolean }) => {
      if (!isSelectedChatId(data.chat_id)) return;
      setTypingInChat(data.is_typing);
    };
    const onChatSettingsUpdated = (data: {
      chat_id: string;
      updated_by: string;
      settings: { disappearing_minutes: number };
    }) => {
      if (!isSelectedChatId(data.chat_id)) return;
      setChatSettings(data.chat_id, data.settings.disappearing_minutes);
    };

    // Cluster handlers
    const onClusterMessage = (data: {
      cluster_id: ID;
      topic_id: ID;
      message: ClusterMessage;
    }) => {
      addClusterMessageFromWs({
        clusterId: data.cluster_id,
        topicId: data.topic_id,
        message: data.message,
      });
    };
    const onClusterMessageEdited = (data: {
      cluster_id: ID;
      topic_id: ID;
      message_id: ID;
      content: Partial<ClusterMessage>;
      edited_at: Timestamp;
    }) => {
      updateClusterMessageFromWs({
        clusterId: data.cluster_id,
        topicId: data.topic_id,
        messageId: data.message_id,
        updates: data.content,
        edited_at: data.edited_at,
      });
    };
    const onClusterMessageDeleted = (data: {
      message_id: ID;
      topic_id: ID;
      cluster_id: ID;
    }) => {
      removeClusterMessageFromWs({
        clusterId: data.cluster_id,
        topicId: data.topic_id,
        messageId: data.message_id,
      });
    };
    const onClusterMessageReaction = (data: {
      action: 'add' | 'remove';
      emoji: Emoji;
      cluster_id: ID;
      topic_id: ID;
      message_id: string;
      user_id: string;
    }) => {
      updateClusterMessageReactionFromWS({
        clusterId: data.cluster_id,
        topicId: data.topic_id,
        messageId: data.message_id,
        emoji: data.emoji,
        userId: data.user_id,
        action: data.action,
      });
    };
    const onNewTopic = (data: { cluster_id: ID; topic: Topic }) => {
      newTopicFromWS({ clusterId: data.cluster_id, topic: data.topic });
    };
    const onTopicSettingsUpdated = (data: { cluster_id: ID; topic: Topic }) => {
      updateTopicFromWS({
        clusterId: data.cluster_id,
        topicId: data.topic._id,
        name: data.topic.name,
        description: data.topic.description,
        disappearingMinutes: data.topic.disappearing_minutes,
      });
    };
    const onClusterSettingsUpdated = (data: {
      cluster_id: ID;
      name: string;
      description?: string;
    }) => {
      updateClusterFromWS(data.cluster_id, data.name, data.description);
    };
    const onClusterDeleted = (data: { cluster_id: ID }) => {
      deleteClusterFromWS(data.cluster_id);
    };
    const onTopicDeleted = (data: { cluster_id: ID; topic_id: ID }) => {
      deleteTopicFromWS(data.cluster_id, data.topic_id);
    };
    const onUserJoinedCluster = (data: { cluster_id: ID; user: User }) => {
      memberJoinedFromWS(data.cluster_id, data.user);
    };
    const onUserLeftCluster = (data: { cluster_id: ID; user_id: ID }) => {
      memberLeftFromWS(data.cluster_id, data.user_id);
    };
    const onTopicTyping = (data: {
      cluster_id: ID;
      topic_id: ID;
      user_id: ID;
      is_typing: boolean;
    }) => {
      const { selectedClusterId, selectedTopicId } =
        useConversationStore.getState();
      if (
        data.cluster_id !== selectedClusterId ||
        data.topic_id !== selectedTopicId
      )
        return;
      setTypingInTopic(data.user_id, data.is_typing);
    };
    const onMemberRemoved = (data: { cluster_id: ID; user_id: ID }) => {
      if (data.user_id === user?._id) {
        const clusterName =
          useConversationStore.getState().clusters[data.cluster_id]?.name ??
          'a cluster';
        deleteClusterFromWS(data.cluster_id);
        toast.error(`You were removed from "${clusterName}"`);
      } else {
        memberLeftFromWS(data.cluster_id, data.user_id);
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    //socket.on('user_status', onUserStatus);
    //socket.on('user_presence', onUserStatus);

    socket.on('new_message', onNewMessage);
    socket.on('message_edited', onMessageEdited);
    socket.on('message_deleted', onMessageDeleted);
    socket.on('message_reaction', onMessageReaction);
    socket.on('user_typing', onUserTyping);
    socket.on('chat_settings_updated', onChatSettingsUpdated);

    socket.on('cluster_message', onClusterMessage);
    socket.on('cluster_message_edited', onClusterMessageEdited);
    socket.on('cluster_message_deleted', onClusterMessageDeleted);
    socket.on('cluster_message_reaction', onClusterMessageReaction);
    socket.on('topic_typing', onTopicTyping);
    socket.on('cluster_settings_updated', onClusterSettingsUpdated);
    socket.on('cluster_deleted', onClusterDeleted);
    socket.on('new_topic', onNewTopic);
    socket.on('topic_settings_updated', onTopicSettingsUpdated);
    socket.on('topic_deleted', onTopicDeleted);
    socket.on('user_joined_cluster', onUserJoinedCluster);
    socket.on('user_left_cluster', onUserLeftCluster);
    socket.on('member_removed', onMemberRemoved);

    console.info('[useSocket] ready to skyrocket!');

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      //socket.off('user_status', onUserStatus);
      //socket.off('user_presence', onUserStatus);

      socket.off('new_message', onNewMessage);
      socket.off('message_edited', onMessageEdited);
      socket.off('message_deleted', onMessageDeleted);
      socket.off('message_reaction', onMessageReaction);
      socket.off('user_typing', onUserTyping);
      socket.off('chat_settings_updated', onChatSettingsUpdated);
      socket.off('cluster_message', onClusterMessage);
      socket.off('cluster_message_edited', onClusterMessageEdited);
      socket.off('cluster_message_deleted', onClusterMessageDeleted);
      socket.off('cluster_message_reaction', onClusterMessageReaction);
      socket.off('topic_typing', onTopicTyping);
      socket.off('cluster_settings_updated', onClusterSettingsUpdated);
      socket.off('cluster_deleted', onClusterDeleted);
      socket.off('new_topic', onNewTopic);
      socket.off('topic_settings_updated', onTopicSettingsUpdated);
      socket.off('topic_deleted', onTopicDeleted);
      socket.off('user_joined_cluster', onUserJoinedCluster);
      socket.off('user_left_cluster', onUserLeftCluster);
      socket.off('member_removed', onMemberRemoved);
    };
  }, [token, user?._id]);
};
