import { useQuery } from "@tanstack/react-query";
import { MonitoringStationResponse } from "@/types/monitoring-station";
import { API_ENDPOINTS, buildUrl, createApiError } from "@/lib/api";

const fetchMonitoringStations = async (
  amphure?: string,
  province?: string
): Promise<MonitoringStationResponse> => {
  // Log the request attempt
  console.info("[useMonitoringStations] Fetching stations", {
    amphure,
    province,
    url: buildUrl(API_ENDPOINTS.MONITORING_STATIONS, { amphure, province }),
    timestamp: new Date().toISOString()
  });

  try {
    const response = await fetch(
      buildUrl(API_ENDPOINTS.MONITORING_STATIONS, { amphure, province })
    );
    
    if (!response.ok) {
      console.error("[useMonitoringStations] API request failed", {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        timestamp: new Date().toISOString()
      });
      throw createApiError(`Failed to fetch monitoring stations: ${response.statusText}`, response);
    }
    
    const data = await response.json();
    console.info("[useMonitoringStations] Data received", {
      totalStations: data.total,
      timestamp: new Date().toISOString()
    });
    return data;
  } catch (error) {
    console.error("[useMonitoringStations] Error fetching data", {
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

export const useMonitoringStations = (amphure?: string, province?: string) => {
  return useQuery({
    queryKey: ["monitoring-stations", amphure, province],
    queryFn: () => fetchMonitoringStations(amphure, province),
    enabled: !!(amphure || province),
    retry: 2,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
  });
}; 