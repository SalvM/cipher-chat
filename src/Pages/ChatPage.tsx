import { ChatMessageFeed } from '@/components/Chat/ChatMessageFeed';
import { ChatSidebar } from '@/components/Chat/ChatSidebar';
import ClusterView from '@/components/Chat/ClusterView';
import { useSocket } from '@/hooks/useSocket';
import { useAuthStore } from '@/stores/authStore';
import { useConversationStore } from '@/stores/conversationStore';
import { useEffect } from 'react';

export default function ChatPage() {
  const {
    chats,
    clusters,
    selectedChatId,
    selectedClusterId,
    selectedTab,
    setSelectedChatId,
    setSelectedClusterId,
    setSelectedTab,
    fetchChats,
    fetchClusters,
    createChat,
  } = useConversationStore();
  const { user, setUser, logout } = useAuthStore();

  useSocket();

  const handleChatSelected = (chatId: string, isCluster: boolean) => {
    if (isCluster) {
      setSelectedClusterId(chatId);
    } else {
      setSelectedChatId(chatId);
    }
  };

  useEffect(() => {
    fetchChats();
    fetchClusters();
  }, []);

  useEffect(() => {
    if (user?._id) return;
    try {
      const localUser = localStorage.getItem('user');
      if (!localUser) return;
      const localUserJson = JSON.parse(localUser);
      setUser(localUserJson);
    } catch (e) {
      console.error(e);
      return;
    }
  }, [user?._id]);

  return (
    <div className="flex min-h-screen max-h-screen flex-row items-center justify-center bg-base">
      <ChatSidebar
        chats={Object.values(chats)}
        clusters={Object.values(clusters)}
        selectedTab={selectedTab}
        selectedChatId={selectedChatId}
        selectedClusterId={selectedClusterId}
        onCreateChat={createChat}
        onSelectChat={handleChatSelected}
        onTabChange={setSelectedTab}
        onLogout={logout}
      />
      <div className="flex flex-1 flex-col min-h-screen max-h-screen">
        {/* Private chat feed 1-1 */}
        {selectedTab === 'chat' && selectedChatId && user?._id && (
          <ChatMessageFeed chatId={selectedChatId} userId={user._id} />
        )}

        {/* Cluster chat feed */}
        {selectedTab === 'cluster' && user?._id && (
          <ClusterView clusterId={selectedClusterId} userId={user._id} />
        )}
      </div>
    </div>
  );
}
