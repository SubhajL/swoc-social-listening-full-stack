import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import type { ThaiWaterResponse } from '../types/api';

interface ThaiWaterParams {
  province?: string;
  amphoe?: string;
  date?: string;
  min_rainfall?: number;
  data_source?: 'HII' | 'TMD' | 'ALL';
  disableAutoRefetch?: boolean; // New parameter to disable auto-refetching
}

export const useThaiWaterData = (params?: ThaiWaterParams) => {
  // Determine if auto-refetching should be disabled
  const shouldDisableAutoRefetch = params?.disableAutoRefetch === true;
  
  return useQuery({
    queryKey: ["thaiwater", "rainfall", params],
    queryFn: async () => {
      console.log("[useThaiWaterData] Fetching thaiwater rainfall data with params:", params);
      
      try {
        // Add a timeout to the fetch to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const endpoint = `${import.meta.env.VITE_API_URL}/api/thaiwater/rainfall`;
        
        // Validate required parameters
        if (!params?.province && !params?.amphoe) {
          console.warn('[useThaiWaterData] Missing required parameters: province or amphoe');
          throw new Error('Missing required parameters: province or amphoe');
        }
        
        // Don't include the disableAutoRefetch param in the API request
        const { disableAutoRefetch, ...apiParams } = params;
        
        // Include data_source in the API request
        const requestParams = {
          ...apiParams,
          data_source: apiParams.data_source || 'ALL' // Default to ALL if not specified
        };
        
        const response = await axios.get(endpoint, {
          params: requestParams,
          signal: controller.signal,
          timeout: 10000 // 10 second timeout
        });
        
        clearTimeout(timeoutId);
        
        // Validate response data
        if (!response.data || !response.data.data) {
          console.warn('[useThaiWaterData] Invalid response data format:', response.data);
          throw new Error('Invalid response data format');
        }
        
        console.log('[useThaiWaterData] Successfully fetched data:', {
          count: response.data.data.length,
          params: requestParams,
          dataSource: requestParams.data_source
        });
        
        return response.data;
      } catch (error) {
        // Handle different types of errors
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError;
          
          if (axiosError.code === 'ECONNABORTED' || axiosError.message.includes('timeout')) {
            console.error('[useThaiWaterData] Request timeout:', axiosError.message);
            throw new Error('Request timeout. Please try again later.');
          }
          
          if (axiosError.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error('[useThaiWaterData] Server error:', {
              status: axiosError.response.status,
              data: axiosError.response.data,
              params: params
            });
            
            if (axiosError.response.status === 400) {
              throw new Error('Invalid request parameters. Please check your inputs.');
            } else if (axiosError.response.status === 404) {
              throw new Error('Rainfall data not found for the specified parameters.');
            } else if (axiosError.response.status === 500) {
              console.error('[useThaiWaterData] Server error');
              throw new Error('Server error. Please try again later.');
            }
          } else if (axiosError.request) {
            // The request was made but no response was received
            console.error('[useThaiWaterData] No response received:', axiosError.request);
            throw new Error('No response received from server. Please check your connection.');
          }
        }
        
        // Generic error handling
        console.error('[useThaiWaterData] Unexpected error:', error);
        throw new Error('Failed to fetch rainfall data. Please try again later.');
      }
    },
    retry: (failureCount, error) => {
      // Only retry for network errors or 5xx errors, not for 4xx errors
      if (error instanceof Error) {
        if (error.message.includes('Invalid request parameters') || 
            error.message.includes('Rainfall data not found')) {
          return false; // Don't retry for 4xx errors
        }
      }
      return failureCount < 2; // Retry up to 2 times for other errors
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    // Disable refetch interval when requested
    refetchInterval: shouldDisableAutoRefetch ? undefined : 5 * 60 * 1000, // 5 minutes by default, undefined if disabled
    refetchIntervalInBackground: !shouldDisableAutoRefetch,
  });
}; 