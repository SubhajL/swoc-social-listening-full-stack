import https from 'https';
import axios, { AxiosError } from 'axios';
import crypto from 'crypto';
import { logger } from '../../utils/logger';
import type { TelemetryReading, TelemetryResponse, TelemetryRequest, TelemetryError } from './types';
import { TelemetryRequest as TelemetryRequestDto } from '../../dto/telemetry.dto';

/**
 * ⚠️ PARTIALLY LOCKED IMPLEMENTATION - DO NOT MODIFY CORE FUNCTIONALITY
 * Last Lock Date: 2025-02-09
 * 
 * The following features are locked and should not be modified:
 * 1. Core API Integration:
 *    - Base URL configuration
 *    - Request/response handling
 *    - Error handling
 * 
 * 2. Data Models:
 *    - Response interfaces
 *    - Data transformation
 * 
 * 3. Security:
 *    - OAuth integration
 *    - HTTPS configuration
 * 
 * Additional features and enhancements should be implemented separately
 * without modifying the core locked functionality.
 */

// Base URL for RID API
const RID_API_BASE_URL = 'http://hyd-app.rid.go.th/webservice';
const RID_API_SERVICE = `${RID_API_BASE_URL}/HydroAuthenticateService.svc`;

// API Endpoints
const ENDPOINTS = {
  TELEMETRY: `${RID_API_SERVICE}/getHourlyTodayFromStationID`,
  DAILY_STATION: `${RID_API_SERVICE}/getDailyStationList`,
  HOURLY_STATION: `${RID_API_SERVICE}/getHourlyStationList`,
  HYDRO_TELEMETRY: `${RID_API_SERVICE}/getHourlyTodayFromHydroID`
};

// Create HTTPS agent that allows self-signed certificates
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

// Consumer credentials
const CONSUMER_KEY = process.env.RID_CONSUMER_KEY || '38b992bd1c9d445ba5305bc90edd2b4a';
const CONSUMER_SECRET = process.env.RID_CONSUMER_SECRET || '1974b85763c2496d80911b48dfbb53af';

/**
 * Generate OAuth 1.0 signature using the approach from the API documentation
 */
function generateOAuthSignature(url: string, method: string): { signedUrl: string, authHeader: string } {
  // Generate timestamp and nonce
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString('hex');
  
  // Create OAuth parameters
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: CONSUMER_KEY,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_version: '1.0'
  };
  
  // Create parameter string
  const paramString = Object.entries(oauthParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  
  // Create signature base string
  const signatureBaseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(paramString)
  ].join('&');
  
  // Create signing key
  const signingKey = `${CONSUMER_SECRET}&`;
  
  // Generate signature
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBaseString)
    .digest('base64');
  
  // Add signature to parameters
  oauthParams.oauth_signature = signature;
  
  // Create signed URL (for PHP style)
  const signedUrl = `${url}?${paramString}&oauth_signature=${encodeURIComponent(signature)}`;
  
  // Create Authorization header (for header style)
  const authHeader = 'OAuth ' + Object.entries(oauthParams)
    .map(([key, value]) => `${encodeURIComponent(key)}="${encodeURIComponent(value)}"`)
    .join(', ');
  
  return { signedUrl, authHeader };
}

// Response interfaces
export interface RIDTelemetryResponse {
  stationid: string;
  hourlytime: string;
  wlvalues: string[];
  qvalues: string[];
}

export interface RIDStationResponse {
  stationid: string;
  stationname: string;
  stationcode: string;
  latitude: string;
  longitude: string;
  elevation: string;
  river: string;
  province: string;
  district: string;
  subdistrict: string;
  hydroname: string;
  basinid: string;
  basinname: string;
  provincecode: string;
  braelevel: string;
  QMax: string;
  UseMSL: string;
  UseMSLString: string;
  orderno: string;
  stationdetail: string;
  ZG: string;
  GroundLevel: string;
}

/**
 * Gets list of all stations
 */
