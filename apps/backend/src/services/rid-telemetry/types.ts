// RID Telemetry API response types
export interface TelemetryReading {
  stationid: string;           // Station ID (string in RID API, e.g., 'P.1')
  hourlytime: string;          // Data timestamp in local time
  hourlytimeutc: string;       // Data timestamp in UTC
  wlvalues: number | null;     // Water level (m)
  wlvaluesabove: number | null;// Water level above dam (m)
  qvalues: number | null;      // Flow rate (m³/s)
  qavrvalues: number | null;   // Average daily flow rate (m³/s)
  notationid: number;          // Notation ID for data quality/status
}

// Wrapper for API response
export interface TelemetryResponse {
  success: boolean;
  data: TelemetryReading[];
}

// Request parameters
export interface TelemetryRequest {
  station_id: string;
  hydro_id: string;  // Hydro ID (string in RID API)
  time_start: string; // Format: dd/MM/yyyy in Buddhist calendar
  time_end?: string;  // Optional end time
}

// Error response type
export interface TelemetryError {
  status: number;
  message: string;
  details?: string;
} 