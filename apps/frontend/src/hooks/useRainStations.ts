import { useQuery } from "@tanstack/react-query";
import { cleanLocationString } from "@/lib/location-utils";

export interface RainStation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  rainfall?: {
    daily?: number;
    hourly?: number;
    timestamp?: string;
  };
}

export interface RainStationsResponse {
  stations: RainStation[];
  error?: string;
}

export const fetchRainStations = async (
  amphure?: string,
  province?: string
): Promise<RainStationsResponse> => {
  console.log(
    `[fetchRainStations] Attempting to fetch rain stations for:`,
    { amphure, province }
  );
  
  // Clean location strings for API request
  const cleanedAmphure = cleanLocationString(amphure);
  const cleanedProvince = cleanLocationString(province);
  
  console.log(
    `[fetchRainStations] Using cleaned location values:`,
    { cleanedAmphure, cleanedProvince }
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

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Failed to fetch rain stations: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Fetch rainfall data for each station
    const stationsWithRainfall = await Promise.all(
      data.stations.map(async (station: RainStation) => {
        try {
          const rainfallUrl = new URL(
            `${import.meta.env.VITE_API_URL}/api/rainfall/${station.id}`
          );
          
          // Use fetch with { method: 'HEAD' } first to check if the endpoint exists
          // This avoids the 404 errors in the console
          const checkResponse = await fetch(rainfallUrl.toString(), { method: 'HEAD' })
            .catch(() => ({ ok: false, status: 404 }));
          
          // Only proceed with actual fetch if the endpoint exists
          if (checkResponse.ok) {
            const rainfallResponse = await fetch(rainfallUrl.toString());
            
            if (rainfallResponse.ok) {
              const rainfallData = await rainfallResponse.json();
              return {
                ...station,
                rainfall: rainfallData,
              };
            }
          }
          
          // If API returns 404 or HEAD check failed, provide default rainfall data
          return {
            ...station,
            rainfall: {
              daily: 0,
              hourly: 0,
              timestamp: new Date().toISOString(),
            },
          };
        } catch (error) {
          // Only log error once per station to reduce console spam
          console.error(`Error fetching rainfall for station ${station.id}:`, error);
          
          // Return station with default rainfall data
          return {
            ...station,
            rainfall: {
              daily: 0,
              hourly: 0,
              timestamp: new Date().toISOString(),
            },
          };
        }
      })
    );

    console.log(
      `[fetchRainStations] Successfully fetched ${stationsWithRainfall.length} stations for:`,
      { cleanedAmphure, cleanedProvince }
    );

    return {
      stations: stationsWithRainfall,
    };
  } catch (error) {
    console.error("Error fetching rain stations:", error);
    return {
      stations: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const useRainStations = (amphure?: string, province?: string) => {
  return useQuery({
    queryKey: ["rainStations", cleanLocationString(amphure), cleanLocationString(province)],
    queryFn: () => fetchRainStations(amphure, province),
    enabled: Boolean(amphure || province),
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}; 