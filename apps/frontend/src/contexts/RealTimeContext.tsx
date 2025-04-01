import React, { createContext, useContext, useEffect, useState } from 'react';
import { SocketClient } from '@/lib/socket-client';
import type { ProcessedPost } from '@/types/processed-post';
import type { BatchProgress } from '@/types/batch-progress';

interface RealTimeContextType {
  latestPost?: ProcessedPost;
  batchProgress?: BatchProgress;
  isConnected: boolean;
  connectionError?: string;
}

const RealTimeContext = createContext<RealTimeContextType>({
  isConnected: false
});

export function RealTimeProvider({ children }: { children: React.ReactNode }) {
  const [latestPost, setLatestPost] = useState<ProcessedPost>();
  const [batchProgress, setBatchProgress] = useState<BatchProgress>();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string>();
  const [socketClient, setSocketClient] = useState<SocketClient | null>(null);

  useEffect(() => {
    try {
      // Attempt to get SocketClient instance
      const socket = SocketClient.getInstance();
      setSocketClient(socket);

      // Try to register callbacks - these will be no-ops if socket is null
      const unsubPost = socket.onPostUpdate((post) => {
        setIsConnected(true); // If we're receiving updates, we must be connected
        setLatestPost(post);
      });

      const unsubBatch = socket.onBatchProgress((progress) => {
        setIsConnected(true);
        setBatchProgress(progress);
      });

      // Return cleanup function
      return () => {
        unsubPost();
        unsubBatch();
        if (socket) {
          socket.disconnect();
        }
      };
    } catch (error) {
      console.error('[RealTimeProvider] Error initializing socket:', error);
      setConnectionError(error instanceof Error ? error.message : 'Unknown socket connection error');
      return () => {
        // No cleanup needed if socket initialization failed
      };
    }
  }, []);

  return (
    <RealTimeContext.Provider 
      value={{ 
        latestPost, 
        batchProgress, 
        isConnected, 
        connectionError 
      }}
    >
      {children}
    </RealTimeContext.Provider>
  );
}

export const useRealTime = () => useContext(RealTimeContext); 