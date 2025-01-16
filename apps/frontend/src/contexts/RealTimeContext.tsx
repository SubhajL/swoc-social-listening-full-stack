import React, { createContext, useContext, useEffect, useState } from 'react';
import { SocketClient } from '@/lib/socket-client';
import type { ProcessedPost } from '@/types/processed-post';
import type { BatchProgress } from '@/types/batch-progress';

interface RealTimeContextType {
  latestPost?: ProcessedPost;
  batchProgress?: BatchProgress;
}

const RealTimeContext = createContext<RealTimeContextType>({});

export function RealTimeProvider({ children }: { children: React.ReactNode }) {
  const [latestPost, setLatestPost] = useState<ProcessedPost>();
  const [batchProgress, setBatchProgress] = useState<BatchProgress>();

  useEffect(() => {
    const socket = SocketClient.getInstance();

    const unsubPost = socket.onPostUpdate((post) => {
      setLatestPost(post);
    });

    const unsubBatch = socket.onBatchProgress((progress) => {
      setBatchProgress(progress);
    });

    return () => {
      unsubPost();
      unsubBatch();
      socket.disconnect();
    };
  }, []);

  return (
    <RealTimeContext.Provider value={{ latestPost, batchProgress }}>
      {children}
    </RealTimeContext.Provider>
  );
}

export const useRealTime = () => useContext(RealTimeContext); 