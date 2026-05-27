import MessageBubble from "@/components/Chat/MessageBubble"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Message } from "@/types/messageTypes"
import type { ID, ReactionAction } from "@/types/utilityTypes"
import { useEffect, useRef } from "react"

interface MessageFeedProps {
    userId: ID;
    messages: Message[];
    editMessage?: () => void;
    deleteMessage?: () => void;
    setReplyingTo?: () => void;
    handleReact: (messageId: string, emoji: string, action: ReactionAction) => void;
    typingUsers: any;
}
export const MessageFeed = ({ userId, messages, editMessage, deleteMessage, setReplyingTo, handleReact }: MessageFeedProps) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    const shouldShowAvatar = (index: number) => {
        return index === 0 || messages[index - 1].sender_id !== messages[index].sender_id;
    };
    return (
        <>
            <ScrollArea className="flex-1 p-6">
                <div className="max-w-3xl mx-auto flex flex-col">
                    {messages.map((message, index) => (
                        <MessageBubble
                            key={message._id}
                            message={message}
                            isOwn={message.sender_id === userId}
                            showAvatar={shouldShowAvatar(index)}
                            onEdit={editMessage}
                            onDelete={deleteMessage}
                            onReply={setReplyingTo}
                            onReact={handleReact}
                            currentUserId={userId || ''}
                        />
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>
        </>
    )
}