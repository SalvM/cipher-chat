import { File, Download } from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { getFileUrl, formatFileSize, isImageFile } from '@/utils/fileUtils';
import type { MessageAttachment } from '@/types/messageTypes';

interface ChatAttachmentProps {
  attachment: MessageAttachment;
}

const ChatAttachment = ({ attachment }: ChatAttachmentProps) => {
  const fileUrl = getFileUrl(attachment.file_id);

  if (isImageFile(attachment.mime_type)) {
    return (
      <Tooltip.Provider>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <div
              className="mt-2 rounded-lg overflow-hidden max-w-sm cursor-pointer"
              onClick={() => window.open(fileUrl, '_blank')}
            >
              <img
                src={fileUrl}
                alt={attachment.original_name}
                className="w-full h-auto max-h-64 object-cover hover:opacity-90 transition-opacity"
                onError={(e) => {
                  e.currentTarget.src =
                    'https://placehold.co/800?text=X_X&font=roboto';
                }}
              />
            </div>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content className="bg-elevated text-text-primary px-3 py-1.5 rounded text-sm border border-border">
              Click to enlarge
              <Tooltip.Arrow className="fill-overlay" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    );
  }

  return (
    <a
      href={fileUrl}
      download={attachment.original_name}
      className="mt-2 flex items-center gap-3 p-3 bg-elevated rounded-lg border border-border hover:bg-overlay transition-colors max-w-sm group"
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center group-hover:bg-primary-hover transition-colors">
        <File className="w-5 h-5 text-text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-primary truncate">
          {attachment.original_name}
        </p>
        <p className="text-xs text-primary-subtle">
          {formatFileSize(attachment.size)}
        </p>
      </div>
      <Download className="w-4 h-4 text-primary group-hovertext-primary-active transition-colors" />
    </a>
  );
};

export default ChatAttachment;
