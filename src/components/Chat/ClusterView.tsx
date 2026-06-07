import { useCallback, useMemo, useState } from 'react';
import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';
import { Hash, Users, Plus, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownItem,
  DropdownSeparator,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useConversationStore } from '@/stores/conversationStore';
import type { Topic } from '@/types/clusterTypes';
import type { ID } from '@/types/utilityTypes';
import { cn } from '@/utils';
import { ClusterMessageFeed } from './ClusterMessageFeed';
import { NewTopicDialog } from './NewTopicDialog';
import { NewInvitationDialog } from './NewInvitationDialog';
import { MembersDialog } from './ClusterMembersDialog';
import { EditClusterDialog } from './EditClusterDialog';
import { EditTopicDialog } from './EditTopicDialog';
import { ConfirmDialog } from '../Common/ConfirmDialog';
import TimerSelector from '../Common/TimerSelector';

interface ClusterViewProps {
  clusterId: ID | null;
  userId: ID;
}

const ClusterView = ({ clusterId, userId }: ClusterViewProps) => {
  const currentCluster = useConversationStore((s) =>
    clusterId ? s.clusters[clusterId] : null
  );

  const {
    selectedTopicId,
    setSelectedTopicId,
    setCurrentTopic,
    deleteCluster,
    deleteTopic,
  } = useConversationStore();

  const [showAddTopic, setShowAddTopic] = useState(false);
  const [showCreateInvitation, setShowCreateInvitation] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showEditCluster, setShowEditCluster] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [contextMenuTopicId, setContextMenuTopicId] = useState<ID | null>(null);
  const [confirmDeleteCluster, setConfirmDeleteCluster] = useState(false);
  const [pendingDeleteTopicId, setPendingDeleteTopicId] = useState<ID | null>(
    null
  );

  const handleSelectTopic = (topicId: ID) => {
    setSelectedTopicId(topicId);
  };

  const currentTopic = useMemo(() => {
    if (!selectedTopicId || !currentCluster) return null;
    return currentCluster?.topics?.find((t) => t._id === selectedTopicId);
  }, [currentCluster, selectedTopicId]);

  const isClusterOwner = useMemo(() => {
    if (!userId || !currentCluster) return false;
    return currentCluster?.owner_id === userId;
  }, [userId, currentCluster]);

  const updateTopic = useCallback(
    (disappearingMinutes: number) => {
      if (!isClusterOwner) return;
      setCurrentTopic({ disappearingMinutes });
    },
    [isClusterOwner]
  );

  const handleDeleteCluster = () => {
    if (!currentCluster) return;
    setConfirmDeleteCluster(true);
  };

  const handleDeleteTopic = (topicId: ID) => {
    if (!currentCluster) return;
    setPendingDeleteTopicId(topicId);
  };

  const handleCreateTopic = (topicId: ID) => {
    if (!topicId) return;
    setSelectedTopicId(topicId);
  };

  if (!currentCluster) {
    return (
      <div className="flex-1 flex items-center justify-center bg-basic">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-text-secondary" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Select a cluster
          </h3>
          <p className="text-text-secondary">
            Choose a cluster from the sidebar
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex min-h-screen max-h-screen bg-base">
      {/* Topics sidebar */}
      <div className="w-60 border-r border-white bg-base flex flex-col">
        {/* Cluster header */}
        <div className="p-4 border-b border-white/5 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-semibold text-text-primary truncate">
              {currentCluster.name}
            </h2>
            <p className="text-xs text-text-secondary truncate">
              {currentCluster.description || 'No description'}
            </p>
          </div>
          {isClusterOwner && (
            <DropdownMenu
              align="end"
              trigger={
                <button className="shrink-0 rounded-md p-1 text-text-muted transition-colors hover:bg-ghost-hover hover:text-ghost-fg-hover">
                  <MoreVertical className="w-4 h-4" />
                </button>
              }
            >
              <DropdownItem onSelect={() => setShowEditCluster(true)}>
                <Pencil className="w-4 h-4" />
                Edit cluster
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem intent="danger" onSelect={handleDeleteCluster}>
                <Trash2 className="w-4 h-4" />
                Delete cluster
              </DropdownItem>
            </DropdownMenu>
          )}
        </div>

        {isClusterOwner && (
          <div className="p-2 border-b border-white/5">
            <Button
              intent="ghost"
              size="sm"
              className="w-full justify-start text-text-secondary hover:text-white"
              onClick={() => setShowCreateInvitation(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Invitation
            </Button>
            <Button
              intent="ghost"
              size="sm"
              className="w-full justify-start text-text-secondary hover:text-white"
              onClick={() => setShowAddTopic(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Topic
            </Button>
          </div>
        )}

        <ScrollArea className="flex-1 p-2">
          <div className="space-y-1 overflow-y-auto">
            {(currentCluster.topics ?? []).map((topic) => (
              <DropdownPrimitive.Root
                key={topic._id}
                open={isClusterOwner && contextMenuTopicId === topic._id}
                onOpenChange={(open) => {
                  if (!open) setContextMenuTopicId(null);
                }}
              >
                <DropdownPrimitive.Trigger asChild>
                  <button
                    onClick={() => handleSelectTopic(topic._id)}
                    onContextMenu={(e) => {
                      if (!isClusterOwner) return;
                      e.preventDefault();
                      setContextMenuTopicId(topic._id);
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors',
                      currentTopic?._id === topic._id
                        ? 'bg-primary-subtle text-white'
                        : 'text-text-secondary hover:bg-surface hover:text-white'
                    )}
                  >
                    <Hash className="w-4 h-4 shrink-0" />
                    <span className="flex-1 truncate">{topic.name}</span>
                  </button>
                </DropdownPrimitive.Trigger>

                <DropdownPrimitive.Portal>
                  <DropdownPrimitive.Content
                    className="z-50 min-w-40 rounded-lg border border-border bg-overlay p-1 shadow-xl animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
                    sideOffset={4}
                  >
                    <DropdownPrimitive.Item
                      className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-text-secondary outline-none hover:bg-ghost-hover hover:text-ghost-fg-hover data-disabled:pointer-events-none data-[disabled]:opacity-40"
                      onSelect={() => {
                        setEditingTopic(topic);
                        setContextMenuTopicId(null);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                      Edit topic
                    </DropdownPrimitive.Item>
                    <DropdownPrimitive.Item
                      className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-danger outline-none hover:bg-danger-subtle hover:text-danger data-[disabled]:pointer-events-none data-[disabled]:opacity-40"
                      onSelect={() => {
                        handleDeleteTopic(topic._id);
                        setContextMenuTopicId(null);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete topic
                    </DropdownPrimitive.Item>
                  </DropdownPrimitive.Content>
                </DropdownPrimitive.Portal>
              </DropdownPrimitive.Root>
            ))}
          </div>
        </ScrollArea>

        <div className="p-2 border-t border-white/5">
          <Button
            intent="ghost"
            size="sm"
            className="w-full justify-start text-text-secondary hover:text-white"
            onClick={() => setShowMembers(true)}
          >
            <Users className="w-4 h-4 mr-2" />
            {currentCluster.member_details?.length || 0} Members
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-h-screen max-h-screen">
        {/* Header */}
        <div className="h-14 px-6 flex items-center border-b border-white/5 bg-surface">
          {currentTopic ? (
            <div className="flex items-center gap-2">
              <Hash className="w-5 h-5 text-text-secondary" />
              <h3 className="font-semibold text-white">{currentTopic.name}</h3>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-text-secondary">
                Select a topic to start chatting
              </p>
            </div>
          )}
          {currentTopic && (
            <>
              <div className="flex flex-1"></div>
              <TimerSelector
                initialValue={currentTopic.disappearing_minutes ?? 0}
                onChange={updateTopic}
              />
            </>
          )}
        </div>

        {/* Messages */}
        {currentTopic && (
          <ClusterMessageFeed
            clusterId={currentCluster._id}
            topicId={currentTopic._id}
            userId={userId}
          />
        )}
      </div>

      {/* Dialogs */}
      <NewTopicDialog
        clusterId={currentCluster._id}
        clusterName={currentCluster.name}
        dialogOpen={showAddTopic}
        onCreated={handleCreateTopic}
        closeDialog={() => setShowAddTopic(false)}
      />
      <NewInvitationDialog
        clusterId={currentCluster._id}
        dialogOpen={showCreateInvitation}
        closeDialog={() => setShowCreateInvitation(false)}
      />
      <MembersDialog
        currentCluster={currentCluster}
        userId={userId}
        isOwner={isClusterOwner}
        dialogOpen={showMembers}
        closeDialog={() => setShowMembers(false)}
      />
      <EditClusterDialog
        clusterId={currentCluster._id}
        currentName={currentCluster.name}
        currentDescription={currentCluster.description}
        dialogOpen={showEditCluster}
        closeDialog={() => setShowEditCluster(false)}
      />
      {editingTopic && (
        <EditTopicDialog
          clusterId={currentCluster._id}
          topic={editingTopic}
          dialogOpen={!!editingTopic}
          closeDialog={() => setEditingTopic(null)}
        />
      )}
      <ConfirmDialog
        open={confirmDeleteCluster}
        onOpenChange={setConfirmDeleteCluster}
        title="Delete cluster"
        description={`"${currentCluster.name}" and all its topics will be permanently deleted.`}
        confirmLabel="Delete cluster"
        onConfirm={() => deleteCluster(currentCluster._id)}
      />
      <ConfirmDialog
        open={!!pendingDeleteTopicId}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteTopicId(null);
        }}
        title="Delete topic"
        description="All messages in this topic will be permanently deleted."
        confirmLabel="Delete topic"
        onConfirm={() => {
          if (pendingDeleteTopicId)
            deleteTopic(currentCluster._id, pendingDeleteTopicId);
        }}
      />
    </div>
  );
};

export default ClusterView;
