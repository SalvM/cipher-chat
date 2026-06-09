import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useConversationStore } from '@/stores/conversationStore';
import type { ID } from '@/types/utilityTypes';
import { useEffect, useRef, useState } from 'react';

interface EditClusterDialogProps {
  clusterId: ID;
  currentName: string;
  currentDescription?: string;
  dialogOpen: boolean;
  closeDialog: () => void;
}

export const EditClusterDialog = ({
  clusterId,
  currentName,
  currentDescription,
  dialogOpen,
  closeDialog,
}: EditClusterDialogProps) => {
  const [name, setName] = useState(currentName);
  const [description, setDescription] = useState(currentDescription ?? '');
  const { isLoading, updateCluster } = useConversationStore();
  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    if (!name.trim()) return;
    await updateCluster(clusterId, name.trim(), description.trim());
    closeDialog();
  };

  useEffect(() => {
    if (dialogOpen) {
      setName(currentName);
      setDescription(currentDescription ?? '');
      const id = requestAnimationFrame(() => nameInputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [dialogOpen, currentName, currentDescription]);

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={closeDialog}
      title="Edit Cluster"
      description="Update the cluster name and description."
    >
      <div className="flex flex-col gap-4">
        <Input
          placeholder="Cluster name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') closeDialog();
          }}
          ref={nameInputRef}
        />
        <Input
          placeholder="Description (optional)"
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
