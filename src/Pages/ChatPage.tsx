import { ChatSidebar } from "@/components/Chat/ChatSidebar"

export default function ChatPage() {
  return (
    <div className="flex min-h-screen flex-row items-center justify-center bg-base">
      <ChatSidebar />
      <div className="flex flex-1 flex-col px-4 py-12 sm:px-6 lg:px-8">
        <h2>Chat</h2>
        <p>Lorem ipsum dolor sit amet, consectetur adip.</p>
      </div>
    </div>
  );
}
