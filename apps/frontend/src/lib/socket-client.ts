import { io, Socket } from 'socket.io-client';
import type { ProcessedPostDTO } from '@/types/processed-post';
import type { BatchProgress } from '@/types/batch-progress';

// Add debug logging
console.log('Socket environment:', {
  VITE_WS_URL: import.meta.env.VITE_WS_URL,
  DEV: import.meta.env.DEV
});

const SOCKET_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

export class SocketClient {
  private socket: Socket;
  private static instance: SocketClient;

  private constructor() {
    this.socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });
    this.setupListeners();
  }

  static getInstance(): SocketClient {
    if (!SocketClient.instance) {
      SocketClient.instance = new SocketClient();
    }
    return SocketClient.instance;
  }

  private setupListeners() {
    this.socket.on('connect', () => {
      console.log('Connected to WebSocket');
      this.socket.emit('subscribe:posts');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
    });
  }

  onPostUpdate(callback: (post: ProcessedPostDTO) => void) {
    this.socket.on('post:update', callback);
    return () => this.socket.off('post:update', callback);
  }

  onBatchProgress(callback: (progress: BatchProgress) => void) {
    this.socket.on('batch:progress', callback);
    return () => this.socket.off('batch:progress', callback);
  }

  disconnect() {
    this.socket.emit('unsubscribe:posts');
    this.socket.disconnect();
  }
} 