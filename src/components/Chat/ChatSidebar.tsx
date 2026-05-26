import { useEffect, useState } from 'react';
import { ChatUserItem } from './ChatUserItem';
import { ClusterItem } from './ClusterItem';
import { MessageCircle, Users, Settings, LogOut, User } from 'lucide-react';
import api from '@/services/Api';
import { mockChats } from '@/utils/mockUtils';
import type { Chat } from '@/types/chatTypes';

const MOCK_CLUSTERS = [
    {
        id: '1',
        name: "Stand Users",
        memberCount: 12,
    },
    {
        id: '2',
        name: "Jojo Community",
        memberCount: 45,
    },
];

type Tab = 'chat' | 'cluster';

export const ChatSidebar = () => {
    const [activeTab, setActiveTab] = useState<Tab>('chat');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [chat, setChats] = useState<Chat[]>([])


    useEffect(() => {
        api.get<any>('/chats')
            .then(responseData => {
                if (responseData?.chats) {
                    setChats([...responseData?.chats])
                }
            })
    }, [])

    return (
        <div className="w-72 h-screen bg-overlay backdrop-blur-xl border-r border-border-strong flex flex-col">
            {/* Header - Tab Toggle */}
            <div className="p-4 border-b border-border-strong">
                <div className="flex gap-2 bg-secondary rounded-lg p-1">
                    <button
                        onClick={() => setActiveTab('chat')}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded transition-colors ${activeTab === 'chat'
                            ? 'bg-primary text-primary-fg'
                            : 'text-text-secondary hover:text-text-primary'
                            }`}
                    >
                        <MessageCircle size={18} />
                        <span className="text-sm font-medium">Chat</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('cluster')}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded transition-colors ${activeTab === 'cluster'
                            ? 'bg-primary text-primary-fg'
                            : 'text-text-secondary hover:text-text-primary'
                            }`}
                    >
                        <Users size={18} />
                        <span className="text-sm font-medium">Canali</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {activeTab === 'chat' && (
                    <div className="flex flex-col gap-2 p-3">
                        {chat.map((chat) => (
                            <ChatUserItem
                                key={chat.id}
                                user={chat.participant_details?.[1]}
                                isSelected={selectedId === chat.id}
                                onClick={() => setSelectedId(chat.id)}
                            />
                        ))}
                    </div>
                )}

                {activeTab === 'cluster' && (
                    <div className="flex flex-col gap-2 p-3">
                        {MOCK_CLUSTERS.map((cluster) => (
                            <ClusterItem
                                key={cluster.id}
                                {...cluster}
                                isSelected={selectedId === cluster.id}
                                onClick={() => setSelectedId(cluster.id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="border-t border-border-strong p-3">
                <div className="flex gap-2">
                    <button className="flex-1 flex items-center justify-center p-2.5 rounded-lg hover:bg-ghost-hover text-ghost-fg hover:text-ghost-fg-hover transition-colors" title="Profilo">
                        <User size={18} />
                    </button>
                    <button className="flex-1 flex items-center justify-center p-2.5 rounded-lg hover:bg-ghost-hover text-ghost-fg hover:text-ghost-fg-hover transition-colors" title="Impostazioni">
                        <Settings size={18} />
                    </button>
                    <button className="flex-1 flex items-center justify-center p-2.5 rounded-lg hover:bg-danger-subtle text-danger transition-colors" title="Logout">
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </div>
    )
}
