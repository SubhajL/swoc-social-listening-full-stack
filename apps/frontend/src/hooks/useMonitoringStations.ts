import { useQuery } from "@tanstack/react-query";
import { MonitoringStationResponse, MonitoringStation } from "@/types/monitoring-station";
import { API_ENDPOINTS, buildUrl, createApiError } from "@/lib/api";
import { ridTelemetryService } from "@/services/rid-telemetry.service";
import { cleanLocationString } from "@/lib/location-utils";

export interface MonitoringStationsResponse {
  stations: MonitoringStation[];
  error?: string;
}

export const fetchMonitoringStations = async (
  amphure?: string,
  province?: string
): Promise<MonitoringStationsResponse> => {
  console.log(
    `[fetchMonitoringStations] Attempting to fetch monitoring stations for:`,
    { amphure, province }
  );
  
  // Clean location strings for API request
  const cleanedAmphure = cleanLocationString(amphure);
  const cleanedProvince = cleanLocationString(province);
  
  console.log(
    `[fetchMonitoringStations] Using cleaned location values:`,
    { cleanedAmphure, cleanedProvince }
  );

  try {
    // Construct URL with query parameters
    const url = new URL(`${import.meta.env.VITE_API_URL}/api/monitoring-stations`);
    
    if (cleanedAmphure) {
      url.searchParams.append("amphure", cleanedAmphure);
    }
    
    if (cleanedProvince) {
      url.searchParams.append("province", cleanedProvince);
    }

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Failed to fetch monitoring stations: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Log detailed station ID information from API response
    console.log('[fetchMonitoringStations] Station IDs from API response:', 
      data.stations?.map((station: any) => ({
        id: station.id,
        station_id: station.station_id,
        name: station.station_name
      }))
    );
    
    // Fetch telemetry data for each station
    const stationsWithTelemetry = await Promise.all(
      data.stations.map(async (station: MonitoringStation) => {
        try {
          const telemetryUrl = new URL(
            `${import.meta.env.VITE_API_URL}/api/telemetry/${station.id}`
          );
          
          // Use fetch with { method: 'HEAD' } first to check if the endpoint exists
          // This avoids the 404 errors in the console
          const checkResponse = await fetch(telemetryUrl.toString(), { method: 'HEAD' })
            .catch(() => ({ ok: false, status: 404 }));
          
          // Only proceed with actual fetch if the endpoint exists
          if (checkResponse.ok) {
            const telemetryResponse = await fetch(telemetryUrl.toString());
            
            if (telemetryResponse.ok) {
              const telemetryData = await telemetryResponse.json();
              return {
                ...station,
                telemetry: telemetryData,
              };
            }
          }
          
          // If API returns 404 or HEAD check failed, provide default telemetry data
          return {
            ...station,
            telemetry_data: {
              water_level: station.water_level || 0,
              flow_rate: station.flow_rate || 0,
              timestamp: new Date().toISOString(),
              notation: "ข้อมูลสำรอง (API ยังไม่พร้อมใช้งาน)"
            }
          };
        } catch (error) {
          // Only log error once per station to reduce console spam
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
      `[fetchMonitoringStations] Successfully fetched ${stationsWithTelemetry.length} stations for:`,
      { cleanedAmphure, cleanedProvince }
    );

    return {
      stations: stationsWithTelemetry,
    };
  } catch (error) {
    console.error("Error fetching monitoring stations:", error);
    return {
      stations: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const useMonitoringStations = (amphure?: string, province?: string) => {
  return useQuery({
    queryKey: ["monitoringStations", cleanLocationString(amphure), cleanLocationString(province)],
    queryFn: () => fetchMonitoringStations(amphure, province),
    enabled: Boolean(amphure || province),
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}; 