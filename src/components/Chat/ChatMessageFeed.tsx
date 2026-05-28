import { useChatMessages } from "@/hooks/useChatMessages";
import { MessageFeed } from "@/components/Chat/MessageFeed";
import type { Emoji } from "@/types/messageTypes";
import type { ID } from "@/types/utilityTypes";
import { ChatInput } from "@/components/Chat/ChatInput";
import { useEffect } from "react";

interface ChatMessageFeedProps {
    chatId: ID;
    userId: ID;
    onReact: (messageId: ID, emoji: Emoji) => void;
}
export const ChatMessageFeed = ({ chatId, userId, onReact }: ChatMessageFeedProps) => {
    const { messages, fetchMessages, editMessage, sendMessage, deleteMessage, addReaction, removeReaction } = useChatMessages(chatId);

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
            <ChatInput
                onSendMessage={(message, file) => sendMessage(chatId, message)}
                isUploading={false}
                uploadDisabled={true}
                handleTyping={() => null} />
        </>)
}