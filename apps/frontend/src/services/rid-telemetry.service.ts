import { logger } from '@/lib/logger';

// RID Telemetry API configuration
const RID_API_URL = 'http://hyd-app.rid.go.th/webservice/HydroAuthenticateService.svc';
const CONSUMER_KEY = '0f8fad5b-d9cb-469f-a165';
const CONSUMER_SECRET = '7c9e6679-7425-40de-944b';

// RID Telemetry API response types
export interface RIDTelemetryResponse {
  stationid: string;           // Station ID (string in RID API, e.g., 'P.1')
  hourlytime: string;          // Data timestamp in local time
  hourlytimeutc: string;       // Data timestamp in UTC
  wlvalues: number | null;     // Water level (m)
  wlvaluesabove: number | null;// Water level above dam (m)
  qvalues: number | null;      // Flow rate (m³/s)
  qavrvalues: number | null;   // Average daily flow rate (m³/s)
  notationid: number;          // Notation ID for data quality/status
  notationstring: string;      // Human-readable notation description
}

declare const OAuth: any;

interface OAuthMessage {
  action: string;
  method: string;
  parameters: [string, string][];
}

// OAuth 1.0a helper functions using RID's library directly
const generateOAuthHeaders = (endpoint: string, requestData: any) => {
  try {
    // Log initial request data
    logger.info('[RIDTelemetryService] Starting OAuth Process', 'OAuth', {
      endpoint,
      requestData,
      timestamp: new Date().toISOString()
    });

    // Create OAuth message object
    const message: OAuthMessage = {
      action: `${RID_API_URL}/${endpoint}`,
      method: 'POST',
      parameters: []
    };

    // Add OAuth parameters
    OAuth.setTimestampAndNonce(message);
    
    // Log timestamp and nonce
    const timestamp = OAuth.getParameter(message, "oauth_timestamp");
    const nonce = OAuth.getParameter(message, "oauth_nonce");
    logger.info('[RIDTelemetryService] Generated OAuth Parameters', 'OAuth', {
      timestamp,
      nonce,
      consumer_key: CONSUMER_KEY
    });

    OAuth.setParameter(message, "oauth_consumer_key", CONSUMER_KEY);
    OAuth.setParameter(message, "oauth_version", "1.0");
    OAuth.setParameter(message, "oauth_signature_method", "HMAC-SHA1");

    // Add request data parameters
    if (requestData?.hydro) {
      Object.entries(requestData.hydro).forEach(([key, value]) => {
        OAuth.setParameter(message, `hydro.${key}`, value as string);
        logger.debug('[RIDTelemetryService] Added Parameter', 'OAuth', { 
          key: `hydro.${key}`, 
          value 
        });
      });
    }

    // Log all parameters before signature
    logger.info('[RIDTelemetryService] Parameters Before Signing', 'OAuth', {
      parameters: message.parameters.map(([key, value]) => ({ key, value })),
      timestamp: new Date().toISOString()
    });

    // Generate signature
    const accessor = {
      consumerSecret: CONSUMER_SECRET,
      tokenSecret: ''
    };

    // Get base string before signing
    const baseString = OAuth.SignatureMethod.getBaseString(message);
    logger.info('[RIDTelemetryService] Generated Base String', 'OAuth', {
      baseString,
      timestamp: new Date().toISOString()
    });

    // Get normalized URL for verification
    const normalizedUrl = OAuth.SignatureMethod.normalizeUrl(message.action);
    logger.info('[RIDTelemetryService] Normalized URL', 'OAuth', {
      original: message.action,
      normalized: normalizedUrl
    });

    // Get normalized parameters for verification
    const normalizedParams = OAuth.SignatureMethod.normalizeParameters(message.parameters);
    logger.info('[RIDTelemetryService] Normalized Parameters', 'OAuth', {
      normalizedParams,
      timestamp: new Date().toISOString()
    });

    OAuth.SignatureMethod.sign(message, accessor);

    // Get signature after signing
    const signature = OAuth.getParameter(message, "oauth_signature");
    logger.info('[RIDTelemetryService] Generated Signature', 'OAuth', {
      signature,
      timestamp: new Date().toISOString()
    });

    // Get authorization header using RID's library
    const authHeader = OAuth.getAuthorizationHeader("", message.parameters);

    // Log final OAuth state
    logger.info('[RIDTelemetryService] Final OAuth State', 'OAuth', {
      url: message.action,
      method: message.method,
      parameters: message.parameters.map(([key, value]) => ({ key, value })),
      baseString,
      signature,
      authHeader: authHeader.split(',').map((part: string) => part.trim()),
      timestamp: new Date().toISOString()
    });

    return authHeader;
  } catch (error) {
    logger.error('[RIDTelemetryService] OAuth Generation Error', 'OAuth', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

class RIDTelemetryService {
  private async fetchWithAuth(endpoint: string, data: any) {
    try {
      const url = `${RID_API_URL}/${endpoint}`;
      console.log('[RIDTelemetryService] Starting Request:', { url, data });

      const authHeader = generateOAuthHeaders(endpoint, data);
      
      const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': authHeader
      };

      // Log complete request details with parsed auth header
      console.log('[RIDTelemetryService] Sending Request:', {
        url,
        method: 'POST',
        headers: {
          ...headers,
          'Authorization': authHeader.split(',').map((part: string) => part.trim())
        },
        body: JSON.stringify(data, null, 2)
      });

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      });

      // Log response headers
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[RIDTelemetryService] Request Failed:', {
          status: response.status,
          statusText: response.statusText,
          errorText,
          responseHeaders,
          url,
          requestHeaders: {
            ...headers,
            'Authorization': authHeader.split(',').map((part: string) => part.trim())
          },
          requestBody: data
        });
        throw new Error(`RID API request failed: ${response.status} ${response.statusText}\n${errorText}`);
      }

      const responseData = await response.json();
      console.log('[RIDTelemetryService] Request Successful:', {
        endpoint,
        responseStatus: response.status,
        responseHeaders,
        dataLength: Array.isArray(responseData) ? responseData.length : 1
      });

      return responseData;
    } catch (error) {
      console.error('[RIDTelemetryService] Request Error:', error);
      throw error;
    }
  }

  async getHourlyData(stationId: string): Promise<RIDTelemetryResponse[]> {
    const today = new Date();
    const formattedDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear() + 543}`;

    logger.info('[RIDTelemetryService]', 'Fetching Hourly Data', {
      stationId,
      date: formattedDate,
      timestamp: new Date().toISOString()
    });

    const data = {
      hydro: {
        StationID: stationId,
        TimeStart: formattedDate
      }
    };

    return this.fetchWithAuth('getHourlyTodayFromStationID', data);
  }

  async getStationList(hydroId: string) {
    const data = {
      hydro: {
        HydroID: hydroId
      }
    };

    return this.fetchWithAuth('getHourlyStationList', data);
  }

  async testAlternativeAuth(stationId: string): Promise<RIDTelemetryResponse[]> {
    const today = new Date();
    const formattedDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear() + 543}`;

    // Test with original RID example format
    const data = {
      hydro: {
        StationID: stationId,  // Using original case from RID docs
        TimeStart: formattedDate
      }
    };

    logger.info('[RIDTelemetryService]', 'Testing Alternative Auth', {
      stationId,
      date: formattedDate,
      timestamp: new Date().toISOString()
    });

    return this.fetchWithAuth('getHourlyTodayFromStationID', data);
  }
}

export const ridTelemetryService = new RIDTelemetryService(); 