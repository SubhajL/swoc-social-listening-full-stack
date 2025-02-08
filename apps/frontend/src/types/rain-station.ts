export interface RainStation {
  id: number;
  sequence_number: string | null;
  station_id: string | null;
  station_name: string | null;
  code: string | null;
  irrigation_office: string | null;
  river_basin: string | null;
  river_name: string | null;
  amphure: string | null;
  province: string | null;
  water_level?: number;  // Current water level in meters
  flow_rate?: number;    // Current flow rate in cubic meters per second
  rainfall_3d?: number;  // Rainfall in last 3 days in millimeters
  rainfall_7d?: number;  // Rainfall in last 7 days in millimeters
}

export interface RainStationResponse {
  stations: RainStation[];
  total: number;
} 