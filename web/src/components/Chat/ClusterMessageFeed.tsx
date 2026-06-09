import { useClusterMessages } from '@/hooks/useClusterMessages';
import { MessageFeed } from '@/components/Chat/MessageFeed';
import type { AnyMessage, ID } from '@/types/utilityTypes';
import { ChatInput } from '@/components/Chat/ChatInput';
import { useEffect, useMemo, useState } from 'react';
import TypingIndicator from '@/components/Chat/TypingIndicator';
import { useConversationStore } from '@/stores/conversationStore';
import type { User } from '@/types/userTypes';
import { socketService } from '@/services/SocketService';
import { ChatReplyPreview } from '@/components/Chat/ChatReplyPreview';
import type { ClusterMessage } from '@/types/clusterTypes';

interface ClusterMessageFeedProps {
  clusterId: ID;
  topicId: ID;
  userId: ID;
}

export const ClusterMessageFeed = ({
  clusterId,
  topicId,
  userId,
}: ClusterMessageFeedProps) => {
  const {
    messages,
    fetchMessages,
    editMessage,
    sendMessage,
    sendMessageWithAttachment,
    deleteMessage,
    addReaction,
    removeReaction,
    removeMessageFromWs,
  } = useClusterMessages(clusterId, topicId);

  const { typingInCurrentTopic, setTopicInputField } = useConversationStore();

  const currentCluster = useConversationStore((s) => s.getCurrentCluster());
  const currentTopic = useConversationStore((s) => s.getCurrentTopic());

  const [inputDisabled, setInputDisabled] = useState(false);

  const topicInputField = currentTopic?.clusterInputField;
  const { clusterTyping } = socketService;

  const typingUsers = useMemo<string[]>(() => {
    if (!typingInCurrentTopic || !currentCluster?.member_details) return [];
    return currentCluster.member_details
      .filter(
        (member: User) =>
          member._id !== userId && typingInCurrentTopic[member._id]
      )
      .map((member: User) => member.display_name);
  }, [typingInCurrentTopic, currentCluster?.member_details, userId]);

  const handleBlur = (message: string) =>
    setTopicInputField(clusterId, topicId, { inputMessage: message });

  const handleMessageReply = (message: AnyMessage) =>
    setTopicInputField(clusterId, topicId, {
      replyToMessage: message as ClusterMessage,
    });

  const resetTopicInputField = () =>
    setTopicInputField(clusterId, topicId, {
      inputMessage: null,
      replyToMessage: null,
    });

  const handleSendMessage = async (message: string, file: Blob | null) => {
    setInputDisabled(true);
    try {
      if (file) {
        await sendMessageWithAttachment({
          clusterId,
          topicId,
          content: message,
          file,
          replyToId: topicInputField?.replyToMessage?._id,
        });
      } else {
        await sendMessage({
          clusterId,
          topicId,
          content: message,
          replyToId: topicInputField?.replyToMessage?._id,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setInputDisabled(false);
    }
    resetTopicInputField();
  };

  const handleExpiredMessage = (messageId: ID) =>
    removeMessageFromWs({ clusterId, topicId, messageId });

  useEffect(() => {
    if (!clusterId || !topicId) return;
    fetchMessages(clusterId, topicId);
  }, [clusterId, topicId]); // TODO: use caches...

  return (
    <>
      <MessageFeed
        userId={userId}
        messages={messages}
        isLoading={false}
        onEdit={(messageId: ID, content: string) =>
          editMessage(clusterId, topicId, messageId, content)
        }
        onDelete={(messageId: ID) =>
          deleteMessage(clusterId, topicId, messageId)
        }
        addReaction={addReaction}
        removeReaction={removeReaction}
        onReply={handleMessageReply}
        onMessageExpired={handleExpiredMessage}
      />
      <TypingIndicator users={typingUsers} />
      {topicInputField?.replyToMessage && (
        <ChatReplyPreview
          replyingTo={topicInputField.replyToMessage}
          clearReplyingTo={() =>
            setTopicInputField(clusterId, topicId, { replyToMessage: null })
          }
        />
      )}
      <ChatInput
        key={topicId}
        initialValue={topicInputField?.inputMessage ?? ''}
        chatDisappearingMinutes={currentTopic?.disappearing_minutes}
        onBlur={handleBlur}
        onSendMessage={handleSendMessage}
        disabled={inputDisabled}
        handleTyping={(isTyping) => clusterTyping(clusterId, topicId, isTyping)}
      />
    </>
  );
};
