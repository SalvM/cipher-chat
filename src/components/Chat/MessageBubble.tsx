// src/components/chat/MessageBubble.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Edit2,
  Trash2,
  Reply,
  Smile,
  CheckCheck,
  Timer,
  Check,
  X,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import ReactionPicker from './ReactionPicker';
import type { Emoji, Message as GlobalMessage } from '@/types/messageTypes';
import type { AnyMessage, ID, ReactionAction } from '@/types/utilityTypes';
import { Avatar } from '@/components/ui/avatar';
import { Tooltip } from '../ui/tooltip';
import ChatAttachment from './ChatAttachment';

// Type guard
const isGlobalMessage = (message: AnyMessage): message is GlobalMessage => {
  return 'chat_id' in message && 'read_by' in message;
};

interface MessageBubbleProps {
  message: AnyMessage;
  isOwn: boolean;
  showAvatar: boolean;
  onEdit?: (messageId: ID, content: string) => void;
  onDelete?: (messageId: ID) => void;
  onReply?: (message: AnyMessage) => void;
  onReact: (messageId: ID, emoji: Emoji, action: ReactionAction) => void;
  currentUserId: ID;
  isCluster?: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  showAvatar,
  onEdit,
  onDelete,
  onReply,
  onReact,
  currentUserId,
  isCluster = false,
}) => {
  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showActions, setShowActions] = useState(false);

  const isRead =
    !isCluster && isGlobalMessage(message)
      ? message.read_by?.length > 1
      : false;

  const handleEdit = () => {
    if (onEdit) {
      onEdit(message._id, editContent);
      setIsEditing(false);
    }
  };

  const handleReact = (emoji: Emoji) => {
    onReact(message._id, emoji, 'add');
  };

  const reactionsArray = Object.entries(message.reactions || {}).map(
    ([emoji, users]) => ({
      emoji,
      count: users.length,
      reacted: users.includes(currentUserId),
    })
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isOwn && !isCluster ? 'flex-row-reverse' : ''} mb-4 group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {showAvatar ? (
        <Avatar
          src={message.sender_avatar}
          alt={message.sender_display_name}
          fallback={
            message.sender_display_name?.charAt(0)?.toUpperCase() || '?'
          }
          size="md"
        />
      ) : (
        <div className="w-9" />
      )}

      <div
        className={`max-w-[70%] ${isOwn && !isCluster ? 'items-end' : 'items-start'} flex flex-col relative`}
      >
        {/* Header with name and time */}
        {showAvatar && (
          <div
            className={`flex items-center gap-2 mb-1 ${isOwn && !isCluster ? 'flex-row-reverse' : ''}`}
          >
            <span className="text-sm font-medium text-text-primary">
              {message.sender_display_name}
            </span>
            <span className="text-xs text-text-muted">{time}</span>
            {message.expires_at && (
              <Tooltip content={'Disappearing message'}>
                <Timer className="w-3 h-3 text-warning" />
              </Tooltip>
            )}
          </div>
        )}

        {/* Reply reference */}
        {message.reply_to_content && (
          <div
            className={`
            text-xs text-text-secondary bg-surface border-l-2 border-border 
            px-2 py-1 rounded mb-1 max-w-full truncate
            ${isOwn && !isCluster ? 'ml-auto' : ''}
          `}
          >
            <Reply className="w-3 h-3 inline mr-1" />
            {message.reply_to_content}
          </div>
        )}

        {/* Message content */}
        {isEditing ? (
          <div className="flex items-center gap-2 w-full">
            <Input
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
              className="flex-1"
              autoFocus
            />
            <Button size="icon" intent="ghost" onClick={handleEdit}>
              <Check className="w-4 h-4 text-success" />
            </Button>
            <Button
              size="icon"
              intent="ghost"
              onClick={() => setIsEditing(false)}
            >
              <X className="w-4 h-4 text-danger" />
            </Button>
          </div>
        ) : (
          <>
            <div
              className={`
              px-4 py-2.5 
              ${isOwn && !isCluster
                  ? 'bg-primary rounded-l-2xl rounded-tr-2xl rounded-br-md'
                  : 'bg-secondary rounded-r-2xl rounded-tl-2xl rounded-bl-md'
                }
            `}
            >
              <p className={`text-sm whitespace-pre-wrap wrap-break-word ${isOwn && !isCluster ? 'text-primary-fg' : 'text-secondary-fg'}`}>
                {message.content}
              </p>
              {message.edited && (
                <span className={`text-xs opacity-60 ml-1 ${isOwn && !isCluster ? 'text-primary-fg' : 'text-secondary-fg'}`}>(edited)</span>
              )}
              {message.attachments?.map((attachment, i) => (
                <ChatAttachment key={i} attachment={attachment} />
              ))}
            </div>

            {/* Reactions */}
            {reactionsArray.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {reactionsArray.map(({ emoji, count, reacted }: any) => (
                  <button
                    key={emoji}
                    onClick={() =>
                      onReact(message._id, emoji, reacted ? 'remove' : 'add')
                    }
                    className={`
                      inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors
                      ${reacted
                        ? 'bg-primary-subtle border border-primary-active hover:bg-primary-hover hover:text-text-primary'
                        : 'bg-secondary-subtle border border-border hover:bg-primary-active hover:border-primary hover:text-text-primary'
                      }
                    `}
                  >
                    <span>{emoji}</span>
                    <span className="text-text-secondary">{count}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Footer with time and read receipt */}
        {!showAvatar && !isCluster && isGlobalMessage(message) && (
          <div
            className={`flex items-center gap-1 mt-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}
          >
            <span className="text-xs text-text-muted">{time}</span>
            {isOwn && (
              <CheckCheck
                className={`w-3 h-3 ${isRead ? 'text-text-primary' : 'text-text-muted'}`}
              />
            )}
          </div>
        )}

        {/* Actions menu */}
        {showActions && !isEditing && (
          <div
            className={`
            absolute top-0 ${isOwn && !isCluster ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'}
            flex items-center gap-1 px-2
          `}
          >
            <ReactionPicker onSelect={handleReact}>
              <Button size="icon" intent="ghost" className="h-7 w-7">
                <Smile className="w-3 h-3" />
              </Button>
            </ReactionPicker>

            {onReply && (
              <Button
                size="icon"
                intent="ghost"
                className="h-7 w-7"
                onClick={() => onReply(message)}
              >
                <Reply className="w-3 h-3" />
              </Button>
            )}

            {isOwn && onEdit && (
              <Button
                size="icon"
                intent="ghost"
                className="h-7 w-7"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="w-3 h-3" />
              </Button>
            )}

            {isOwn && onDelete && (
              <Button
                size="icon"
                intent="ghost"
                className="h-7 w-7 text-danger"
                onClick={() => onDelete(message._id)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default MessageBubble;
