import { useChatMessages } from '@/hooks/useChatMessages';
import { MessageFeed } from '@/components/Chat/MessageFeed';
import type { AnyMessage, ID } from '@/types/utilityTypes';
import { ChatInput } from '@/components/Chat/ChatInput';
import { useEffect, useMemo, useState } from 'react';
import TypingIndicator from './TypingIndicator';
import { useConversationStore } from '@/stores/conversationStore';
import type { User } from '@/types/userTypes';
import { socketService } from '@/services/SocketService';
import { ChatReplyPreview } from './ChatReplyPreview';
import type { Message } from '@/types/messageTypes';

interface ChatMessageFeedProps {
  chatId: ID;
  userId: ID;
}
export const ChatMessageFeed = ({ chatId, userId }: ChatMessageFeedProps) => {
  const {
    messages,
    fetchMessages,
    editMessage,
    sendMessage,
    sendMessageWithAttachment,
    deleteMessage,
    addReaction,
    removeReaction,
    removeMessageFromWs
  } = useChatMessages(chatId);
  const { typingInCurrentChat, setChatInputField, setChatSettings } =
    useConversationStore();
  const currentChat = useConversationStore((s) => s.getCurrentChat());
  const [inputDisabled, setInputDisabled] = useState(false);
  const chatInputField = currentChat?.chatInputField;
  const { sendTyping } = socketService;

  const typings = useMemo(() => {
    if (!chatId || !typingInCurrentChat) return [];
    const otherUser: User | null = currentChat?.otherUser ?? null;
    return otherUser ? [otherUser.display_name] : [];
  }, [chatId, typingInCurrentChat]);

  const handleBlur = (message: string) =>
    setChatInputField(chatId, { inputMessage: message });

  const handleMessageReply = (message: AnyMessage) =>
    setChatInputField(chatId, { replyToMessage: message as Message });

  const handleChatTimerChange = (disappearingMinutes: number) => {
    if (!chatId || isNaN(disappearingMinutes)) return;
    setChatSettings(chatId, disappearingMinutes);
  };
  const resetChatInputField = () =>
    setChatInputField(chatId, { inputMessage: null, replyToMessage: null });

  const handleSendMessage = async (message: string, file: Blob | null) => {
    setInputDisabled(true);
    try {
      const messageData: any = {
        chatId,
        content: message,
        disappearingMinutes: currentChat?.disappearing_minutes,
        replyToId: chatInputField?.replyToMessage?._id
      };
      if (file) {
        messageData.file = file;
        await sendMessageWithAttachment(messageData);
      } else {
        await sendMessage(messageData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setInputDisabled(false);
    }
    resetChatInputField();
  };

  const handleExpiredMessage = (messageId: ID) => removeMessageFromWs(chatId, messageId)

  useEffect(() => {
    fetchMessages(chatId);
  }, [chatId]); // TODO: use caches...

  return (
    <>
      <MessageFeed
        userId={userId}
        messages={messages}
        isLoading={false}
        onEdit={(messageId: ID, content: string) =>
          editMessage(chatId, messageId, content)
        }
        onDelete={(messageId: ID) => deleteMessage(chatId, messageId)}
        addReaction={addReaction}
        removeReaction={removeReaction}
        onReply={handleMessageReply}
        onMessageExpired={handleExpiredMessage}
      />
      <TypingIndicator users={typings} />
      {chatInputField?.replyToMessage && (
        <ChatReplyPreview
          replyingTo={chatInputField.replyToMessage}
          clearReplyingTo={() =>
            setChatInputField(chatId, { replyToMessage: null })
          }
        />
      )}
      <ChatInput
        key={chatId}
        initialValue={currentChat?.chatInputField?.inputMessage ?? ''}
        chatDisappearingMinutes={currentChat?.disappearing_minutes}
        onBlur={handleBlur}
        onSendMessage={handleSendMessage}
        disabled={inputDisabled}
        handleTyping={(isTyping) => sendTyping(chatId, isTyping)}
        onTimerChange={handleChatTimerChange}
      />
    </>
  );
};
