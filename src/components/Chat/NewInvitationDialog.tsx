import { useCreateInvitation } from '@/hooks/useApiQueries';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { ID } from '@/types/utilityTypes';
import { useState } from 'react';
import { Check, Copy, Link } from 'lucide-react';

const EXPIRE_OPTIONS: { label: string; hours: number }[] = [
  { label: '1 hour', hours: 1 },
  { label: '6 hours', hours: 6 },
  { label: '12 hours', hours: 12 },
  { label: '1 day', hours: 24 },
  { label: '3 days', hours: 72 },
  { label: '7 days', hours: 168 },
  { label: '14 days', hours: 336 },
  { label: '24 days', hours: 576 },
];

interface NewInvitationDialogProps {
  clusterId: ID;
  dialogOpen: boolean;
  closeDialog: () => void;
  onCreate?: () => void;
}

export const NewInvitationDialog = ({
  clusterId,
  dialogOpen,
  closeDialog,
  onCreate,
}: NewInvitationDialogProps) => {
  const [expireHours, setExpireHours] = useState(24);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { mutate: createInvitation, isPending } = useCreateInvitation();

  const handleCreate = () => {
    createInvitation(
      { clusterId, expireHours },
      {
        onSuccess: (data) => {
          setInviteLink(`${window.location.origin}/join/${data.invitationId}`);
          onCreate?.();
        },
        onError: (error) => {
          console.error('[NewInvitationDialog] handleCreate', error);
        },
      }
    );
  };

  const handleCopy = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('[NewInvitationDialog] handleCopy', e);
    }
  };

  const handleClose = () => {
    setInviteLink(null);
    setCopied(false);
    setExpireHours(24);
    closeDialog();
  };

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={closeDialog}
      title="Invite people"
      description={
        inviteLink
          ? 'Share this link with people you want to invite.'
          : 'Choose how long the invite link should be valid.'
      }
    >
      <div className="flex flex-col gap-4">
        {!inviteLink ? (
          <>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">
                Link expires after
              </span>
              <div className="grid grid-cols-4 gap-2">
                {EXPIRE_OPTIONS.map((opt) => (
                  <button
                    key={opt.hours}
                    onClick={() => setExpireHours(opt.hours)}
                    className={`rounded-md border px-2 py-1.5 text-xs transition-colors ${
                      expireHours === opt.hours
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-input bg-background text-muted-foreground hover:border-muted-foreground'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {isPending && (
              <div className="w-5 h-5 border-2 border-border border-t-white rounded-full animate-spin" />
            )}

            <div className="flex justify-end gap-2">
              <Button intent="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                intent="primary"
                disabled={isPending}
                onClick={handleCreate}
              >
                Generate link
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 rounded-md border border-input bg-muted/50 px-3 py-2">
              <Link className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                readOnly
                value={inviteLink}
                className="border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
              />
              <button
                onClick={handleCopy}
                className="shrink-0 rounded-md p-1 transition-colors hover:bg-muted"
                title="Copy link"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>

            {copied && (
              <p className="text-xs text-green-500">
                Link copied to clipboard!
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              Expires in{' '}
              {EXPIRE_OPTIONS.find((o) => o.hours === expireHours)?.label}.
            </p>

            <div className="flex justify-end">
              <Button intent="secondary" onClick={handleClose}>
                Done
              </Button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
};
