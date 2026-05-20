import { MessageSquare, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatFileSize } from '@/utils/fileUtils';

/**
 * This file preview is shown in the ChatInput field
 */
interface ChatFilePreviewProps {
  filePreview: File | null;
  resetFilePreview: () => void;
}
export const ChatFilePreview = ({
  filePreview,
  resetFilePreview,
}: ChatFilePreviewProps) => {
  return (
    <>
      {filePreview && (
        <div className=" rounded-md px-4 py-2 border-t border-white/5 bg-elevated">
          <div className="max-w-3xl mx-auto flex items-center gap-3 bg-overlay rounded-lg p-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
              {filePreview.type.startsWith('image/') ? (
                <MessageSquare className="w-5 h-5 text-secondary-fg" />
              ) : (
                <Paperclip className="w-5 h-5 text-secondary-fg" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{filePreview.name}</p>
              <p className="text-xs text-slate-400">
                {formatFileSize(filePreview.size)}
              </p>
            </div>
            <Button size="icon" intent="ghost" onClick={resetFilePreview}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
