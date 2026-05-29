import { useChatMessages } from "@/hooks/useChatMessages";
import { MessageFeed } from "@/components/Chat/MessageFeed";
import type { Emoji } from "@/types/messageTypes";
import type { ID } from "@/types/utilityTypes";
import { ChatInput } from "@/components/Chat/ChatInput";
import { useEffect, useMemo } from "react";
import TypingIndicator from "./TypingIndicator";
import { useConversationStore } from "@/stores/conversationStore";
import type { User } from "@/types/userTypes";
import { socketService } from "@/services/SocketService";

interface ChatMessageFeedProps {
    chatId: ID;
    userId: ID;
    onReact: (messageId: ID, emoji: Emoji) => void;
}
export const ChatMessageFeed = ({ chatId, userId, onReact }: ChatMessageFeedProps) => {
    const { messages, fetchMessages, editMessage, sendMessage, sendMessageWithAttachment, deleteMessage, addReaction, removeReaction } = useChatMessages(chatId);
    const { typingInCurrentChat, getCurrentChat } = useConversationStore();
    const { sendTyping } = socketService

    const handleSendMessage = (message: string, file: Blob | null) => {
        if (file) {
            sendMessageWithAttachment(chatId, message, file)
        } else {
            sendMessage(chatId, message)
        }
    }

    const typings = useMemo(() => {
        if (typingInCurrentChat) {
            const otherUser: User | null = getCurrentChat()?.otherUser ?? null
            if (otherUser) {
                return [otherUser.display_name]
            }
        }
        return [];
    }, [getCurrentChat, typingInCurrentChat])

    useEffect(() => {
        fetchMessages(chatId)
    }, []) // TODO: use caches...

    return (
        <>
            <MessageFeed
                userId={userId}
                messages={messages}
                isLoading={false}
                onEdit={(messageId: ID, content: string) => editMessage(chatId, messageId, content)}
                onDelete={(messageId: ID) => deleteMessage(chatId, messageId)}
                onReact={onReact}
                addReaction={addReaction}
                removeReaction={removeReaction}
            />
            <TypingIndicator users={typings} />
            <ChatInput
                onSendMessage={handleSendMessage}
                isUploading={false}
                uploadDisabled={true}
                handleTyping={(isTyping) => sendTyping(chatId, isTyping)} />
        </>)
}