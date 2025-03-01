import axios from 'axios';
import { logger } from '../../utils/logger';

// API configuration for TMD
const THAIWATER_API_ENDPOINT = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/api_service';

// TMD station data
const TMD_STATION_API_MID = '264';
const TMD_STATION_API_EID = 'skbNrh269YFK3TOaTT7074F_kQKPqfo0Ji_UkABKAnbLZiK_ceQ6ii0zx6HsLGOsYbMRu5Ll6d4wrpZ9jB7SHA';

// TMD rainfall data
const TMD_RAINFALL_API_MID = '244';
const TMD_RAINFALL_API_EID = '45I5Oul2YvQ-W-pSmo4z05m_XNRQyS7vl-fTKR2KEUkkvFjoAvQ2KoIsoo7rJFzbkJ2MTom3WYYx54t1YAqurw';

// Types
export interface TMDStationData {
  agency_id: number;
  id: number;
  tele_station_lat: string;
  tele_station_long: string;
  tele_station_name: {
    en?: string;
    th: string;
    jp?: string;
  };
  tele_station_oldcode: string;
}

export interface TMDRainfallData {
  rainfall24h: number;
  rainfall3h: number;
  rainfall_date_calc: string;
  rainfall_datetime: string;
  tele_station_id: number;
}

export interface TMDResponse {
  success: boolean;
  data: TMDStationData[] | TMDRainfallData[];
  error?: string;
  debug?: any;
}

/**
 * Fetches TMD station data from ThaiWater API
 */
export async function getTMDStationInfo(): Promise<TMDResponse> {
  try {
    const url = `${THAIWATER_API_ENDPOINT}?mid=${TMD_STATION_API_MID}&eid=${encodeURIComponent(TMD_STATION_API_EID)}`;
    
    logger.info('[TMDService] Making API request for station information', {
      url,
      timestamp: new Date().toISOString()
    });

    const response = await axios.get<TMDStationData[]>(url);
    
    if (!Array.isArray(response.data)) {
      throw new Error('Invalid response format: expected array');
    }

    logger.info('[TMDService] Station information API response', {
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
    
    logger.error('[TMDService] Station information API request failed', {
      error: error instanceof Error ? error.message : String(error),
      status: errorResponse?.status,
      statusText: errorResponse?.statusText,
      data: errorResponse?.data,
      timestamp: new Date().toISOString()
    });

    return {
      success: false,
      data: [],
      error: `Failed to fetch TMD station information: ${error instanceof Error ? error.message : String(error)}`,
      debug: {
        status: errorResponse?.status,
        data: errorResponse?.data
      }
    };
  }
}

/**
 * Fetches TMD rainfall data from ThaiWater API
 */
export async function getTMDRainfallData(): Promise<TMDResponse> {
  try {
    const url = `${THAIWATER_API_ENDPOINT}?mid=${TMD_RAINFALL_API_MID}&eid=${encodeURIComponent(TMD_RAINFALL_API_EID)}`;
    
    logger.info('[TMDService] Making API request for rainfall data', {
      url,
      timestamp: new Date().toISOString()
    });

    const response = await axios.get<TMDRainfallData[]>(url);
    
    if (!Array.isArray(response.data)) {
      throw new Error('Invalid response format: expected array');
    }

    logger.info('[TMDService] Rainfall data API response', {
      totalRecords: response.data.length,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      data: response.data,
      debug: {
        totalRecords: response.data.length
      }
    };

  } catch (error) {
    const errorResponse = (error as any)?.response;
    
    logger.error('[TMDService] Rainfall data API request failed', {
      error: error instanceof Error ? error.message : String(error),
      status: errorResponse?.status,
      statusText: errorResponse?.statusText,
      data: errorResponse?.data,
      timestamp: new Date().toISOString()
    });

    return {
      success: false,
      data: [],
      error: `Failed to fetch TMD rainfall data: ${error instanceof Error ? error.message : String(error)}`,
      debug: {
        status: errorResponse?.status,
        data: errorResponse?.data
      }
    };
  }
} 