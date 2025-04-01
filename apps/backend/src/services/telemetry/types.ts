/**
 * Response interface for telemetry data
 */
export interface TelemetryResponse {
  success: boolean;
  data: TelemetryData[];
  error?: string;
}

/**
 * Interface for telemetry data from database
 */
export interface TelemetryData {
  id: number;
  station_id: string;
  station_name: string;
  hydro_id: string;
  data_source: string;
  latitude: number | null;
  longitude: number | null;
  last_sync: Date;
  station_code?: string;
  hydro_name?: string;
  basin_id?: number;
  basin_name?: string;
  province_code?: number;
  brae_level?: number;
  q_max?: number;
  use_msl?: boolean;
  station_detail?: string;
  zero_gauge?: number;
  ground_level?: number;
  created_at: Date;
  updated_at: Date;
  status: string;
  flow_rate?: number;
  reading_time?: Date;
} 