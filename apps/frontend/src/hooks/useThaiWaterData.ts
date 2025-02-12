import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type { ThaiWaterResponse, ThaiWaterStationData } from '../types/api';

// Use the main API URL for Thaiwater endpoints
const THAIWATER_API_URL = `${import.meta.env.VITE_API_URL}/thaiwater/rainfall`;

export function useThaiWaterData() {
  return useQuery<ThaiWaterResponse>({
    queryKey: ['thaiwater', 'rainfall'],
    queryFn: async () => {
      console.log('[useThaiWaterData] Fetching data from:', THAIWATER_API_URL);
      
      try {
        const { data } = await axios.get<ThaiWaterResponse>(THAIWATER_API_URL);
        
        console.log('[useThaiWaterData] Response received:', {
          success: data.success,
          dataCount: data.data?.length || 0,
          debug: data.debug,
          firstItem: data.data?.[0]
        });
        
        return data;
      } catch (error) {
        console.error('[useThaiWaterData] Error fetching data:', {
          error: error instanceof Error ? error.message : String(error),
          url: THAIWATER_API_URL
        });
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
} 