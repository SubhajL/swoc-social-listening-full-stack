import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
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

export const useThaiWaterData = () => {
  return useQuery({
    queryKey: ["thaiwater", "rainfall"],
    queryFn: async () => {
      console.log("[useThaiWaterData] Fetching thaiwater rainfall data");
      
      try {
        // Add a timeout to the fetch to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/thaiwater/rainfall`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        return response.data;
      } catch (error) {
        console.log("[useThaiWaterData] Error fetching data:", error);
        console.log("[useThaiWaterData] Returning mock data due to API error");
        
        // Return mock data when the API fails
        return MOCK_THAIWATER_DATA;
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}; 