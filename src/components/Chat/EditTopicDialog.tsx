import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useConversationStore } from '@/stores/conversationStore';
import type { Topic } from '@/types/clusterTypes';
import type { ID } from '@/types/utilityTypes';
import { useEffect, useRef, useState } from 'react';

const DISAPPEARING_OPTIONS: { label: string; value: number }[] = [
  { label: 'Off', value: 0 },
  { label: '1 minute', value: 1 },
  { label: '5 minutes', value: 5 },
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '1 day', value: 1440 },
  { label: '2 days', value: 2880 },
  { label: '1 week', value: 10080 },
];

interface EditTopicDialogProps {
  clusterId: ID;
  topic: Topic;
  dialogOpen: boolean;
  closeDialog: () => void;
}

export const EditTopicDialog = ({
  clusterId,
  topic,
  dialogOpen,
  closeDialog,
}: EditTopicDialogProps) => {
  const [name, setName] = useState(topic.name);
  const [description, setDescription] = useState(topic.description ?? '');
  const [disappearingMinutes, setDisappearingMinutes] = useState(
    topic.disappearing_minutes
  );
  const { isLoading, updateTopic } = useConversationStore();
  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    if (!name.trim()) return;
    await updateTopic(clusterId, topic._id, {
      name: name.trim(),
      description: description.trim() || undefined,
      disappearingMinutes,
    });
    closeDialog();
  };

  useEffect(() => {
    if (dialogOpen) {
      setName(topic.name);
      setDescription(topic.description ?? '');
      setDisappearingMinutes(topic.disappearing_minutes);
      const id = requestAnimationFrame(() => nameInputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [dialogOpen, topic]);

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={closeDialog}
      title="Edit Topic"
      description="Update the topic settings."
    >
      <div className="flex flex-col gap-4">
        <Input
          ref={nameInputRef}
          placeholder="Topic name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') closeDialog();
          }}
        />
        <Input
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && closeDialog()}
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">
            Auto-delete messages
          </span>
          <select
            value={disappearingMinutes}
            onChange={(e) => setDisappearingMinutes(Number(e.target.value))}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {DISAPPEARING_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {isLoading && (
          <div className="w-5 h-5 border-2 border-border border-t-white rounded-full animate-spin" />
        )}

        <div className="flex justify-end gap-2">
          <Button intent="secondary" onClick={closeDialog}>
            Cancel
          </Button>
          <Button
            intent="primary"
            disabled={isLoading || !name.trim()}
            onClick={handleSave}
          >
            Save
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
