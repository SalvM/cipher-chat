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
export const ChatSidebar = ({ chats, clusters, selectedTab, selectedChatId, selectedClusterId, onCreateChat, onSelectChat, onTabChange, onLogout }: ChatSidebarProps) => {
    const [newChatDialogOpen, setNewChatDialogOpen] = useState(false);
    const [newClusterDialogOpen, setNewClusterDialogOpen] = useState(false);

    return (
        <div className="w-72 h-screen bg-overlay backdrop-blur-xl border-r border-border-strong flex flex-col">
            {/* Header - Tab Toggle */}
            <div className="p-4 border-b border-border-strong">
                <div className="flex gap-2 bg-secondary rounded-lg p-1">
                    <button
                        onClick={() => onTabChange('chat')}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded transition-colors ${selectedTab === 'chat'
                            ? 'bg-primary text-primary-fg'
                            : 'text-text-secondary hover:text-text-primary'
                            }`}
                    >
                        <MessageCircle size={18} />
                        <span className="text-sm font-medium">Chat</span>
                    </button>
                    <button
                        onClick={() => onTabChange('cluster')}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded transition-colors ${selectedTab === 'cluster'
                            ? 'bg-primary text-primary-fg'
                            : 'text-text-secondary hover:text-text-primary'
                            }`}
                    >
                        <Users size={18} />
                        <span className="text-sm font-medium">Clusters</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {selectedTab === 'chat' && (
                    <div className="flex flex-col gap-2 p-3">
                        <Button onClick={() => setNewChatDialogOpen(true)}>New direct chat</Button>
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
                    <div className="flex flex-col gap-2 p-3">
                        <Button onClick={() => setNewClusterDialogOpen(true)}>New cluster</Button>
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
            <div className="border-t border-border-strong p-3">
                <div className="flex gap-2">
                    <button className="flex-1 flex items-center justify-center p-2.5 rounded-lg hover:bg-ghost-hover text-ghost-fg hover:text-ghost-fg-hover transition-colors" title="Profile">
                        <User size={18} />
                    </button>
                    <button className="flex-1 flex items-center justify-center p-2.5 rounded-lg hover:bg-ghost-hover text-ghost-fg hover:text-ghost-fg-hover transition-colors" title="Settings">
                        <Settings size={18} />
                    </button>
                    <button className="flex-1 flex items-center justify-center p-2.5 rounded-lg hover:bg-danger-subtle text-danger transition-colors" title="Logout" onClick={onLogout}>
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </div>
    )
}
