import { io, Socket } from 'socket.io-client';
import { ConnectionManager } from './ConnectionManager';

export interface WebSocketConfig {
  autoReconnect: boolean;
  reconnectAttempts: number;
  reconnectDelay: number;
  debug: boolean;
}

export class WebSocketService {
  private static instance: WebSocketService;
  private socket: Socket | null = null;
  private connectionManager: ConnectionManager;
  private config: WebSocketConfig;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private subscriptions: Map<string, Set<(data: any) => void>> = new Map();

  private constructor(config: Partial<WebSocketConfig> = {}) {
    this.connectionManager = ConnectionManager.getInstance();
    this.config = {
      autoReconnect: true,
      reconnectAttempts: 5,
      reconnectDelay: 2000,
      debug: import.meta.env.DEV,
      ...config
    };
  }

  static getInstance(config?: Partial<WebSocketConfig>): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService(config);
    }
    return WebSocketService.instance;
  }

  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[WebSocket]', ...args);
    }
  }

  private setupSocket(): void {
    if (this.socket) {
      this.log('Socket already exists');
      return;
    }

    const url = this.connectionManager.getBaseUrl();
    this.log('Initializing socket connection to:', url);

    this.socket = io(url, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: false // We'll handle reconnection ourselves
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.log('Connected to WebSocket server');
      this.reconnectAttempts = 0;
      this.resubscribeAll();
    });

    this.socket.on('disconnect', () => {
      this.log('Disconnected from WebSocket server');
      if (this.config.autoReconnect) {
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      this.log('Connection error:', error);
      if (this.config.autoReconnect) {
        this.scheduleReconnect();
      }
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts >= this.config.reconnectAttempts) {
      this.log('Max reconnection attempts reached');
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.log(`Reconnection attempt ${this.reconnectAttempts}/${this.config.reconnectAttempts}`);
      this.connect();
    }, this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts));
  }

  private resubscribeAll(): void {
    this.subscriptions.forEach((callbacks, event) => {
      this.socket?.emit(`subscribe:${event}`);
    });
  }

  connect(): void {
    if (!this.socket) {
      this.setupSocket();
    } else if (!this.socket.connected) {
      this.socket.connect();
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.subscriptions.forEach((_, event) => {
        this.socket?.emit(`unsubscribe:${event}`);
      });
      this.socket.disconnect();
      this.socket = null;
    }

    this.reconnectAttempts = 0;
  }

  subscribe<T>(event: string, callback: (data: T) => void): () => void {
    if (!this.socket) {
      this.connect();
    }

    if (!this.subscriptions.has(event)) {
      this.subscriptions.set(event, new Set());
      this.socket?.emit(`subscribe:${event}`);
    }

    this.subscriptions.get(event)?.add(callback);
    this.socket?.on(event, callback);

    return () => {
      this.unsubscribe(event, callback);
    };
  }

  unsubscribe(event: string, callback: (data: any) => void): void {
    this.socket?.off(event, callback);
    this.subscriptions.get(event)?.delete(callback);

    if (this.subscriptions.get(event)?.size === 0) {
      this.subscriptions.delete(event);
      this.socket?.emit(`unsubscribe:${event}`);
    }
  }

  emit(event: string, data?: any): void {
    if (!this.socket?.connected) {
      this.log('Socket not connected, connecting...');
      this.connect();
    }

    this.socket?.emit(event, data);
  }

  isConnected(): boolean {
    return !!this.socket?.connected;
  }
} 