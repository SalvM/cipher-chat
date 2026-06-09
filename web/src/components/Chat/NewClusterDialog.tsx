import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useConversationStore } from '@/stores/conversationStore';
import { useEffect, useRef, useState } from 'react';

interface NewClusterDialogProps {
  dialogOpen: boolean;
  closeDialog: () => void;
  onCreated: (clusterId: string) => void;
}

export const NewClusterDialog = ({
  dialogOpen,
  closeDialog,
  onCreated,
}: NewClusterDialogProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { isLoading, createCluster } = useConversationStore();
  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = async () => {
    try {
      const clusterId = await createCluster(name, description);
      if (!clusterId) return;
      onCreated(clusterId);
      closeDialog();
    } catch (e) {
      console.error('[NewClusterDialog] handleCreate', e);
    }
  };

  useEffect(() => {
    if (dialogOpen) {
      const id = requestAnimationFrame(() => {
        nameInputRef.current?.focus();
      });
      return () => cancelAnimationFrame(id);
    } else {
      setName('');
      setDescription('');
    }
  }, [dialogOpen]);

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={closeDialog}
      title="New Cluster"
      description="Create a cluster and invite your squad."
    >
      <div className="flex flex-col gap-4">
        <Input
          placeholder="e.g. Illuminati"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && closeDialog()}
          ref={nameInputRef}
        />
        <Input
          placeholder="e.g. A group of very illuminated people."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && closeDialog()}
        />
        {isLoading && (
          <div className="w-5 h-5 border-2 border-border border-t-white rounded-full animate-spin" />
        )}

        <div className="flex justify-end gap-2">
          <Button intent="secondary" onClick={closeDialog}>
            Cancel
          </Button>
          <Button intent="primary" disabled={isLoading} onClick={handleCreate}>
            Create
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
