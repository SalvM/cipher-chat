import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRef, useState, type SubmitEventHandler } from 'react';
import FileInput from './FileInput';
import { ChatFilePreview } from './ChatFilePreview';

export interface ChatInputProps {
  handleSendMessage: (message: string, file: File | null) => void;
  isUploading: boolean;
  uploadDisabled: boolean;
  handleTyping: () => void;
}
export const ChatInput = ({
  handleSendMessage,
  isUploading,
  uploadDisabled,
  handleTyping,
}: ChatInputProps) => {
  const [messageInput, setMessageInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    handleTyping();
  };
  return (
    <>
      <ChatFilePreview
        filePreview={selectedFile}
        resetFilePreview={() => setSelectedFile(null)}
      />

      <div className="p-2 border-t border-white/5 w-full rounded-md border bg-elevated font-sans text-text-primary">
        <form
          onSubmit={() => handleSendMessage(messageInput?.trim(), selectedFile)}
          className="max-w-3xl mx-auto flex items-center gap-3"
        >
          <FileInput disabled={uploadDisabled} onFileChange={setSelectedFile} />

          <Input
            ref={inputRef}
            value={messageInput}
            onChange={handleInputChange}
            placeholder={`Send a message...`}
            className="flex-1 bg-elevated border-none rounded-md px-2 py-2 h-4"
            disabled={isUploading}
            data-testid="message-input"
          />

          <Button
            type="submit"
            size="icon"
            disabled={(!messageInput.trim() && !selectedFile) || isUploading}
            className="rounded-full"
            data-testid="send-message-btn"
          >
            {isUploading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </>
  );
};
