import { Chat, Cluster } from "./utils/db.js";
import SocketEvents from "./socketEvents.js";

class ConnectionManager {
  constructor() {
    this.activeConnections = new Map();
    this.userStatus = new Map();
    this.typingUsers = new Map();
  }

  async connect(socket, userId) {
    //console.log(">> Connection - userId:", userId);
    this.activeConnections.set(userId, socket);
    this.userStatus.set(userId, "online");
    await this.broadcastStatus(userId, "online");
  }

  disconnect(userId) {
    this.activeConnections.delete(userId);
    this.userStatus.set(userId, "offline");
    this.broadcastStatus(userId, "offline");
  }

  async sendPersonalMessage(userId, eventType, eventContent) {
    //console.log("[sendPersonalMessage]", { userId, eventType, eventContent });
    const socket = this.activeConnections.get(userId);
    if (socket) {
      socket.emit(eventType, eventContent);
    }
  }

  async broadcastToChat(eventType, eventContent, participants) {
    // console.log("broadcastToChat", { eventType, eventContent, participants });
    for (const userId of participants) {
      this.sendPersonalMessage(userId.toString(), eventType, eventContent);
    }
  }

  async broadcastStatus(userId, status) {
    const chats = await Chat.find({ participants: userId }).lean();
    const notified = new Set();

    for (const chat of chats) {
      for (const participant of chat.participants) {
        if (participant !== userId && !notified.has(participant)) {
          this.sendPersonalMessage(
            participant.toString(),
            SocketEvents.STATUS_UPDATE,
            {
              user_id: userId,
              status,
            },
          );
          notified.add(participant);
        }
      }
    }
  }

  async broadcastTyping({ userId, chatId, isTyping }) {
    const chat = await Chat.findById(chatId).lean();

    if (!chat) return;
    for (const participant of chat.participants) {
      if (participant.toString() !== userId) {
        this.sendPersonalMessage(
          participant.toString(),
          SocketEvents.USER_TYPING,
          {
            chat_id: chatId,
            is_typing: isTyping,
          },
        );
      }
    }
  }

  async broadcastTopicTyping({ userId, clusterId, topicId, isTyping }) {
    const cluster = await Cluster.findById(clusterId).select("members").lean();

    if (!cluster) return;
    for (const member of cluster.members) {
      if (member.toString() !== userId) {
        this.sendPersonalMessage(
          member.toString(),
          SocketEvents.TOPIC_TYPING,
          {
            cluster_id: clusterId,
            topic_id: topicId,
            user_id: userId,
            is_typing: isTyping,
          },
        );
      }
    }
  }
}

const websocketManager = new ConnectionManager();

export default websocketManager;
