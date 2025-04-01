import { useQuery } from "@tanstack/react-query";
import { cleanLocationString } from "@/lib/location-utils";

export interface RainStation {
  id: string;
  name: string;
  name_th: string | null;
  latitude: number;
  longitude: number;
  station_type: string;
  data_source: string;
  province: string | null;
  amphure: string | null;
  tambon: string | null;
  rainfall?: {
    daily?: number;
    hourly?: number;
    tenMinutes?: number;
    threeHours?: number;
    timestamp?: string;
  };
  rainfall10m?: number | null;
  rainfall1h?: number | null;
  rainfall3h?: number | null;
  rainfall24h?: number | null;
  rainfall_today?: number | null;
  rainfall_date_calc?: string | null;
  rainfall_datetime?: string | null;
}

export interface RainStationsResponse {
  success: boolean;
  stations: RainStation[];
  total: number;
  meta?: {
    dataSource: string;
    province?: string;
    amphure?: string;
  };
  error?: string;
}

export const fetchRainStations = async (
  amphure?: string,
  province?: string,
  dataSource?: 'TMD' | 'HII' | 'ALL'
): Promise<RainStationsResponse> => {
  console.log(
    `[fetchRainStations] Attempting to fetch rain stations for:`,
    { amphure, province, dataSource }
  );
  
  // Clean location strings for API request
  const cleanedAmphure = cleanLocationString(amphure);
  const cleanedProvince = cleanLocationString(province);
  
  console.log(
    `[fetchRainStations] Using cleaned location values:`,
    { cleanedAmphure, cleanedProvince, dataSource }
  );

  try {
    // Construct URL with query parameters
    const url = new URL(`${import.meta.env.VITE_API_URL}/api/rain-stations`);
    
    if (cleanedAmphure) {
      url.searchParams.append("amphure", cleanedAmphure);
    }
    
    if (cleanedProvince) {
      url.searchParams.append("province", cleanedProvince);
    }

    if (dataSource && dataSource !== 'ALL') {
      url.searchParams.append("data_source", dataSource);
    }

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Failed to fetch rain stations: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Transform the rainfall data to match our interface
    const stationsWithFormattedRainfall = data.stations.map((station: any) => {
      // Preserve all original fields
      const formattedStation = {
        ...station,
        // Keep the original fields
        rainfall10m: station.rainfall10m,
        rainfall1h: station.rainfall1h,
        rainfall3h: station.rainfall3h,
        rainfall24h: station.rainfall24h,
        rainfall_today: station.rainfall_today,
        rainfall_date_calc: station.rainfall_date_calc,
        rainfall_datetime: station.rainfall_datetime,
        // Format the rainfall object for backward compatibility
        rainfall: {
          daily: station.rainfall_today || station.rainfall24h || 0,
          hourly: station.data_source === 'TMD' ? station.rainfall3h || 0 : station.rainfall1h || 0,
          tenMinutes: station.rainfall10m || 0,
          threeHours: station.rainfall3h || 0,
          timestamp: station.rainfall_datetime || new Date().toISOString(),
        }
      };
      
      return formattedStation;
    });

    console.log(
      `[fetchRainStations] Successfully fetched ${stationsWithFormattedRainfall.length} stations for:`,
      { cleanedAmphure, cleanedProvince, dataSource }
    );

    return {
      success: data.success,
      stations: stationsWithFormattedRainfall,
      total: data.total,
      meta: data.meta
    };
  } catch (error) {
    console.error("Error fetching rain stations:", error);
    return {
      success: false,
      stations: [],
      total: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const useRainStations = (
  amphure?: string, 
  province?: string,
  dataSource?: 'TMD' | 'HII' | 'ALL'
) => {
  return useQuery({
    queryKey: ["rainStations", cleanLocationString(amphure), cleanLocationString(province), dataSource],
    queryFn: () => fetchRainStations(amphure, province, dataSource),
    enabled: Boolean(amphure || province),
    retry: 2,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}; 