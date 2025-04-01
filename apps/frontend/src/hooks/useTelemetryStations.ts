import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '@/lib/config';
import { useRef } from 'react';

export interface TelemetryStation {
  id: number;
  station_id: string;
  station_name: string;
  hydro_id: string;
  data_source: string;
  latitude: number;
  longitude: number;
  last_sync: string;
  station_code: string;
  hydro_name: string;
  basin_id: string;
  basin_name: string;
  province_code: string;
  brae_level: number;
  q_max: number;
  use_msl: boolean;
  station_detail: string;
  zero_gauge: number;
  ground_level: number;
  created_at: string;
  updated_at: string;
}

interface TelemetryResponse {
  success: boolean;
  stations: TelemetryStation[];
  count: number;
  location: {
    amphure: string;
    province: string;
  };
}

// Cache for recent API responses to prevent duplicate fetches
const responseCache: Record<string, { data: TelemetryResponse; timestamp: number }> = {};
const CACHE_DURATION = 60 * 1000; // 1 minute

export function useTelemetryStations(amphure: string, province: string) {
  // Use a ref to track previous query parameters
  const prevParamsRef = useRef<string>('');
  
  // Create a stable key for caching
  const cacheKey = `${amphure}:${province}`;
  
  // Only log when params change to reduce console noise
  if (prevParamsRef.current !== cacheKey) {
    console.log('[useTelemetryStations] Parameters changed:', { amphure, province });
    prevParamsRef.current = cacheKey;
  }
  
  return useQuery({
    queryKey: ['telemetry-stations', amphure, province],
    queryFn: async (): Promise<TelemetryResponse> => {
      // Check memory cache first
      const cached = responseCache[cacheKey];
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('[useTelemetryStations] Using cached response for:', { amphure, province });
        return cached.data;
      }
      
      // Add a console.log before fetchTelemetryStations() is called
      console.log('[UI] Fetching telemetry stations', amphure, province);
      
      const url = new URL(`${API_BASE_URL}/api/telemetry/stations`);
      url.searchParams.append('amphure', encodeURIComponent(amphure));
      url.searchParams.append('province', encodeURIComponent(province));
      
      // Add a console.log for the API call URL
      console.log('[API CALL] ', url.toString());
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch stations');
      }
      
      const data = await response.json();
      
      // Cache successful responses
      responseCache[cacheKey] = {
        data,
        timestamp: Date.now()
      };
      
      return data;
    },
    enabled: !!amphure && !!province,
    // Keep data valid for 5 minutes, won't refetch during this time unless forced
    staleTime: 1000 * 60 * 5,
    // Keep in cache for 10 minutes after becoming unused
    gcTime: 1000 * 60 * 10,
    // Return previous data while new data is being fetched
    placeholderData: (previousData) => previousData,
    // Don't retry on failure to prevent performance issues
    retry: false
  });
} 