import { WebSocketService } from '../services/core';
import type { ProcessedPost } from '@/types/processed-post';
import type { BatchProgress } from '@/types/batch-progress';

// Add debug logging
console.log('Socket environment:', {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  DEV: import.meta.env.DEV
});

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const wsService = WebSocketService.getInstance({
  debug: import.meta.env.DEV
});

export const socketClient = {
  connect: () => {
    wsService.connect();
  },

  disconnect: () => {
    wsService.disconnect();
  },

  onPostUpdate: (callback: (post: ProcessedPost) => void) => {
    return wsService.subscribe('post:update', callback);
  },

  onBatchProgress: (callback: (progress: BatchProgress) => void) => {
    return wsService.subscribe('batch:progress', callback);
  },

  emit: (event: string, data?: any) => {
    wsService.emit(event, data);
  },

  isConnected: () => {
    return wsService.isConnected();
  }
};

export class SocketClient {
  private socket: WebSocket;
  private static instance: SocketClient;

  private constructor() {
    console.log('Initializing socket connection to:', SOCKET_URL);
    this.socket = new WebSocket(SOCKET_URL);
    this.setupListeners();
  }

  static getInstance(): SocketClient {
    if (!SocketClient.instance) {
      SocketClient.instance = new SocketClient();
    }
    return SocketClient.instance;
  }

  private setupListeners() {
    this.socket.onopen = () => {
      console.log('Connected to WebSocket server');
      this.socket.send('subscribe:posts');
    };

    this.socket.onclose = () => {
      console.log('Disconnected from WebSocket server');
    };

    this.socket.onerror = (event) => {
      console.error('WebSocket error:', event);
    };
  }

  onPostUpdate(callback: (post: ProcessedPost) => void) {
    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      callback(data);
    };
    return () => {
      this.socket.onmessage = null;
    };
  }

  onBatchProgress(callback: (progress: BatchProgress) => void) {
    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      callback(data);
    };
    return () => {
      this.socket.onmessage = null;
    };
  }

  disconnect() {
    this.socket.close();
  }
} 