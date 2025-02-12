import axios from 'axios';
import { logger } from '../../utils/logger';

// API configuration
const THAIWATER_API_ENDPOINT = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/api_service';
const THAIWATER_API_MID = '98';
const THAIWATER_API_EID = 'ttDrdkWUP-SAuxsmJtKQunhOBSYVWTn7OpALf_HOL7hH85UpsMPPRKRM8W_AiNpGuAE6_gxMQqGReEXz2Cr1-w';

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

export interface ThaiWaterResponse {
  success: boolean;
  data: ThaiWaterRainfallData[];
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

    // Filter data for our stations using the mapping
    const targetStationIds = Object.values(STATION_ID_MAP);
    const filteredData = response.data.filter(item => 
      targetStationIds.includes(item.tele_station_id)
    );

    logger.info('[ThaiWaterService] API response filtered', {
      totalStations: response.data.length,
      matchedStations: filteredData.length,
      targetStationIds,
      matchedData: filteredData,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      data: filteredData,
      debug: {
        totalStations: response.data.length,
        matchedStations: filteredData.length,
        targetStationIds,
        matchedData: filteredData
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