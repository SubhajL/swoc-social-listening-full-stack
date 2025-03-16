import { useQuery } from "@tanstack/react-query";
import { MonitoringStationResponse, MonitoringStation } from "@/types/monitoring-station";
import { cleanLocationString } from "@/lib/location-utils";
import { useState, useEffect } from "react";

export interface MonitoringStationsResponse {
  stations: MonitoringStation[];
  error?: string;
}

// Cache for telemetry data to reduce API calls
const telemetryCache: Record<string, { data: any; timestamp: number }> = {};
const TELEMETRY_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

/**
 * Fetches telemetry data for a station with caching
 */
async function fetchTelemetryData(stationId: string): Promise<any> {
  try {
    // Check cache first
    const cacheKey = `telemetry:${stationId}`;
    const cachedData = telemetryCache[cacheKey];
    
    if (cachedData && (Date.now() - cachedData.timestamp) < TELEMETRY_CACHE_TTL) {
      console.log(`[fetchTelemetryData] Using cached telemetry data for station ${stationId}`);
      return cachedData.data;
    }
    
    // Fetch fresh data
    console.log(`[fetchTelemetryData] Fetching telemetry data for station ${stationId}`);
    const telemetryUrl = `${import.meta.env.VITE_API_URL}/api/telemetry/${stationId}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    
    try {
      const telemetryResponse = await fetch(telemetryUrl, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (telemetryResponse.ok) {
        const telemetryData = await telemetryResponse.json();
        
        // Cache the successful response
        telemetryCache[cacheKey] = {
          data: telemetryData,
          timestamp: Date.now()
        };
        
        return telemetryData;
      }
      
      // Handle error responses
      console.error(`[fetchTelemetryData] Error fetching telemetry for station ${stationId}:`, {
        status: telemetryResponse.status,
        statusText: telemetryResponse.statusText
      });
      
      return null;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.warn(`[fetchTelemetryData] Telemetry request timed out for station ${stationId}`);
      } else {
        console.error(`[fetchTelemetryData] Error fetching telemetry for station ${stationId}:`, fetchError);
      }
      
      return null;
    }
  } catch (error) {
    console.error(`[fetchTelemetryData] Unexpected error for station ${stationId}:`, error);
    return null;
  }
}

/**
 * Fetches monitoring stations and their telemetry data
 */
export const fetchMonitoringStations = async (
  amphure?: string,
  province?: string
): Promise<MonitoringStationsResponse> => {
  try {
    console.log(
      `[fetchMonitoringStations] Fetching monitoring stations for:`,
      { amphure, province }
    );
    
    // Clean location strings for API request
    const cleanedAmphure = cleanLocationString(amphure);
    const cleanedProvince = cleanLocationString(province);
    
    // Construct URL with query parameters
    const url = new URL(`${import.meta.env.VITE_API_URL}/api/monitoring-stations`);
    
    if (cleanedAmphure) {
      url.searchParams.append("amphure", cleanedAmphure);
    }
    
    if (cleanedProvince) {
      url.searchParams.append("province", cleanedProvince);
    }

    // Fetch monitoring stations with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(url.toString(), {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch monitoring stations: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Fetch telemetry data for each station in parallel
      const stationsWithTelemetry = await Promise.all(
        data.stations.map(async (station: MonitoringStation) => {
          try {
            // Fetch telemetry data with caching
            const telemetryData = await fetchTelemetryData(String(station.id));
            
            if (telemetryData && telemetryData.data) {
              return {
                ...station,
                telemetry_data: {
                  water_level: telemetryData.data.wlvalues || station.water_level || 0,
                  flow_rate: telemetryData.data.qvalues || station.flow_rate || 0,
                  timestamp: telemetryData.data.hourlytime || new Date().toISOString(),
                  notation: telemetryData.data.notationstring || ""
                }
              };
            }
            
            // Fallback if telemetry fetch fails
            return {
              ...station,
              telemetry_data: {
                water_level: station.water_level || 0,
                flow_rate: station.flow_rate || 0,
                timestamp: new Date().toISOString(),
                notation: "ข้อมูลสำรอง"
              }
            };
          } catch (error) {
            console.error(`Error fetching telemetry for station ${station.id}:`, error);
            
            // Return station with default telemetry data
            return {
              ...station,
              telemetry_data: {
                water_level: station.water_level || 0,
                flow_rate: station.flow_rate || 0,
                timestamp: new Date().toISOString(),
                notation: "ข้อมูลสำรอง (เกิดข้อผิดพลาดในการเชื่อมต่อ)"
              }
            };
          }
        })
      );

      console.log(
        `[fetchMonitoringStations] Successfully fetched ${stationsWithTelemetry.length} stations`
      );

      return {
        stations: stationsWithTelemetry,
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error("[fetchMonitoringStations] Request timed out");
        throw new Error("Request timed out. Please try again later.");
      }
      
      throw fetchError;
    }
  } catch (error) {
    console.error("Error fetching monitoring stations:", error);
    return {
      stations: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Hook for fetching and managing monitoring stations
 */
export const useMonitoringStations = (amphure?: string, province?: string) => {
  const [monitoringStations, setMonitoringStations] = useState<MonitoringStation[]>([]);
  
  const query = useQuery<MonitoringStationsResponse, Error>({
    queryKey: ['monitoringStations', amphure, province],
    queryFn: () => fetchMonitoringStations(amphure, province),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 2, // Retry failed requests up to 2 times
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  // Update local state when query data changes
  useEffect(() => {
    if (query.data?.stations) {
      setMonitoringStations(query.data.stations);
    }
  }, [query.data]);

  return {
    ...query,
    monitoringStations,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error
  };
}; 