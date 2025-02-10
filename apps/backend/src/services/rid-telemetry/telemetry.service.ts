import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { logger } from '../../utils/logger';
import { getOAuthHeader } from './oauth';
import type { TelemetryReading, TelemetryResponse, TelemetryRequest, TelemetryError } from './types';
import { TelemetryRequest as TelemetryRequestDto } from '../../dto/telemetry.dto';
import https from 'https';

// API configuration
const RID_API_BASE_URL = 'https://hyd-app.rid.go.th/webservice';
const RID_API_SERVICE = `${RID_API_BASE_URL}/HydroAuthenticateService.svc`;
const TELEMETRY_ENDPOINT = 'https://hyd-app.rid.go.th/webservice/api/telemetry';

// Type guard for Axios error
function isAxiosError(error: unknown): error is Error & { 
  code?: string;
  response?: { 
    status: number; 
    statusText: string; 
    data: unknown;
    headers: Record<string, string>;
    config?: {
      url?: string;
      method?: string;
      headers?: Record<string, string>;
      data?: unknown;
    }
  } 
} {
  return error instanceof Error && 
         ('response' in error || 'code' in error) && 
         (error as any).isAxiosError === true;
}

interface ErrorWithResponse extends Error {
  response?: {
    status?: number;
    data?: any;
  };
  code?: string;
}

function isErrorWithResponse(error: unknown): error is ErrorWithResponse {
  return error instanceof Error && (
    'response' in error || 
    'code' in error
  );
}

/**
 * Fetches telemetry data from RID API for a specific station
 */
