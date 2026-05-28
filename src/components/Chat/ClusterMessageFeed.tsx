/*
import { MessageFeed } from "@/components/Chat/MessageFeed";
import type { Emoji } from "@/types/messageTypes";
import type { ID } from "@/types/utilityTypes";

interface ClusterMessageFeedProps {
    clusterId: ID;
    topicId: ID;
    userId: ID;
    onReact: (messageId: ID, emoji: Emoji) => void;
}
export const ChatMessageFeed = ({ clusterId, topicId, userId, onReact }: ClusterMessageFeedProps) => {
    const { messages, editMessage, deleteMessage, addReaction, removeReaction } = useClusterMessage(clusterId, topicId);
    return <MessageFeed
        userId={userId}
        messages={messages}
        isLoading={false}
        onEdit={(messageId: ID, content: string) => editMessage(clusterId, topicId, messageId, content)}
        onDelete={(messageId: ID) => deleteMessage(clusterId, topicId, messageId)}
        onReact={onReact}
        addReaction={addReaction}
        removeReaction={removeReaction}
    />;
}
*/