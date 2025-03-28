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
  latitude?: string;
  longitude?: string;
  GroundLevel?: string;
  QMax?: string;
  ZG?: string;
  braelevel?: string;
  UseMSL?: string;
  UseMSLString?: string;
  orderno?: string;
  elevation?: string;
} 