export async function getStationList(hydroId: string): Promise<{ success: boolean; data: RIDStationResponse[] }> {
  try {
    logger.info('Fetching hourly station list', 'RidTelemetryService', {
      endpoint: ENDPOINTS.HOURLY_STATION,
      hydroId,
      timestamp: new Date().toISOString()
    });

    // Prepare request body
    const requestBody = {
      hydro: {
        hydroid: hydroId
      }
    };

    logger.info('Request Body:', JSON.stringify(requestBody, null, 2));

    // Generate OAuth signature
    const { signedUrl } = generateOAuthSignature(ENDPOINTS.HOURLY_STATION, 'POST');
    logger.info('Generated signed URL:', { signedUrl });

    // Make API request
    logger.info('Making API request...');
    const response = await axios.post(
      signedUrl,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'RID-Telemetry-Client/1.0'
        },
        httpsAgent,
        validateStatus: () => true,
        timeout: 30000
      }
    );

    logger.info('API Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
    });

    if (response.status >= 400) {
      throw new Error(`RID API request failed with status ${response.status}: ${response.statusText}`);
    }

    return {
      success: true,
      data: Array.isArray(response.data) ? response.data : []
    };
  } catch (error) {
    logger.error('Failed to fetch hourly station list', 'RidTelemetryService', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Gets current daily station count
 */
export async function getDailyStationCount(hydroId: string): Promise<number> {
  const stations = await getDailyStationList(hydroId);
  return stations.data.length;
}

/**
 * Gets current hourly station count
 */
export async function getStationCount(hydroId: string): Promise<number> {
  const stations = await getStationList(hydroId);
  return stations.data.length;
}

/**
 * Fetches telemetry data from RID API for a specific station
 */
export async function getTelemetryData(
  request: TelemetryRequestDto
): Promise<TelemetryResponse> {
  try {
    logger.info('Starting telemetry data fetch', 'RidTelemetryService', {
      endpoint: ENDPOINTS.TELEMETRY,
      request,
      timestamp: new Date().toISOString()
    });

    // Prepare request body
    const requestBody = {
      hydro: {
        stationid: request.stationid,
        TimeStart: request.timestart
      }
    };

    logger.info('Request Body:', JSON.stringify(requestBody, null, 2));

    // Generate OAuth signature
    const { signedUrl } = generateOAuthSignature(ENDPOINTS.TELEMETRY, 'POST');
    logger.info('Generated signed URL:', { signedUrl });

    // Make API request
    logger.info('Making API request...');
    const response = await axios.post(
      signedUrl,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'RID-Telemetry-Client/1.0'
        },
        httpsAgent,
        validateStatus: () => true,
        timeout: 30000
      }
    );

    logger.info('API Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
    });

    if (response.status >= 400) {
      throw new Error(`RID API request failed with status ${response.status}: ${response.statusText}`);
    }

    logger.info('Successfully fetched telemetry data', 'RidTelemetryService', {
      stationId: request.stationid,
      dataPoints: Array.isArray(response.data) ? response.data.length : 0,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    // Handle known TelemetryError
    if (error && typeof error === 'object' && 'status' in error) {
      throw error;
    }

    // Handle other errors
    logger.error('Failed to fetch telemetry data', 'RidTelemetryService', {
      error: error instanceof Error ? error.message : String(error),
      stationId: request.stationid
    });

    const telemetryError: TelemetryError = {
      status: 500,
      message: 'Failed to fetch telemetry data',
      details: error instanceof Error ? error.message : String(error)
    };
    throw telemetryError;
  }
}

/**
 * Test function that fetches data for a known valid station
 */
export async function testTelemetryService(): Promise<TelemetryResponse> {
  // Use a known valid station ID for testing
  const testStationId = 'P.1';
  
  // Format date in Thai Buddhist calendar format (dd/MM/yyyy)
  // Use Thai timezone (UTC+7)
  const now = new Date();
  // Adjust for Thai timezone (UTC+7)
  const thaiTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
  const buddhistYear = thaiTime.getFullYear() + 543;
  const timeStart = `${thaiTime.getDate().toString().padStart(2, '0')}/${(thaiTime.getMonth() + 1).toString().padStart(2, '0')}/${buddhistYear}`;
  
  logger.info('Testing telemetry service with known station', 'RidTelemetryService', {
    testStationId,
    timeStart,
    thaiTime: thaiTime.toISOString(),
    utcTime: now.toISOString(),
    timestamp: new Date().toISOString()
  });
  
  return getTelemetryData({
    stationid: testStationId,
    timestart: timeStart
  });
}

/**
 * Fetches telemetry data for all stations in a hydro region
 */
export async function getHydroTelemetryData(hydroId: string): Promise<TelemetryResponse> {
  try {
    logger.info('Starting hydro telemetry data fetch', 'RidTelemetryService', {
      endpoint: ENDPOINTS.HYDRO_TELEMETRY,
      hydroId,
      timestamp: new Date().toISOString()
    });

    // Format date in Thai Buddhist calendar format (dd/MM/yyyy)
    const now = new Date();
    const buddhistYear = now.getFullYear() + 543;
    const time_start = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${buddhistYear}`;

    // Prepare request body
    const requestBody = {
      hydro: {
        hydroid: hydroId,
        TimeStart: time_start
      }
    };

    logger.info('Request Body:', JSON.stringify(requestBody, null, 2));

    // Generate OAuth signature
    const { signedUrl } = generateOAuthSignature(ENDPOINTS.HYDRO_TELEMETRY, 'POST');
    logger.info('Generated signed URL:', { signedUrl });

    // Make API request
    logger.info('Making API request...');
    const response = await axios.post(
      signedUrl,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'RID-Telemetry-Client/1.0'
        },
        httpsAgent,
        validateStatus: () => true,
        timeout: 30000
      }
    );

    logger.info('API Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
    });

    if (response.status >= 400) {
      throw new Error(`RID API request failed with status ${response.status}: ${response.statusText}`);
    }

    logger.info('Successfully fetched hydro telemetry data', 'RidTelemetryService', {
      hydroId,
      dataPoints: Array.isArray(response.data) ? response.data.length : 0,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    // Handle known TelemetryError
    if (error && typeof error === 'object' && 'status' in error) {
      throw error;
    }

    // Handle other errors
    logger.error('Failed to fetch hydro telemetry data', 'RidTelemetryService', {
      error: error instanceof Error ? error.message : String(error),
      hydroId
    });

    const telemetryError: TelemetryError = {
      status: 500,
      message: 'Failed to fetch hydro telemetry data',
      details: error instanceof Error ? error.message : String(error)
    };
    throw telemetryError;
  }
}

/**
 * Fetches list of daily telemetry stations
 */
export async function getDailyStationList(hydroId: string): Promise<TelemetryResponse> {
  try {
    logger.info('Fetching daily station list', 'RidTelemetryService', {
      endpoint: ENDPOINTS.DAILY_STATION,
      hydroId,
      timestamp: new Date().toISOString()
    });

    // Prepare request body
    const requestBody = {
      hydro: {
        hydroid: hydroId.toString()
      }
    };

    logger.info('Request Body:', JSON.stringify(requestBody, null, 2));

    // Generate OAuth signature
    const { signedUrl } = generateOAuthSignature(ENDPOINTS.DAILY_STATION, 'POST');
    logger.info('Generated signed URL:', { signedUrl });

    // Make API request
    logger.info('Making API request...');
    const response = await axios.post(
      signedUrl,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'RID-Telemetry-Client/1.0'
        },
        httpsAgent,
        validateStatus: () => true,
        timeout: 30000
      }
    );

    logger.info('API Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
    });

    if (response.status >= 400) {
      throw new Error(`RID API request failed with status ${response.status}: ${response.statusText}`);
    }

    logger.info('Successfully fetched daily station list', 'RidTelemetryService', {
      hydroId,
      stationCount: Array.isArray(response.data) ? response.data.length : 0,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    // Handle known TelemetryError
    if (error && typeof error === 'object' && 'status' in error) {
      throw error;
    }

    // Handle other errors
    logger.error('Failed to fetch daily station list', 'RidTelemetryService', {
      error: error instanceof Error ? error.message : String(error),
      hydroId
    });

    const telemetryError: TelemetryError = {
      status: 500,
      message: 'Failed to fetch daily station list',
      details: error instanceof Error ? error.message : String(error)
    };
    throw telemetryError;
  }
} 