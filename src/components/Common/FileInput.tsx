import { useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileInputProps {
  disabled: boolean;
  onFileChange: (value: React.SetStateAction<File | null>) => void;
}
const FileInput = ({ disabled, onFileChange }: FileInputProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <>
      <Button
        type="button"
        size="icon"
        intent="ghost"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
      >
        <Paperclip className="w-4 h-4" />
      </Button>
      <Input
        ref={fileInputRef}
        type="file"
        onChange={(e) => onFileChange(e.target.files?.[0] || null)}
        containerClassName="hidden"
        className="hidden"
        accept="image/*,.pdf,.txt,.doc,.docx,.zip,.mp3,.wav,.mp4"
      />
    </>
  );
};

export default FileInput;
