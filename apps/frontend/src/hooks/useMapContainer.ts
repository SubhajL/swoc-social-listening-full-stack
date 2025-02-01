import { useEffect, useRef, useState, useCallback } from 'react';
import { debounce } from '@/utils/debounce';

interface ContainerState {
  ready: boolean;
  retries: number;
  dimensions: { width: number; height: number } | null;
  error: Error | null;
}

interface UseMapContainerOptions {
  maxRetries?: number;
  retryInterval?: number;
  debounceDelay?: number;
}

export const useMapContainer = (options: UseMapContainerOptions = {}) => {
  const {
    maxRetries = 5,
    retryInterval = 200,
    debounceDelay = 100
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerState, setContainerState] = useState<ContainerState>({
    ready: false,
    retries: 0,
    dimensions: null,
    error: null
  });

  // Debounced dimension update
  const updateDimensions = useCallback(
    debounce(() => {
      if (!containerRef.current) return;

      const { width, height } = containerRef.current.getBoundingClientRect();
      setContainerState(prev => ({
        ...prev,
        dimensions: { width, height }
      }));
    }, debounceDelay),
    []
  );

  // Container initialization
  useEffect(() => {
    let mounted = true;
    let retryTimeout: NodeJS.Timeout;

    const checkContainer = () => {
      if (!mounted) return;

      const container = containerRef.current;
      
      if (container && container.offsetParent !== null) {
        setContainerState(prev => ({
          ...prev,
          ready: true,
          error: null
        }));
        updateDimensions();
        return;
      }

      if (containerState.retries >= maxRetries) {
        setContainerState(prev => ({
          ...prev,
          error: new Error('Failed to initialize map container after multiple attempts')
        }));
        return;
      }

      setContainerState(prev => ({
        ...prev,
        retries: prev.retries + 1
      }));

      retryTimeout = setTimeout(checkContainer, retryInterval);
    };

    checkContainer();

    return () => {
      mounted = false;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [containerState.retries, maxRetries, retryInterval, updateDimensions]);

  // Dimension tracking
  useEffect(() => {
    if (!containerState.ready || !containerRef.current) return;

    const observer = new ResizeObserver(updateDimensions);
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [containerState.ready, updateDimensions]);

  // Development logging
  if (process.env.NODE_ENV === 'development') {
    useEffect(() => {
      console.debug('[Map Container]:', {
        ready: containerState.ready,
        retries: containerState.retries,
        dimensions: containerState.dimensions,
        error: containerState.error
      });
    }, [containerState]);
  }

  return {
    containerRef,
    containerState,
    isReady: containerState.ready && !!containerState.dimensions,
    hasError: !!containerState.error,
    error: containerState.error
  };
}; 