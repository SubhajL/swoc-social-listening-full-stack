export interface ThaiWaterRainfallData {
  rainfall10m: number;
  rainfall1h: number;
  rainfall24h: number;
  rainfall_date_calc: string;
  rainfall_datetime: string;
  rainfall_today: number;
  tele_station_id: number;
}

export interface ThaiWaterResponse {
  success: boolean;
  data: ThaiWaterRainfallData[];
  error?: string;
  debug?: any;
} 