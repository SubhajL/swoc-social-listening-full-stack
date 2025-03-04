/**
 * HII Stations Service
 * 
 * This service handles fetching and processing station data from the Hydro-Informatics Institute (HII)
 * which operates the ThaiWater service. It provides station information and mapping between
 * our internal station IDs and HII's station IDs.
 */

import axios from 'axios';
import { logger } from '../../utils/logger';

// Base URL for HII API
const HII_API_BASE_URL = 'https://api-v3.thaiwater.net/api/v1/thaiwater30';

// API endpoints
const ENDPOINTS = {
  STATIONS: `${HII_API_BASE_URL}/api_service?service=tele_station&type=json`,
  STATION_TYPES: `${HII_API_BASE_URL}/api_service?service=tele_station_type&type=json`,
  AGENCIES: `${HII_API_BASE_URL}/api_service?service=agency&type=json`,
};

// Types for HII station data
export interface HIIStation {
  id: number;
  tele_station_name: {
    en: string;
    th: string;
  };
  tele_station_lat: string;
  tele_station_long: string;
  tele_station_type: string;
  agency_id: number;
  tele_station_oldcode: string;
  ground_level: number | null;
  left_bank: number | null;
  right_bank: number | null;
  is_warning: string | null;
}

export interface HIIStationType {
  id: number;
  tele_station_type_name: {
    en: string;
    th: string;
  };
}

export interface HIIAgency {
  id: number;
  agency_name: {
    en: string;
    th: string;
  };
  agency_shortname: {
    en: string;
    th: string;
  };
}

export interface HIIResponse<T> {
  success: boolean;
  data: T[];
  error?: string;
  debug?: any;
}

// Station ID mapping (HII station ID -> our station ID)
// This is the reverse mapping of what's in the RainStationCard component
export const HII_STATION_ID_MAP: Record<number, string> = {
  1109570: '7391',  // สชป.1
  494: '7013'       // อุตุสนามบิน
};

/**
 * Fetch all stations from HII API
 */
