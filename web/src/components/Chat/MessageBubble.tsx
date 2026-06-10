import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Edit2, Trash2, Reply, Smile, CheckCheck, Check, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import ReactionPicker from './ReactionPicker';
import type { Emoji, Message as GlobalMessage } from '@/types/messageTypes';
import type { AnyMessage, ID, ReactionAction } from '@/types/utilityTypes';
import { Avatar } from '@/components/ui/avatar';
import ChatAttachment from '@/components/Chat/ChatAttachment';
import MessageExpireTimer from '@/components/Chat/MessageExpireTimer';
import { cn } from '@/utils';

const isGlobalMessage = (message: AnyMessage): message is GlobalMessage =>
  'chat_id' in message;

interface MessageBubbleProps {
  message: AnyMessage;
  isOwn: boolean;
  showAvatar: boolean;
  onEdit?: (messageId: ID, content: string) => void;
  onDelete?: (messageId: ID) => void;
  onReply?: (message: AnyMessage) => void;
  onReact: (messageId: ID, emoji: Emoji, action: ReactionAction) => void;
  onExpire: (messageId: ID) => void;
  currentUserId: ID;
  isCluster?: boolean;
}

const MessageBubble = ({
  message,
  isOwn,
  showAvatar,
  onEdit,
  onDelete,
  onReply,
  onReact,
  onExpire,
  currentUserId,
  isCluster = false,
}: MessageBubbleProps) => {
  const time = useMemo(
    () =>
      new Date(message.created_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    [message]
  );

  const [isExpiring, setIsExpiring] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showActions, setShowActions] = useState(false);

  const ownInDM = isOwn && !isCluster;

  const isRead = useMemo(
    () =>
      !isCluster && isGlobalMessage(message)
        ? message?.read_by?.length > 1
        : false,
    [isCluster, message]
  );

  const handleEdit = () => {
    if (onEdit) {
      onEdit(message._id, editContent);
      setIsEditing(false);
    }
  };

  const handleMessageExpire = () => {
    setIsExpiring(true);
    setTimeout(() => { if (onExpire) onExpire(message._id); }, 600);
  };

  const reactionsArray = useMemo(
    () =>
      Object.entries(message.reactions || {}).map(([emoji, users]) => ({
        emoji,
        count: users.length,
        reacted: users.includes(currentUserId),
      })),
    [message.reactions, currentUserId]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={
        isExpiring
          ? { opacity: 0, y: -40, scale: 0.9 }
          : { opacity: 1, y: 0, scale: 1 }
      }
      transition={{ duration: 0.5 }}
      className={cn(
        'flex gap-3 mb-3 group',
        ownInDM && 'flex-row-reverse'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {showAvatar ? (
        <Avatar
          src={message.sender_avatar}
          alt={message.sender_display_name}
          fallback={message.sender_display_name?.charAt(0)?.toUpperCase() || '?'}
          size="md"
          className="shrink-0 self-end"
        />
      ) : (
        <div className="w-10 shrink-0" />
      )}

      <div
        className={cn(
          'max-w-[72%] flex flex-col relative',
          ownInDM ? 'items-end' : 'items-start'
        )}
      >
        {/* Header */}
        {(showAvatar || message.expires_at) && (
          <div
            className={cn(
              'flex items-center gap-2 mb-1',
              ownInDM && 'flex-row-reverse'
            )}
          >
            {showAvatar && (
              <>
                <span className="text-xs font-semibold text-text-primary">
                  {message.sender_display_name}
                </span>
                <span className="text-[11px] text-text-muted">{time}</span>
              </>
            )}
            {message.expires_at && (
              <MessageExpireTimer
                expires_at={message.expires_at}
                onExpire={handleMessageExpire}
              />
            )}
          </div>
        )}

        {/* Reply reference */}
        {message.reply_to_content && (
          <div
            className={cn(
              'text-xs text-text-secondary bg-surface/60 border-l-2 border-primary/60',
              'px-2.5 py-1.5 rounded-md mb-1.5 max-w-full truncate',
              ownInDM && 'ml-auto'
            )}
          >
            <Reply className="w-3 h-3 inline mr-1 opacity-70" />
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
            <Button size="icon" intent="ghost" onClick={() => setIsEditing(false)}>
              <X className="w-4 h-4 text-danger" />
            </Button>
          </div>
        ) : (
          <>
            <div
              className={cn(
                'px-3.5 py-2.5 max-w-full',
                ownInDM
                  ? 'bg-primary rounded-l-2xl rounded-tr-2xl rounded-br rounded-bl-sm shadow-sm'
                  : 'bg-elevated border border-border rounded-r-2xl rounded-tl-2xl rounded-bl rounded-br-sm'
              )}
            >
              <p
                className={cn(
                  'text-sm whitespace-pre-wrap wrap-break-word leading-relaxed',
                  ownInDM ? 'text-primary-fg' : 'text-text-primary'
                )}
              >
                {message.content}
              </p>
              {message.edited && (
                <span
                  className={cn(
                    'text-[10px] opacity-50 ml-1',
                    ownInDM ? 'text-primary-fg' : 'text-text-secondary'
                  )}
                >
                  edited
                </span>
              )}
              {message.attachments?.map((attachment, i) => (
                <ChatAttachment key={i} attachment={attachment} />
              ))}
            </div>

            {/* Reactions */}
            {reactionsArray.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {reactionsArray.map(({ emoji, count, reacted }: any) => (
                  <button
                    key={emoji}
                    onClick={() =>
                      onReact(message._id, emoji, reacted ? 'remove' : 'add')
                    }
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
                      'border transition-all duration-150',
                      reacted
                        ? 'bg-primary-subtle border-primary/40 text-primary hover:bg-primary/20'
                        : 'bg-secondary/60 border-border text-text-secondary hover:border-primary/40 hover:text-primary'
                    )}
                  >
                    <span>{emoji}</span>
                    <span className="font-medium">{count}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Footer: time + read receipt */}
        {!showAvatar && !isCluster && isGlobalMessage(message) && (
          <div
            className={cn(
              'flex items-center gap-1 mt-0.5',
              ownInDM ? 'flex-row-reverse' : ''
            )}
          >
            <span className="text-[11px] text-text-muted">{time}</span>
            {isOwn && (
              <CheckCheck
                className={cn(
                  'w-3 h-3',
                  isRead ? 'text-primary' : 'text-text-muted'
                )}
              />
            )}
          </div>
        )}

        {/* Actions */}
        {showActions && !isEditing && (
          <div
            className={cn(
              'absolute top-0 flex items-center gap-0.5 px-1',
              'bg-overlay/90 backdrop-blur-sm border border-border rounded-lg shadow-md',
              ownInDM
                ? 'left-0 -translate-x-full -translate-y-1'
                : 'right-0 translate-x-full -translate-y-1'
            )}
          >
            <ReactionPicker onSelect={(emoji) => onReact(message._id, emoji, 'add')}>
              <Button size="icon" intent="ghost" className="h-7 w-7">
                <Smile className="w-3.5 h-3.5" />
              </Button>
            </ReactionPicker>

            {onReply && (
              <Button
                size="icon"
                intent="ghost"
                className="h-7 w-7"
                onClick={() => onReply(message)}
              >
                <Reply className="w-3.5 h-3.5" />
              </Button>
            )}

            {isOwn && onEdit && (
              <Button
                size="icon"
                intent="ghost"
                className="h-7 w-7"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="w-3.5 h-3.5" />
              </Button>
            )}

            {isOwn && onDelete && (
              <Button
                size="icon"
                intent="ghost"
                className="h-7 w-7 hover:text-danger"
                onClick={() => onDelete(message._id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default MessageBubble;
