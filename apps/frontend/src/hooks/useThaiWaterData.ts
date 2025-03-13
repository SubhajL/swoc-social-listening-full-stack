import { useQuery } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import type { ThaiWaterResponse } from '../types/api';

// Mock data for when the API fails
const MOCK_THAIWATER_DATA = {
  success: true,
  data: [
    {
      tele_station_id: 1109570,
      rainfall_24h: 3.5,
      rainfall_today: 1.2,
      rainfall_yesterday: 2.3,
      rainfall_7day: 15.8,
      rainfall_month: 45.2,
      rainfall_year: 320.5,
      station_name: "สถานีวัดน้ำฝน สชป.1",
      station_lat: 18.7890,
      station_long: 98.9876,
      agency_id: 9,
      agency_name: "กรมชลประทาน",
      province_code: "50",
      province_name: "เชียงใหม่",
      amphoe_code: "5009",
      amphoe_name: "แม่แตง",
      tumbon_code: "500902",
      tumbon_name: "แม่แตง",
      data_date: "2023-07-15",
      data_time: "08:00"
    },
    {
      tele_station_id: 494,
      rainfall_24h: 10.2,
      rainfall_today: 4.5,
      rainfall_yesterday: 5.7,
      rainfall_7day: 28.3,
      rainfall_month: 62.1,
      rainfall_year: 415.8,
      station_name: "สถานีวัดน้ำฝนอุตุสนามบิน",
      station_lat: 18.8123,
      station_long: 98.9654,
      agency_id: 8,
      agency_name: "กรมอุตุนิยมวิทยา",
      province_code: "50",
      province_name: "เชียงใหม่",
      amphoe_code: "5009",
      amphoe_name: "แม่แตง",
      tumbon_code: "500901",
      tumbon_name: "สันมหาพน",
      data_date: "2023-07-15",
      data_time: "08:00"
    }
  ]
};

interface ThaiWaterParams {
  province?: string;
  amphoe?: string;
  date?: string;
  min_rainfall?: number;
}

export const useThaiWaterData = (params?: ThaiWaterParams) => {
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
        
        const response = await axios.get(endpoint, {
          params: params,
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
          params: params
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
              console.warn('[useThaiWaterData] Server error, falling back to mock data');
              return MOCK_THAIWATER_DATA;
            }
          } else if (axiosError.request) {
            // The request was made but no response was received
            console.error('[useThaiWaterData] No response received:', axiosError.request);
            throw new Error('No response received from server. Please check your connection.');
          }
        }
        
        // Generic error handling
        console.error('[useThaiWaterData] Unexpected error:', error);
        console.warn('[useThaiWaterData] Falling back to mock data due to error');
        return MOCK_THAIWATER_DATA; // Explicit fallback
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
  });
}; 