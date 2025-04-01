import { useState, useCallback, useRef } from 'react';
import { useTelemetryStations, TelemetryStation } from './useTelemetryStations';

interface TelemetryResponse {
  success: boolean;
  stations: TelemetryStation[];
  count: number;
  location: {
    amphure: string;
    province: string;
  };
}

interface UseTelemetryDataResult {
  data: TelemetryResponse | undefined;
  stations: TelemetryStation[];
  isLoading: boolean;
  isRefreshing: boolean;
  hasStations: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Enhanced hook for telemetry data
 * Only refreshes data when explicitly requested
 * @param amphure The amphure (district) name
 * @param province The province name
 * @returns Telemetry data with refresh capability
 */
export function useTelemetryData(amphure: string, province: string): UseTelemetryDataResult {
  // Use refs to avoid re-renders during background refreshes
  const refreshingRef = useRef(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Use the base telemetry stations hook
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useTelemetryStations(amphure, province);
  
  // Extract stations with fallback to empty array
  const stations = data?.stations || [];
  const hasStations = stations.length > 0;
  
  // Wrap refetch to handle loading state
  const handleRefetch = useCallback(async () => {
    // Prevent concurrent refreshes
    if (refreshingRef.current) return;
    
    refreshingRef.current = true;
    setIsRefreshing(true);
    
    try {
      await refetch();
    } catch (refreshError) {
      console.error("[useTelemetryData] Refetch failed:", refreshError);
    } finally {
      setIsRefreshing(false);
      refreshingRef.current = false;
    }
  }, [refetch]);
  
  return {
    data,
    stations,
    isLoading,
    isRefreshing,
    hasStations,
    error: error as Error | null,
    refetch: handleRefetch
  };
} 