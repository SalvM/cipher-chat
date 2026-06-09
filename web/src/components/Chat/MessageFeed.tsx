import MessageBubble from "@/components/Chat/MessageBubble"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Emoji } from "@/types/messageTypes"
import type { AnyMessage, ID } from "@/types/utilityTypes"
import { useEffect, useRef } from "react"

interface MessageFeedProps {
    userId: ID;
    messages: AnyMessage[];
    isLoading: boolean;
    onEdit: (messageId: ID, content: string) => void;
    onDelete: (messageId: ID) => void;
    addReaction: (messageId: ID, emoji: Emoji) => void;
    removeReaction: (messageId: ID, emoji: Emoji) => void;
    onMessageExpired: (messageId: ID) => void;
    onReply?: (message: AnyMessage) => void;
}
export const MessageFeed = ({ userId, messages, isLoading, onEdit, onDelete, addReaction, removeReaction, onReply, onMessageExpired }: MessageFeedProps) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    if (isLoading) return (
        <div className="flex flex-1 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
    );

    const handleReact = (messageId: ID, emoji: Emoji, action: 'add' | 'remove') => {
        if (action === 'add') {
            addReaction(messageId, emoji);
        } else {
            removeReaction(messageId, emoji);
        }
    };
    const shouldShowAvatar = (index: number) => {
        return index === 0 || messages[index - 1].sender_id !== messages[index].sender_id;
    };

    return (
        <>
            <ScrollArea className="flex-1 p-6 scroll-auto overflow-y-auto scroll-y-auto">
                <div className="max-w-3xl mx-auto flex flex-col ">
                    {messages?.map((message, index) => (
                        <MessageBubble
                            key={message._id}
                            message={message}
                            isOwn={message.sender_id === userId}
                            showAvatar={shouldShowAvatar(index)}
                            onEdit={(messageId: ID, content: string) => onEdit(messageId, content)}
                            onDelete={(messageId: ID) => onDelete(messageId)}
                            onReply={onReply}
                            onReact={handleReact}
                            currentUserId={userId}
                            onExpire={onMessageExpired}
                        />
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>
        </>
    )
}