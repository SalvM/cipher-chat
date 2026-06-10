import { ChatUserItem } from './ChatUserItem';
import { ClusterItem } from './ClusterItem';
import { MessageCircle, Users, Settings, LogOut, User } from 'lucide-react';
import type { Chat } from '@/types/chatTypes';
import type { Cluster } from '@/types/clusterTypes';
import type { ChatType } from '@/types/utilityTypes';
import { Button } from '../ui/button';
import { NewChatDialog } from './NewChatDialog';
import { useState } from 'react';
import { NewClusterDialog } from './NewClusterDialog';
import LogoSrc from '@/assets/icons/cipher-logo-primary.svg';
import { useAuthStore } from '@/stores/authStore';

interface ChatSidebarProps {
  chats: Chat[];
  clusters: Cluster[];
  selectedTab: ChatType;
  selectedChatId: string | null;
  selectedClusterId: string | null;
  onCreateChat: (userId: string) => void;
  onSelectChat: (chatId: string, isCluster: boolean) => void;
  onTabChange: (chatType: ChatType) => void;
  onLogout: () => void;
}

export const ChatSidebar = ({
  chats,
  clusters,
  selectedTab,
  selectedChatId,
  selectedClusterId,
  onCreateChat,
  onSelectChat,
  onTabChange,
  onLogout,
}: ChatSidebarProps) => {
  const [newChatDialogOpen, setNewChatDialogOpen] = useState(false);
  const [newClusterDialogOpen, setNewClusterDialogOpen] = useState(false);
  const { user } = useAuthStore();

  return (
    <div className="w-72 h-screen bg-surface/95 backdrop-blur-xl border-r border-border flex flex-col">
      {/* Logo header */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-subtle">
          <img src={LogoSrc} alt="" className="h-5 w-5" aria-hidden="true" />
        </div>
        <span className="text-sm font-semibold text-text-primary tracking-tight">
          Cipher Chat
        </span>
      </div>

      {/* Tab toggle */}
      <div className="p-3 border-b border-border">
        <div className="flex gap-1 bg-secondary/50 rounded-lg p-1">
          <button
            onClick={() => onTabChange('chat')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 ${
              selectedTab === 'chat'
                ? 'bg-primary text-primary-fg shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-ghost-hover'
            }`}
          >
            <MessageCircle size={15} />
            Chat
          </button>
          <button
            onClick={() => onTabChange('cluster')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 ${
              selectedTab === 'cluster'
                ? 'bg-primary text-primary-fg shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-ghost-hover'
            }`}
          >
            <Users size={15} />
            Clusters
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {selectedTab === 'chat' && (
          <div className="flex flex-col gap-1 p-2">
            <Button
              intent="ghost"
              size="sm"
              className="w-full justify-start text-text-muted hover:text-text-primary"
              onClick={() => setNewChatDialogOpen(true)}
            >
              New direct chat
            </Button>
            <NewChatDialog
              dialogOpen={newChatDialogOpen}
              closeDialog={() => setNewChatDialogOpen(false)}
              onCreated={onCreateChat}
            />
            {chats.map((chat) => (
              <ChatUserItem
                key={chat._id}
                user={chat.otherUser}
                isSelected={selectedChatId === chat._id}
                onClick={() => onSelectChat(chat._id, false)}
              />
            ))}
          </div>
        )}

        {selectedTab === 'cluster' && (
          <div className="flex flex-col gap-1 p-2">
            <Button
              intent="ghost"
              size="sm"
              className="w-full justify-start text-text-muted hover:text-text-primary"
              onClick={() => setNewClusterDialogOpen(true)}
            >
              New cluster
            </Button>
            <NewClusterDialog
              dialogOpen={newClusterDialogOpen}
              closeDialog={() => setNewClusterDialogOpen(false)}
              onCreated={() => null}
            />
            {clusters.map((cluster) => (
              <ClusterItem
                key={cluster._id}
                name={cluster.name}
                memberCount={cluster?.members?.length ?? 0}
                isSelected={selectedClusterId === cluster._id}
                onClick={() => onSelectChat(cluster._id, true)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border p-2">
        <div className="flex gap-1">
          {user?._id && (
            <ChatUserItem
              key={user?._id}
              user={user}
              isSelected={false}
              onClick={() => {}}
            />
          )}
          <button
            className="items-center justify-center p-2.5 rounded-lg hover:bg-danger-subtle text-ghost-fg hover:text-danger transition-colors"
            title="Logout"
            onClick={onLogout}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
