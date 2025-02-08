import { useQuery } from "@tanstack/react-query";
import { RainStationResponse } from "@/types/rain-station";
import { API_ENDPOINTS, buildUrl, createApiError } from "@/lib/api";

const fetchRainStations = async (
  amphure?: string,
  province?: string
): Promise<RainStationResponse> => {
  // Log the request attempt
  console.info("[useRainStations] Fetching stations", {
    amphure,
    province,
    url: buildUrl(API_ENDPOINTS.RAIN_STATIONS, { amphure, province }),
    timestamp: new Date().toISOString()
  });

  try {
    const response = await fetch(
      buildUrl(API_ENDPOINTS.RAIN_STATIONS, { amphure, province })
    );
    
    if (!response.ok) {
      console.error("[useRainStations] API request failed", {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        timestamp: new Date().toISOString()
      });
      throw createApiError(`Failed to fetch rain stations: ${response.statusText}`, response);
    }
    
    const data = await response.json();
    console.info("[useRainStations] Data received", {
      totalStations: data.total,
      timestamp: new Date().toISOString()
    });
    return data;
  } catch (error) {
    console.error("[useRainStations] Error fetching data", {
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

export const useRainStations = (amphure?: string, province?: string) => {
  return useQuery({
    queryKey: ['rainStations', amphure, province],
    queryFn: () => fetchRainStations(amphure, province),
    enabled: Boolean(amphure || province),
  });
}; 