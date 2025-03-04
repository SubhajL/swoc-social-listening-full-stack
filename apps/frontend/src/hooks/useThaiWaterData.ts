import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/api-client';
import type { ThaiWaterResponse } from '../types/api';

// Mock data to use when the API is not available
const MOCK_THAIWATER_RESPONSE: ThaiWaterResponse = {
  success: true,
  data: [],
  debug: { mock: true, reason: 'API endpoint not available' }
};

export function useThaiWaterData() {
  return useQuery<ThaiWaterResponse>({
    queryKey: ['thaiwater', 'rainfall'],
    queryFn: async () => {
      console.log('[useThaiWaterData] Fetching thaiwater rainfall data');
      
      try {
        const { data } = await axiosInstance.get<ThaiWaterResponse>('/thaiwater/rainfall');
        
        console.log('[useThaiWaterData] Response received:', {
          success: data.success,
          dataCount: data.data?.length || 0,
          debug: data.debug,
          firstItem: data.data?.[0]
        });
        
        return data;
      } catch (error) {
        console.error('[useThaiWaterData] Error fetching data:', {
          error: error instanceof Error ? error.message : String(error)
        });
        
        // Return mock data instead of throwing an error
        console.log('[useThaiWaterData] Returning mock data due to API error');
        return MOCK_THAIWATER_RESPONSE;
      }
    },
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    retry: 1, // Only retry once to avoid excessive failed requests
  });
} 