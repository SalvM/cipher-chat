import { Reply, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type Message } from '@/types/messageTypes';

interface ChatReplyPreviewProps {
  replyingTo: Message;
  clearReplyingTo: () => void;
}
export const ChatReplyPreview = ({
  replyingTo,
  clearReplyingTo,
}: ChatReplyPreviewProps) => {
  return (
    <div className="px-4 py-2 border-t border-white/5 bg-surface rounded-lg">
      <div className="max-w-3xl mx-auto flex items-center gap-3 bg-elevated rounded-lg p-3">
        <Reply className="w-4 h-4 text-primary" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-primary">
            Replying to {replyingTo.sender_display_name}
          </p>
          <p className="text-sm text-text-primary truncate">
            {replyingTo.content}
          </p>
        </div>
        <Button size="icon" intent="ghost" onClick={clearReplyingTo}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
//
