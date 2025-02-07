export interface MonitoringStation {
  id: number;
  station_id: string;
  station_name: string;
  code: string;
  irrigation_office: string;
  river_basin: string;
  river_name: string;
  amphure: string;
  province: string;
  bank_level_meters: string;
  capacity_cms: string;
  pole_center_msl: string;
  water_level?: number;  // Current water level in meters
  flow_rate?: number;    // Current flow rate in cubic meters per second
}

export interface MonitoringStationResponse {
  stations: MonitoringStation[];
  total: number;
} 