export interface ThaiWaterRainfallData {
  id: number;
  tele_station_id: number;
  tele_station_name: string;
  tele_station_name_th: string;
  tele_station_lat: string;
  tele_station_long: string;
  rainfall10m: number | string;
  rainfall1h: number | string;
  rainfall24h: number | string;
  rainfall3h: number | string | null;
  rainfall_date_calc: string;
  rainfall_datetime: string;
  rainfall_today: number | string;
  data_source: string | null;
  province: string;
  amphure: string;
  tambon: string;
}

export interface ThaiWaterResponse {
  success: boolean;
  data: ThaiWaterRainfallData[];
  error?: string;
  debug?: any;
} 