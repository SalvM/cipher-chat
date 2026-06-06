import { useCreateTopic } from '@/hooks/useApiQueries';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { ID } from '@/types/utilityTypes';
import { useEffect, useRef, useState } from 'react';

const DISAPPEARING_OPTIONS: { label: string; value: number }[] = [
  { label: 'Off', value: 0 },
  { label: '1 minute', value: 1 },
  { label: '5 minutes', value: 5 },
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '1 day', value: 1440 },
  { label: '2 day', value: 2880 },
  { label: '1 week', value: 10080 },
];

interface NewTopicDialogProps {
  clusterId: ID;
  clusterName: string;
  dialogOpen: boolean;
  closeDialog: () => void;
  onCreated: (topicId: ID) => void;
}

export const NewTopicDialog = ({
  clusterId,
  clusterName,
  dialogOpen,
  closeDialog,
  onCreated,
}: NewTopicDialogProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [disappearingMinutes, setDisappearingMinutes] = useState(0);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const { mutate: createTopic, isPending } = useCreateTopic();

  const handleCreate = () => {
    if (!name.trim()) return;
    createTopic(
      {
        clusterId,
        name: name.trim(),
        description: description.trim() || undefined,
        disappearing_minutes: disappearingMinutes,
      },
      {
        onSuccess: (topic) => {
          onCreated(topic._id);
          closeDialog();
        },
        onError: (error) => {
          console.error('[NewTopicDialog] handleCreate', error);
        },
      }
    );
  };

  useEffect(() => {
    if (dialogOpen) nameInputRef.current?.focus();
  }, [dialogOpen]);

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={closeDialog}
      title={`New topic in ${clusterName}`}
      description="Topics keep conversations organized by subject."
    >
      <div className="flex flex-col gap-4">
        <Input
          autoFocus
          ref={nameInputRef}
          placeholder="e.g. general, announcements…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCreate();
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

        {isPending && (
          <div className="w-5 h-5 border-2 border-border border-t-white rounded-full animate-spin" />
        )}

        <div className="flex justify-end gap-2">
          <Button intent="secondary" onClick={closeDialog}>
            Cancel
          </Button>
          <Button
            intent="primary"
            disabled={isPending || !name.trim()}
            onClick={handleCreate}
          >
            Create topic
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
