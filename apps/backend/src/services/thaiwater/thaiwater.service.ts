import axios from 'axios';
import { logger } from '../../utils/logger';

// API configuration
const THAIWATER_API_ENDPOINT = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/api_service';
const THAIWATER_API_MID = '98';
const THAIWATER_API_EID = 'ttDrdkWUP-SAuxsmJtKQunhOBSYVWTn7OpALf_HOL7hH85UpsMPPRKRM8W_AiNpGuAE6_gxMQqGReEXz2Cr1-w';

// API configuration for station information
const THAIWATER_STATION_API_MID = '105';
const THAIWATER_STATION_API_EID = 'CM54nw9Jts6piDUgwVJME5_0-uk0EJbI50ygxq3CQ95fuFWsNzCiGn6kpUHasd7XBUDYysU-ZVJpiIpDr9iqjg';

// Types
export interface ThaiWaterRainfallData {
  rainfall10m: number;
  rainfall1h: number;
  rainfall24h: number;
  rainfall_date_calc: string;
  rainfall_datetime: string;
  rainfall_today: number;
  tele_station_id: number;
}

export interface ThaiWaterStationData {
  agency_id: number;
  ground_level: number | null;
  id: number;
  is_warning: string | null;
  left_bank: number | null;
  right_bank: number | null;
  tele_station_lat: string;
  tele_station_long: string;
  tele_station_name: {
    en?: string;
    th: string;
    jp?: string;
  };
  tele_station_offset: any;
  tele_station_oldcode: string;
  tele_station_type: string;
}

export interface ThaiWaterResponse {
  success: boolean;
  data: ThaiWaterRainfallData[] | ThaiWaterStationData[];
  error?: string;
  debug?: any;
}

// Station ID mapping (our station_id -> ThaiWater tele_station_id)
const STATION_ID_MAP: Record<string, number> = {
  '7391': 1109570,  // สชป.1
  '7013': 494       // อุตุสนามบิน
};

/**
 * Fetches rainfall data from ThaiWater API
 */
export async function getRainfallData(): Promise<ThaiWaterResponse> {
  try {
    const url = `${THAIWATER_API_ENDPOINT}?mid=${THAIWATER_API_MID}&eid=${encodeURIComponent(THAIWATER_API_EID)}`;
    
    logger.info('[ThaiWaterService] Making API request', {
      url,
      timestamp: new Date().toISOString()
    });

    const response = await axios.get<ThaiWaterRainfallData[]>(url);
    
    if (!Array.isArray(response.data)) {
      throw new Error('Invalid response format: expected array');
    }

    // Return all station data from API instead of filtering
    logger.info('[ThaiWaterService] API response', {
      totalStations: response.data.length,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      data: response.data,
      debug: {
        totalStations: response.data.length
      }
    };

  } catch (error) {
    const errorResponse = (error as any)?.response;
    
    logger.error('[ThaiWaterService] API request failed', {
      error: error instanceof Error ? error.message : String(error),
      status: errorResponse?.status,
      statusText: errorResponse?.statusText,
      data: errorResponse?.data,
      timestamp: new Date().toISOString()
    });

    return {
      success: false,
      data: [],
      error: `Failed to fetch rainfall data: ${error instanceof Error ? error.message : String(error)}`,
      debug: {
        status: errorResponse?.status,
        data: errorResponse?.data
      }
    };
  }
}

/**
 * Fetches telemetry station information from ThaiWater API
 */
export async function getStationInfo(): Promise<ThaiWaterResponse> {
  try {
    const url = `${THAIWATER_API_ENDPOINT}?mid=${THAIWATER_STATION_API_MID}&eid=${encodeURIComponent(THAIWATER_STATION_API_EID)}`;
    
    logger.info('[ThaiWaterService] Making API request for station information', {
      url,
      timestamp: new Date().toISOString()
    });

    const response = await axios.get<ThaiWaterStationData[]>(url);
    
    if (!Array.isArray(response.data)) {
      throw new Error('Invalid response format: expected array');
    }

    logger.info('[ThaiWaterService] Station information API response', {
      totalStations: response.data.length,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      data: response.data,
      debug: {
        totalStations: response.data.length
      }
    };

  } catch (error) {
    const errorResponse = (error as any)?.response;
    
    logger.error('[ThaiWaterService] Station information API request failed', {
      error: error instanceof Error ? error.message : String(error),
      status: errorResponse?.status,
      statusText: errorResponse?.statusText,
      data: errorResponse?.data,
      timestamp: new Date().toISOString()
    });

    return {
      success: false,
      data: [],
      error: `Failed to fetch station information: ${error instanceof Error ? error.message : String(error)}`,
      debug: {
        status: errorResponse?.status,
        data: errorResponse?.data
      }
    };
  }
} 