export async function getTelemetryData(
  request: TelemetryRequestDto
): Promise<TelemetryResponse> {
  let requestDetails: {
    url: string;
    method: string;
    body: Record<string, any>;
    headers: Record<string, string>;
  } = {
    url: TELEMETRY_ENDPOINT,
    method: 'GET',
    body: {},
    headers: {}
  };

  try {
    logger.info('Starting telemetry data fetch', 'RidTelemetryService', {
      endpoint: TELEMETRY_ENDPOINT,
      request,
      timestamp: new Date().toISOString()
    });

    // Prepare request body
    const requestBody = {
      stationid: request.stationid,
      timestart: request.timestart,
      timeend: request.timeend || request.timestart // If no end time provided, use start time
    };

    logger.debug('Prepared request body', 'RidTelemetryService', {
      body: requestBody,
      originalRequest: request,
      timestamp: new Date().toISOString()
    });

    // Get OAuth header - now async
    const authHeader = await getOAuthHeader(TELEMETRY_ENDPOINT, 'POST', requestBody);

    logger.debug('Generated OAuth header', 'RidTelemetryService', {
      authHeader: authHeader.split(', '),
      fullHeader: authHeader,
      timestamp: new Date().toISOString()
    });

    // Store request details for error logging
    requestDetails = {
      url: TELEMETRY_ENDPOINT,
      method: 'POST',
      body: requestBody,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'RID-Telemetry-Client/1.0'
      }
    };

    // Log full request details
    logger.info('Making API request', 'RidTelemetryService', {
      ...requestDetails,
      timestamp: new Date().toISOString()
    });

    // Make API request with timeout
    const config: InternalAxiosRequestConfig = {
      headers: requestDetails.headers,
      timeout: 30000, // Increased timeout to 30 seconds
      validateStatus: () => true, // Allow any status code to be handled in our code
      responseType: 'text',
      maxRedirects: 5, // Allow up to 5 redirects
      httpsAgent: new https.Agent({ 
        rejectUnauthorized: false // Allow self-signed certificates
      })
    };

    const response = await axios.post<string>(
      TELEMETRY_ENDPOINT,
      requestBody,
      config
    );

    // Log detailed response information
    logger.info('Received API response', 'RidTelemetryService', {
      request: {
        url: TELEMETRY_ENDPOINT,
        method: 'POST',
        headers: requestDetails.headers,
        params: requestBody,
        timeout: 30000
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
        size: typeof response.data === 'string' ? response.data.length : 0,
        duration: response.headers['x-response-time'] || 'unknown'
      },
      timestamp: new Date().toISOString()
    });

    // Log raw response
    const rawData = response.data;
    logger.debug('Raw response details', 'RidTelemetryService', {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      rawData: rawData,
      dataLength: typeof rawData === 'string' ? rawData.length : 0,
      dataType: typeof rawData,
      isString: typeof rawData === 'string',
      firstChars: typeof rawData === 'string' ? rawData.substring(0, 100) : '',
      hasContent: !!rawData,
      contentPreview: typeof rawData === 'string' ? rawData.substring(0, 200).replace(/[\n\r]/g, '\\n') : null,
      contentType: response.headers['content-type'],
      timestamp: new Date().toISOString()
    });

    // Try to parse JSON response
    let data: TelemetryReading[] = [];
    try {
      if (rawData) {
        const parsed = JSON.parse(rawData);
        logger.debug('Parsed response details', 'RidTelemetryService', {
          parsed,
          isArray: Array.isArray(parsed),
          type: typeof parsed,
          parsedData: parsed,
          rawDataPreview: typeof rawData === 'string' ? rawData.substring(0, 500) : null,
          timestamp: new Date().toISOString()
        });
        
        if (Array.isArray(parsed)) {
          data = parsed;
          logger.info('Successfully parsed response data', 'RidTelemetryService', {
            dataLength: data.length,
            readings: data.map(reading => ({
              stationid: reading.stationid,
              wlvalues: reading.wlvalues,
              qvalues: reading.qvalues,
              hourlytime: reading.hourlytime
            })),
            timestamp: new Date().toISOString()
          });
        } else {
          logger.warn('Response is not an array', 'RidTelemetryService', {
            type: typeof parsed,
            parsedValue: parsed,
            timestamp: new Date().toISOString()
          });
        }
      } else {
        logger.warn('Empty response data', 'RidTelemetryService', {
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.warn('Failed to parse response as JSON', 'RidTelemetryService', {
        error: error instanceof Error ? error.message : String(error),
        rawData: rawData,
        rawDataPreview: typeof rawData === 'string' ? rawData.substring(0, 500) : null,
        timestamp: new Date().toISOString()
      });
    }

    // If status is not 2xx, log as warning
    if (response.status < 200 || response.status >= 300) {
      logger.warn('Non-200 status code received', 'RidTelemetryService', {
        status: response.status,
        statusText: response.statusText,
        responseData: response.data,
        responseHeaders: response.headers,
        timestamp: new Date().toISOString()
      });
    }

    // Parse and validate response
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format from RID API');
    }

    return {
      success: true,
      data: Array.isArray(data) ? data : [data]
    };

  } catch (error) {
    logger.error('Failed to fetch telemetry data', 'RidTelemetryService', { 
      error,
      request,
      errorDetails: {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        code: isAxiosError(error) ? error.code : undefined,
        response: isAxiosError(error) ? {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers,
          config: {
            url: error.response?.config?.url,
            method: error.response?.config?.method,
            headers: error.response?.config?.headers,
            data: error.response?.config?.data
          }
        } : undefined,
        request: requestDetails
      },
      timestamp: new Date().toISOString()
    });

    if (isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        throw {
          status: 503,
          message: 'RID API service is unavailable',
          details: 'Could not connect to RID API server'
        } as TelemetryError;
      }

      if (error.code === 'ETIMEDOUT') {
        throw {
          status: 504,
          message: 'RID API request timed out',
          details: 'Request to RID API server timed out'
        } as TelemetryError;
      }

      const status = error.response?.status || 500;
      const message = error.response?.data || error.message;
      
      throw {
        status,
        message: 'Failed to fetch telemetry data',
        details: typeof message === 'object' ? JSON.stringify(message) : message
      } as TelemetryError;
    }

    throw {
      status: 500,
      message: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    } as TelemetryError;
  }
}

// Test endpoint to verify OAuth and telemetry service
export async function testTelemetryService(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    // Use a known valid station ID from RID
    const testStationId = 'P.1'; // Telemetry station in Thailand
    const timeStart = new Date().toLocaleDateString('th-TH'); // Format date in Thai calendar
    
    logger.info('Testing telemetry service', 'TelemetryService', {
      testStationId,
      timeStart,
      endpoint: TELEMETRY_ENDPOINT,
      timestamp: new Date().toISOString()
    });

    const data = await getTelemetryData({
      stationid: testStationId,
      timestart: timeStart
    });
    
    logger.info('Telemetry test successful', 'TelemetryService', {
      testStationId,
      response: data,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      message: 'Telemetry service test successful',
      details: {
        stationid: testStationId,
        timestart: timeStart,
        data,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    logger.error('Telemetry test failed', 'TelemetryService', {
      error: isErrorWithResponse(error) ? {
        name: error.name,
        message: error.message,
        code: error.code,
        status: error.response?.status,
        responseData: error.response?.data,
        stack: error.stack
      } : error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error,
      timestamp: new Date().toISOString()
    });

    return {
      success: false,
      message: 'Telemetry service test failed',
      details: {
        error: isErrorWithResponse(error) ? {
          name: error.name,
          message: error.message,
          code: error.code,
          status: error.response?.status,
          responseData: error.response?.data
        } : error instanceof Error ? {
          name: error.name,
          message: error.message
        } : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    };
  }
} 