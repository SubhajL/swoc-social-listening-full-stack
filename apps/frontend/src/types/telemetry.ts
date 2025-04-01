export interface TelemetryStation {
  station_id: string;
  station_name: string;
  hydro_id: string;
  data_source: string;
  latitude: number;
  longitude: number;
  status: 'active' | 'inactive';
  amphure: string;
  province: string;
  latest_reading?: {
    water_level?: number;
    flow_rate?: number;
    rainfall_1h?: number;
    rainfall_24h?: number;
    timestamp: string;
  };
} 