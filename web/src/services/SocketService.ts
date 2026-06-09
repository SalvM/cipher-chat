import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect = (url: string, token: string): Socket => {
    if (this.socket?.connected) return this.socket;

    this.socket = io(url, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    return this.socket;
  };

  disconnect = () => {
    this.socket?.disconnect();
    this.socket = null;
  };

  get instance(): Socket | null {
    return this.socket;
  }

  emit = (event: string, data?: unknown) => {
    this.socket?.emit(event, data);
  };

  sendTyping = (chatId: string, isTyping: boolean) => {
    this.emit('user_typing', { chatId, isTyping });
  };

  clusterTyping = (clusterId: string, topicId: string, isTyping: boolean) => {
    this.emit('topic_typing', { clusterId, topicId, isTyping });
  };
}

export const socketService = new SocketService();
