/**
 * Data transfer object for telemetry requests
 */
export interface TelemetryRequest {
  stationid: string;
  timestart: string;
  timeend?: string; // Optional end time
}

/**
 * Data transfer object for telemetry responses
 */
export interface TelemetryResponse {
  success: boolean;
  data: any[]; // TODO: Type this properly based on actual response format
  error?: string;
} 