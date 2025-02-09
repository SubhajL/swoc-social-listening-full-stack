import axios from 'axios';
import { logger } from '../../utils/logger';
import { getOAuthQueryString } from './oauth';
import type { TelemetryReading, TelemetryResponse, TelemetryRequest, TelemetryError } from './types';

// API configuration
const RID_API_URL = 'http://hyd-app.rid.go.th/API';
const TELEMETRY_ENDPOINT = `${RID_API_URL}/webservice/HydroAuthenticateService.svc/getHourlyTodayFromStationID`;

/**
 * Fetches telemetry data from RID API for a specific station
 */
export async function getTelemetryData(
  request: TelemetryRequest
): Promise<TelemetryResponse> {
  try {
    // Build OAuth query string
    const oauthQueryString = getOAuthQueryString(TELEMETRY_ENDPOINT);
    const urlWithOAuth = `${TELEMETRY_ENDPOINT}?${oauthQueryString}`;

    // Prepare request body
    const requestBody = {
      hydro: {
        stationid: request.stationId,
        TimeStart: request.timeStart
      }
    };

    logger.debug('Fetching telemetry data', 'RidTelemetryService', {
      endpoint: TELEMETRY_ENDPOINT,
      request: requestBody
    });

    // Make API request
    const response = await axios.post<TelemetryReading[]>(urlWithOAuth, requestBody, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = response.data;

    // Handle empty response
    if (!Array.isArray(data) || data.length === 0) {
      logger.warn('No telemetry data available', 'RidTelemetryService', {
        stationId: request.stationId
      });
      throw new Error('No telemetry data available');
    }

    // Get latest reading
    const latest = data[data.length - 1];
    
    // Parse Microsoft JSON date format
    const readingTime = new Date(parseInt(latest.hourlytime.substr(6)));

    const result: TelemetryResponse = {
      waterLevel: latest.wlvalues,
      waterFlow: latest.qvalues,
      readingTime
    };

    logger.debug('Successfully fetched telemetry data', 'RidTelemetryService', {
      result
    });

    return result;
  } catch (err: unknown) {
    logger.error('Failed to fetch telemetry data', 'RidTelemetryService', {
      error: err,
      request
    });

    const telemetryError = new Error(
      err instanceof Error ? err.message : 'Failed to fetch telemetry data'
    ) as TelemetryError;

    if (axios.isAxiosError(err) && err.response) {
      telemetryError.status = err.response.status;
      telemetryError.statusText = err.response.statusText;
      telemetryError.details = err.response.data;
    }

    throw telemetryError;
  }
} 