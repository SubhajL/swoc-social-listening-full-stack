// RID Telemetry API response types
export interface TelemetryReading {
  wlvalues: number;  // Water level
  qvalues: number;   // Flow rate
  hourlytime: string; // Microsoft JSON date string
}

export interface TelemetryResponse {
  waterLevel: number;
  waterFlow: number;
  readingTime: Date;
}

export interface TelemetryRequest {
  stationId: string;
  timeStart: string; // Format: dd/MM/yyyy in Buddhist calendar
}

// Error types
export interface TelemetryError extends Error {
  status?: number;
  statusText?: string;
  details?: unknown;
} 