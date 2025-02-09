import { useQuery } from "@tanstack/react-query";
import { MonitoringStationResponse, MonitoringStation } from "@/types/monitoring-station";
import { API_ENDPOINTS, buildUrl, createApiError } from "@/lib/api";
import { ridTelemetryService } from "@/services/rid-telemetry.service";

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

    // Fetch real-time data for each station
    const stationsWithTelemetry = await Promise.all(
      data.stations.map(async (station: MonitoringStation) => {
        try {
          if (!station.station_id) return station;

          const telemetryData = await ridTelemetryService.getHourlyData(station.station_id);
          if (!telemetryData || telemetryData.length === 0) return station;

          const latestData = telemetryData[telemetryData.length - 1];
          return {
            ...station,
            telemetry_data: {
              timestamp: latestData.hourlytime,
              water_level: latestData.wlvalues,
              flow_rate: latestData.qvalues,
              notation: latestData.notationString
            }
          };
        } catch (error) {
          console.warn("[useMonitoringStations] Failed to fetch telemetry data", {
            stationId: station.station_id,
            error: error instanceof Error ? error.message : "Unknown error"
          });
          return station;
        }
      })
    );

    return {
      ...data,
      stations: stationsWithTelemetry
    };
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