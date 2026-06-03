import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useConversationStore } from '@/stores/conversationStore';
import { socketService } from '@/services/SocketService';
import { WS_URL } from '@/utils';
import type { Emoji, Message } from '@/types/messageTypes';
import type { ID, Timestamp } from '@/types/utilityTypes';
import { useChatMessageStore } from '@/stores/chatMessageStore';

export const useSocket = () => {
  const { token, user } = useAuthStore();
  const {
    addMessageFromWs,
    updateMessageFromWs,
    updateMessageReactionFromWS,
    removeMessageFromWs,
  } = useChatMessageStore();
  const {
    isSelectedChatId,
    setChatLastMessage,
    setTypingInChat,
    setChatSettings,
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

    /* CLUSTER CODE to be refactored
    const onClusterMessage = (data: ClusterMessage) => {
      useClusterStore.getState().addClusterMessage(data);
    };
    const onClusterMessageEdited = (message: ClusterMessage) => {
      useClusterStore.getState().updateClusterMessageFromWs(message.id, {
        content: message.content,
        edited: true,
      });
    };
    const onClusterMessageDeleted = (data: { id: string }) => {
      useClusterStore.getState().removeClusterMessageFromWs(data.id);
    };
    const onClusterMessageReaction = (data: {
      action: 'add' | 'remove';
      emoji: string;
      message_id: string;
      user_id: string;
    }) => {
      useClusterStore
        .getState()
        .updateClusterMessageReaction(
          data.message_id,
          data.emoji,
          data.user_id,
          data.action
        );
    };
    const onUserJoinedCluster = (data: { cluster_id: string; user: any }) => {
      const { currentCluster, fetchClusterDetails } =
        useClusterStore.getState();
      if (currentCluster?.id === data.cluster_id)
        fetchClusterDetails(data.cluster_id);
    };
    const onUserLeftCluster = (data: {
      cluster_id: string;
      user_id: string;
    }) => {
      const { currentCluster, fetchClusterDetails } =
        useClusterStore.getState();
      if (currentCluster?.id === data.cluster_id)
        fetchClusterDetails(data.cluster_id);
    };
*/
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

    /*
    socket.on('cluster_message', onClusterMessage);
    socket.on('cluster_message_edited', onClusterMessageEdited);
    socket.on('cluster_message_deleted', onClusterMessageDeleted);
    socket.on('cluster_message_reaction', onClusterMessageReaction);
    socket.on('user_joined_cluster', onUserJoinedCluster);
    socket.on('user_left_cluster', onUserLeftCluster);
    */

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
      /*
      socket.off('cluster_message', onClusterMessage);
      socket.off('cluster_message_edited', onClusterMessageEdited);
      socket.off('cluster_message_deleted', onClusterMessageDeleted);
      socket.off('cluster_message_reaction', onClusterMessageReaction);
      socket.off('user_joined_cluster', onUserJoinedCluster);
      socket.off('user_left_cluster', onUserLeftCluster);
*/
    };
  }, [token, user?._id]);
};
