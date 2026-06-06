import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/Common/ConfirmDialog';
import { ClusterMemberItem } from '@/components/Chat/ClusterMemberItem';
import { useConversationStore } from '@/stores/conversationStore';
import type { Cluster } from '@/types/clusterTypes';
import type { ID } from '@/types/utilityTypes';
import { Users } from 'lucide-react';

interface MembersDialogProps {
  currentCluster: Cluster;
  userId: ID;
  isOwner: boolean;
  dialogOpen: boolean;
  closeDialog: () => void;
}

export const MembersDialog = ({
  currentCluster,
  userId,
  isOwner,
  dialogOpen,
  closeDialog,
}: MembersDialogProps) => {
  const { removeMember } = useConversationStore();
  const [pendingRemoveMemberId, setPendingRemoveMemberId] = useState<ID | null>(null);
  const pendingRemoveMember = (currentCluster.member_details ?? []).find(
    (m) => m._id === pendingRemoveMemberId
  );
  const members = currentCluster.member_details ?? [];
  const memberCount = currentCluster.members?.length ?? members.length;

  // Owner first, then alphabetical
  const sortedMembers = [...members].sort((a, b) => {
    if (a._id === currentCluster.owner_id) return -1;
    if (b._id === currentCluster.owner_id) return 1;
    return a.display_name.localeCompare(b.display_name);
  });

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={closeDialog}
      title="Members"
      description={currentCluster.name}
    >
      <div className="flex flex-col gap-4">
        {/* Count */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>
            {memberCount} {memberCount === 1 ? 'member' : 'members'}
          </span>
        </div>

        {/* List */}
        <div className="flex flex-col gap-0.5 max-h-80 overflow-y-auto -mx-1 px-1">
          {sortedMembers.length > 0 ? (
            sortedMembers.map((member) => {
              const isMemberOwner = member._id === currentCluster.owner_id;
              const isMemberCurrentUser = member._id === userId;
              const canRemove = isOwner && !isMemberOwner && !isMemberCurrentUser;
              return (
                <ClusterMemberItem
                  key={member._id}
                  user={member}
                  isOwner={isMemberOwner}
                  isCurrentUser={isMemberCurrentUser}
                  onRemove={
                    canRemove
                      ? () => setPendingRemoveMemberId(member._id)
                      : undefined
                  }
                />
              );
            })
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No members to display.
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <Button intent="secondary" onClick={closeDialog}>
            Close
          </Button>
        </div>
      </div>
      <ConfirmDialog
        open={!!pendingRemoveMemberId}
        onOpenChange={(open) => { if (!open) setPendingRemoveMemberId(null); }}
        title="Remove member"
        description={
          pendingRemoveMember
            ? `Remove @${pendingRemoveMember.username} from ${currentCluster.name}?`
            : undefined
        }
        confirmLabel="Remove"
        onConfirm={() => {
          if (pendingRemoveMemberId) removeMember(currentCluster._id, pendingRemoveMemberId);
        }}
      />
    </Dialog>
  );
};
