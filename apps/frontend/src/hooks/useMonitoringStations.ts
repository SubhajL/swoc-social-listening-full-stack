import { useQuery } from "@tanstack/react-query";
import { MonitoringStationResponse } from "@/types/monitoring-station";

const fetchMonitoringStations = async (
  amphure?: string,
  province?: string
): Promise<MonitoringStationResponse> => {
  const params = new URLSearchParams();
  if (amphure) params.append("amphure", amphure);
  if (province) params.append("province", province);

  const response = await fetch(`/api/monitoring-stations?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to fetch monitoring stations");
  }
  return response.json();
};

export const useMonitoringStations = (amphure?: string, province?: string) => {
  return useQuery({
    queryKey: ["monitoring-stations", amphure, province],
    queryFn: () => fetchMonitoringStations(amphure, province),
    enabled: !!(amphure || province),
  });
}; 