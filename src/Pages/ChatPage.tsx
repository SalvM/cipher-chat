import { ChatSidebar } from "@/components/Chat/ChatSidebar"
import { useAuthStore } from "@/stores/authStore";
import { useConversationStore } from "@/stores/conversationStore";
import { useEffect } from "react";

export default function ChatPage() {
  const { chats, clusters, selectedChatId, selectedClusterId, selectedTab, setSelectedChatId, setSelectedClusterId, setSelectedTab, fetchChats, fetchClusters, createChat } = useConversationStore()
  const { logout } = useAuthStore()


  const handleChatSelected = (chatId: string, isCluster: boolean) => {
    if (isCluster) {
      setSelectedClusterId(chatId)
    } else {
      setSelectedChatId(chatId)
    }
  }

  useEffect(() => {
    fetchChats()
    fetchClusters()
  }, [])

  return (
    <div className="flex min-h-screen flex-row items-center justify-center bg-base">
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
      <div className="flex flex-1 flex-col px-4 py-12 sm:px-6 lg:px-8">
        <h2>Chat</h2>
        <p>Lorem ipsum dolor sit amet, consectetur adip.</p>
      </div>
    </div>
  );
}
