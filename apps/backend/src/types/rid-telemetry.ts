/**
 * Response type for RID Telemetry Station API
 */
export interface RIDStationResponse {
  stationid: string;
  stationcode: string;
  stationname?: string;
  stationdetail?: string;
  hydroid?: string;
  hydroname?: string;
  basinid?: string;
  basinname?: string;
  provincecode?: string;
  province?: string;
  amphurecode?: string;
  amphure?: string;
  latitude?: string;
  longitude?: string;
  GroundLevel?: string;
  QMax?: string;
  ZG?: string;
  braelevel?: string;
  UseMSL?: string;
  UseMSLString?: string;
  UseQAuto?: string;
  telemetryid?: string;
  telemetrysource?: string;
  ShowDailyReport?: string;
  ShowHourlyReport?: string;
  iswarning?: string;
  notes?: string;
  category?: string;
  hasdata?: string;
  orderno?: string;
  elevation?: string;
}

/**
 * Response type for RID Telemetry API
 */
export interface RIDTelemetryResponse {
  success: boolean;
  data: RIDStationResponse[];
  error?: string;
} 