export async function getAllStations(): Promise<HIIResponse<HIIStation>> {
  try {
    logger.info('[HIIStationsService] Fetching all stations from HII API');
    
    const response = await axios.get<HIIResponse<HIIStation>>(ENDPOINTS.STATIONS);
    
    if (!response.data.success) {
      logger.error('[HIIStationsService] Failed to fetch stations from HII API', {
        error: response.data.error,
        debug: response.data.debug
      });
      return response.data;
    }
    
    logger.info(`[HIIStationsService] Successfully fetched ${response.data.data.length} stations from HII API`);
    return response.data;
  } catch (error) {
    logger.error('[HIIStationsService] Error fetching stations from HII API', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Fetch all station types from HII API
 */
export async function getAllStationTypes(): Promise<HIIResponse<HIIStationType>> {
  try {
    logger.info('[HIIStationsService] Fetching all station types from HII API');
    
    const response = await axios.get<HIIResponse<HIIStationType>>(ENDPOINTS.STATION_TYPES);
    
    if (!response.data.success) {
      logger.error('[HIIStationsService] Failed to fetch station types from HII API', {
        error: response.data.error,
        debug: response.data.debug
      });
      return response.data;
    }
    
    logger.info(`[HIIStationsService] Successfully fetched ${response.data.data.length} station types from HII API`);
    return response.data;
  } catch (error) {
    logger.error('[HIIStationsService] Error fetching station types from HII API', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Fetch all agencies from HII API
 */
export async function getAllAgencies(): Promise<HIIResponse<HIIAgency>> {
  try {
    logger.info('[HIIStationsService] Fetching all agencies from HII API');
    
    const response = await axios.get<HIIResponse<HIIAgency>>(ENDPOINTS.AGENCIES);
    
    if (!response.data.success) {
      logger.error('[HIIStationsService] Failed to fetch agencies from HII API', {
        error: response.data.error,
        debug: response.data.debug
      });
      return response.data;
    }
    
    logger.info(`[HIIStationsService] Successfully fetched ${response.data.data.length} agencies from HII API`);
    return response.data;
  } catch (error) {
    logger.error('[HIIStationsService] Error fetching agencies from HII API', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get our station ID from HII station ID
 */
export function getOurStationId(hiiStationId: number): string | null {
  return HII_STATION_ID_MAP[hiiStationId] || null;
}

/**
 * Find stations by location (approximate matching by name)
 */
export async function findStationsByLocation(
  amphure: string | null, 
  province: string | null
): Promise<HIIStation[]> {
  try {
    logger.info('[HIIStationsService] Finding stations by location', { amphure, province });
    
    // Get all stations
    const response = await getAllStations();
    
    if (!response.success || !response.data.length) {
      logger.warn('[HIIStationsService] No stations found or API request failed');
      return [];
    }
    
    // If no location filters, return all stations
    if (!amphure && !province) {
      return response.data;
    }
    
    // Filter stations by location (approximate matching by coordinates)
    // This is a simplified approach since HII stations don't have explicit amphure/province fields
    // In a real implementation, you would use PostGIS to find stations within the boundaries
    
    // For now, we'll return all stations since we don't have a reliable way to filter by location
    // In the future, this could be enhanced with geocoding or spatial queries
    logger.info('[HIIStationsService] Returning all stations due to lack of location filtering capability');
    return response.data;
  } catch (error) {
    logger.error('[HIIStationsService] Error finding stations by location', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      amphure,
      province
    });
    
    return [];
  }
}

/**
 * Get station details by ID
 */
export async function getStationById(stationId: number): Promise<HIIStation | null> {
  try {
    logger.info(`[HIIStationsService] Getting station details for ID: ${stationId}`);
    
    const response = await getAllStations();
    
    if (!response.success) {
      logger.error('[HIIStationsService] Failed to fetch stations for ID lookup', {
        error: response.error,
        stationId
      });
      return null;
    }
    
    const station = response.data.find(s => s.id === stationId);
    
    if (!station) {
      logger.warn(`[HIIStationsService] No station found with ID: ${stationId}`);
      return null;
    }
    
    logger.info(`[HIIStationsService] Found station: ${station.tele_station_name.en}`);
    return station;
  } catch (error) {
    logger.error('[HIIStationsService] Error getting station by ID', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      stationId
    });
    
    return null;
  }
}

/**
 * Get multiple stations by IDs
 */
export async function getStationsByIds(stationIds: number[]): Promise<HIIStation[]> {
  try {
    logger.info(`[HIIStationsService] Getting stations for ${stationIds.length} IDs`);
    
    const response = await getAllStations();
    
    if (!response.success) {
      logger.error('[HIIStationsService] Failed to fetch stations for IDs lookup', {
        error: response.error,
        stationCount: stationIds.length
      });
      return [];
    }
    
    const stations = response.data.filter(s => stationIds.includes(s.id));
    
    logger.info(`[HIIStationsService] Found ${stations.length} stations out of ${stationIds.length} requested`);
    return stations;
  } catch (error) {
    logger.error('[HIIStationsService] Error getting stations by IDs', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      stationCount: stationIds.length
    });
    
    return [];
  }
}

/**
 * Get HII rain stations filtered by location
 * This function is used by the thaiwater.ts API endpoint
 */
export async function getHIIRainStations(
  amphure?: string,
  tambon?: string,
  province?: string
): Promise<HIIStation[]> {
  try {
    logger.info('[HIIStationsService] Getting HII rain stations by location', {
      amphure,
      tambon,
      province
    });
    
    // Get all stations
    const response = await getAllStations();
    
    if (!response.success || !response.data.length) {
      logger.warn('[HIIStationsService] No stations found or API request failed');
      return [];
    }
    
    // Filter to only include rain stations
    // In a real implementation, you would filter by station type
    // For now, we'll return all stations since we don't have a reliable way to filter
    const rainStations = response.data;
    
    logger.info(`[HIIStationsService] Found ${rainStations.length} rain stations`);
    
    // In a real implementation with PostGIS, you would filter by location here
    // For now, we'll return all rain stations
    logger.info('[HIIStationsService] Returning all rain stations due to lack of location filtering capability');
    
    return rainStations;
  } catch (error) {
    logger.error('[HIIStationsService] Error getting HII rain stations', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      amphure,
      tambon,
      province
    });
    
    return [];
  }
}

export default {
  getAllStations,
  getAllStationTypes,
  getAllAgencies,
  getOurStationId,
  findStationsByLocation,
  getStationById,
  getStationsByIds,
  getHIIRainStations,
  HII_STATION_ID_MAP
}; 