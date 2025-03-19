import axios from 'axios';
import { logger } from '../../utils/logger';
import { getOAuthHeader, getSignedUrl } from './oauth';
import type { TelemetryReading, TelemetryResponse, TelemetryRequest, TelemetryError } from './types';
import { TelemetryRequest as TelemetryRequestDto } from '../../dto/telemetry.dto';
import https from 'https';

// API configuration
const RID_API_BASE_URL = 'http://hyd-app.rid.go.th/webservice';
const RID_API_SERVICE = `${RID_API_BASE_URL}/HydroAuthenticateService.svc`;
const TELEMETRY_ENDPOINT = `${RID_API_SERVICE}/getHourlyTodayFromStationID`;
const STATION_LIST_ENDPOINT = `${RID_API_SERVICE}/getHourlyStationList`;

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Response cache to reduce API calls
const responseCache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Helper function to implement exponential backoff for retries
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Helper function to generate a cache key
 */
function generateCacheKey(endpoint: string, params: Record<string, any>): string {
  return `${endpoint}:${JSON.stringify(params)}`;
}

/**
 * Makes an API request to the RID telemetry service with retry logic
 */
async function makeRidApiRequest(
  endpoint: string,
  requestBody: Record<string, any>,
  retryCount = 0
): Promise<any> {
  try {
    // Generate cache key
    const cacheKey = generateCacheKey(endpoint, requestBody);
    
    // Check cache first
    const cachedResponse = responseCache[cacheKey];
    if (cachedResponse && (Date.now() - cachedResponse.timestamp) < CACHE_TTL) {
      logger.debug('Using cached response', 'RidTelemetryService', {
        endpoint,
        cacheAge: `${(Date.now() - cachedResponse.timestamp) / 1000}s`
      });
      return cachedResponse.data;
    }
    
    // Get signed URL with OAuth parameters
    const signedUrl = await getSignedUrl(endpoint, 'POST', requestBody);

    // Make API request
    const response = await axios.post(
      signedUrl,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'RID-Telemetry-Client/1.0'
        },
        timeout: 30000, // 30 seconds timeout
        validateStatus: () => true, // Handle all status codes in our code
        // @ts-ignore - httpsAgent is valid but TypeScript doesn't recognize it
        httpsAgent: new https.Agent({ 
          rejectUnauthorized: false // Allow self-signed certificates
        })
      }
    );

    // Check for HTTP errors
    if (response.status !== 200) {
      logger.error('RID API returned non-200 status code', 'RidTelemetryService', {
        endpoint,
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        requestBody: JSON.stringify(requestBody),
        headers: {
          'Content-Type': response.headers['content-type'],
          'Date': response.headers['date']
        }
      });

      // If we get a 429 (Too Many Requests) or 5xx error, retry
      if ((response.status === 429 || response.status >= 500) && retryCount < MAX_RETRIES) {
        const delayMs = RETRY_DELAY_MS * Math.pow(2, retryCount);
        logger.info(`Retrying request after ${delayMs}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`, 'RidTelemetryService', {
          endpoint,
          status: response.status
        });
        
        await sleep(delayMs);
        return makeRidApiRequest(endpoint, requestBody, retryCount + 1);
      }

      const telemetryError: TelemetryError = {
        status: response.status,
        message: `RID API returned status ${response.status}: ${response.statusText}`,
        details: typeof response.data === 'object' ? JSON.stringify(response.data) : String(response.data)
      };
      throw telemetryError;
    }

    // Parse response data
    let data;
    try {
      // Handle both string and object responses
      if (typeof response.data === 'string') {
        data = JSON.parse(response.data);
      } else {
        data = response.data;
      }
      
      // Cache the successful response
      responseCache[cacheKey] = {
        data,
        timestamp: Date.now()
      };
      
      return data;
    } catch (parseError) {
      logger.error('Failed to parse RID API response', 'RidTelemetryService', {
        error: parseError instanceof Error ? parseError.message : String(parseError),
        responseData: response.data
      });

      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      const telemetryError: TelemetryError = {
        status: 500,
        message: 'Failed to parse RID API response',
        details: `Error: ${errorMessage}, Response: ${typeof response.data === 'string' ? response.data.substring(0, 100) : 'non-string data'}`
      };
      throw telemetryError;
    }
  } catch (error) {
    // Handle network errors with retry
    if (
      error && 
      typeof error === 'object' && 
      'isAxiosError' in error && 
      error.isAxiosError && 
      'code' in error && 
      error.code === 'ECONNABORTED' && 
      retryCount < MAX_RETRIES
    ) {
      const delayMs = RETRY_DELAY_MS * Math.pow(2, retryCount);
      logger.info(`Request timed out, retrying after ${delayMs}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`, 'RidTelemetryService', {
        endpoint
      });
      
      await sleep(delayMs);
      return makeRidApiRequest(endpoint, requestBody, retryCount + 1);
    }
    
    // Re-throw the error for the caller to handle
    throw error;
  }
}

/**
 * Fetches telemetry data from RID API for a specific station
 */
export async function getTelemetryData(
  request: TelemetryRequestDto
): Promise<TelemetryResponse> {
  try {
    logger.info('Starting telemetry data fetch', 'RidTelemetryService', {
      endpoint: TELEMETRY_ENDPOINT,
      request,
      timestamp: new Date().toISOString()
    });

    // Prepare request body
    const requestBody = {
      hydro: {
        StationID: request.stationid,
        TimeStart: request.timestart
      }
    };

    // Make API request with retry logic
    const data = await makeRidApiRequest(TELEMETRY_ENDPOINT, requestBody);

    logger.info('Successfully fetched telemetry data', 'RidTelemetryService', {
      stationId: request.stationid,
      dataPoints: Array.isArray(data) ? data.length : 0,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      data: data
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
 * Fetches list of available telemetry stations
 */
export async function getStationList(hydroId: string): Promise<TelemetryResponse> {
  try {
    logger.info('Fetching station list', 'RidTelemetryService', {
      endpoint: STATION_LIST_ENDPOINT,
      hydroId,
      timestamp: new Date().toISOString()
    });

    // Prepare request body
    const requestBody = {
      hydro: {
        HydroID: hydroId
      }
    };

    // Make API request with retry logic
    const data = await makeRidApiRequest(STATION_LIST_ENDPOINT, requestBody);

    logger.info('Successfully fetched station list', 'RidTelemetryService', {
      hydroId,
      stationCount: Array.isArray(data) ? data.length : 0,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      data: data
    };
  } catch (error) {
    // Handle known TelemetryError
    if (error && typeof error === 'object' && 'status' in error) {
      throw error;
    }

    // Handle other errors
    logger.error('Failed to fetch station list', 'RidTelemetryService', {
      error: error instanceof Error ? error.message : String(error),
      hydroId
    });

    const telemetryError: TelemetryError = {
      status: 500,
      message: 'Failed to fetch station list',
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