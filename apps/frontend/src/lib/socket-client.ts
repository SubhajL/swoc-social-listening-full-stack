import { io, Socket } from 'socket.io-client';
import type { ProcessedPost } from '@/types/processed-post';
import type { BatchProgress } from '@/types/batch-progress';
import { SOCKET_URL, SOCKET_RECONNECT_ATTEMPTS, SOCKET_RECONNECT_DELAY, SOCKET_TIMEOUT } from './config';

// Add enhanced debug logging
console.log('Socket configuration:', {
  SOCKET_URL,
  SOCKET_RECONNECT_ATTEMPTS,
  SOCKET_RECONNECT_DELAY,
  SOCKET_TIMEOUT,
  DEV: import.meta.env.DEV
});

let socket: Socket | null = null;
let connectionAttempts = 0;
let isConnecting = false;

export const initializeSocket = () => {
  // Prevent multiple simultaneous connection attempts
  if (isConnecting) {
    console.log('[Socket] Connection attempt already in progress');
    return null;
  }

  // Return existing socket if it's connected
  if (socket && socket.connected) {
    console.log('[Socket] Socket already initialized and connected');
    return socket;
  }

  // Clear existing socket if it exists but isn't connected
  if (socket) {
    try {
      socket.disconnect();
      socket = null;
    } catch (error) {
      console.error('[Socket] Error cleaning up existing socket:', error);
    }
  }

  isConnecting = true;
  connectionAttempts++;

  console.log('[Socket] Initializing socket connection to:', SOCKET_URL);
  console.log('[Socket] Connection attempt:', connectionAttempts);

  try {
    // Create socket with simplified configuration for working through Vite's proxy
    socket = io({
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: SOCKET_RECONNECT_ATTEMPTS,
      reconnectionDelay: SOCKET_RECONNECT_DELAY,
      timeout: SOCKET_TIMEOUT,
      autoConnect: true
    });

    // Set up connection timeout
    const connectionTimeout = setTimeout(() => {
      if (socket && !socket.connected) {
        console.error('[Socket] Connection timeout after', SOCKET_TIMEOUT, 'ms');
        socket.disconnect();
        isConnecting = false;
      }
    }, SOCKET_TIMEOUT);

    socket.on('connect', () => {
      console.log('[Socket] Connected successfully with ID:', socket?.id);
      clearTimeout(connectionTimeout);
      connectionAttempts = 0;
      isConnecting = false;
      
      if (socket) {
        socket.emit('subscribe:posts');
      }
    });

    socket.on('connect_error', (error) => {
      console.warn('[Socket] Connection error:', {
        error: error.message,
        timestamp: new Date().toISOString(),
        attempt: connectionAttempts,
        url: SOCKET_URL
      });
      
      clearTimeout(connectionTimeout);
      isConnecting = false;
      
      // Only try to reconnect if within max attempts
      if (connectionAttempts >= SOCKET_RECONNECT_ATTEMPTS) {
        console.error('[Socket] Max reconnection attempts reached');
        socket?.disconnect();
      }
    });

    socket.on('disconnect', (reason) => {
      console.warn('[Socket] Disconnected:', {
        reason,
        timestamp: new Date().toISOString()
      });
      
      isConnecting = false;
    });

    socket.on('error', (error) => {
      console.error('[Socket] Error event:', error);
      isConnecting = false;
    });

    return socket;
  } catch (error) {
    console.error('[Socket] Error initializing socket:', error);
    isConnecting = false;
    return null;
  }
};

export const getSocket = () => {
  if (!socket || !socket.connected) {
    return initializeSocket();
  }
  return socket;
};

export const closeSocket = () => {
  if (socket) {
    try {
      socket.emit('unsubscribe:posts');
      socket.close();
    } catch (error) {
      console.error('[Socket] Error closing socket:', error);
    } finally {
      socket = null;
      console.log('[Socket] Connection closed');
    }
  }
};

export class SocketClient {
  private static instance: SocketClient;
  private socket: Socket | null = null;
  private isConnected: boolean = false;

  private constructor() {
    try {
      // Initialize socket connection
      this.socket = getSocket();
      
      if (this.socket) {
        this.setupListeners();
        this.isConnected = this.socket.connected;
      } else {
        console.error('[SocketClient] Failed to initialize socket connection');
      }
    } catch (error) {
      console.error('[SocketClient] Error during initialization:', error);
    }
  }

  static getInstance(): SocketClient {
    if (!SocketClient.instance) {
      SocketClient.instance = new SocketClient();
    }
    return SocketClient.instance;
  }

  private setupListeners() {
    if (!this.socket) {
      console.warn('[SocketClient] Cannot setup listeners: socket is null');
      return;
    }

    this.socket.on('connect', () => {
      console.log('[SocketClient] Socket connected with ID:', this.socket?.id);
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('[SocketClient] Socket disconnected');
      this.isConnected = false;
    });

    this.socket.on('post:update', (post: ProcessedPost) => {
      // Handle post update
      console.log('[SocketClient] Received post update');
    });

    this.socket.on('batch:progress', (progress: BatchProgress) => {
      // Handle batch progress
      console.log('[SocketClient] Received batch progress update');
    });
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  onPostUpdate(callback: (post: ProcessedPost) => void) {
    if (!this.socket) {
      console.warn('[SocketClient] Cannot register onPostUpdate: socket is null');
      return () => {}; // Return no-op function
    }
    
    try {
      this.socket.on('post:update', callback);
      return () => {
        if (this.socket) {
          this.socket.off('post:update', callback);
        }
      };
    } catch (error) {
      console.error('[SocketClient] Error registering post update callback:', error);
      return () => {}; // Return no-op function
    }
  }

  onBatchProgress(callback: (progress: BatchProgress) => void) {
    if (!this.socket) {
      console.warn('[SocketClient] Cannot register onBatchProgress: socket is null');
      return () => {}; // Return no-op function
    }
    
    try {
      this.socket.on('batch:progress', callback);
      return () => {
        if (this.socket) {
          this.socket.off('batch:progress', callback);
        }
      };
    } catch (error) {
      console.error('[SocketClient] Error registering batch progress callback:', error);
      return () => {}; // Return no-op function
    }
  }

  disconnect() {
    if (this.socket) {
      try {
        this.socket.disconnect();
      } catch (error) {
        console.error('[SocketClient] Error disconnecting socket:', error);
      } finally {
        console.log('[SocketClient] Disconnected socket');
        this.isConnected = false;
      }
    }
  }
} 