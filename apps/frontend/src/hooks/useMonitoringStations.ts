import { useQuery } from "@tanstack/react-query";
import { MonitoringStationResponse, MonitoringStation } from "@/types/monitoring-station";
import { cleanLocationString } from "@/lib/location-utils";
import { useState, useEffect } from "react";
import { TelemetryStation } from '../types/telemetry';
import { useLocationStore } from '../stores/location';

export interface MonitoringStationsResponse {
  stations: MonitoringStation[];
  error?: string;
  warning?: string;
  message?: string;
}

// Cache for telemetry data to reduce API calls
const telemetryCache: Record<string, { data: any; timestamp: number }> = {};
const TELEMETRY_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

/**
 * Fetches telemetry data for a station with caching
 */
async function fetchTelemetryData(stationId: string): Promise<any> {
  try {
    // Check cache first
    const cacheKey = `telemetry:${stationId}`;
    const cachedData = telemetryCache[cacheKey];
    
    if (cachedData && (Date.now() - cachedData.timestamp) < TELEMETRY_CACHE_TTL) {
      console.log(`[fetchTelemetryData] Using cached telemetry data for station ${stationId}:`, {
        timestamp: new Date(cachedData.timestamp).toISOString(),
        age: Math.round((Date.now() - cachedData.timestamp) / 1000) + 's',
        data: {
          water_level: cachedData.data?.water_level,
          flow_rate: cachedData.data?.flow_rate,
          timestamp: cachedData.data?.timestamp
        }
      });
      return cachedData.data;
    }
    
    // Fetch fresh data
    console.log(`[fetchTelemetryData] Cache miss for station ${stationId}, fetching fresh data`);
    const telemetryUrl = `${import.meta.env.VITE_API_URL}/api/telemetry/${stationId}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    try {
      console.log(`[fetchTelemetryData] Making API request to ${telemetryUrl}`);
      const telemetryResponse = await fetch(telemetryUrl, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (telemetryResponse.ok) {
        const telemetryData = await telemetryResponse.json();
        
        console.log(`[fetchTelemetryData] Successfully fetched telemetry data for station ${stationId}:`, {
          timestamp: new Date().toISOString(),
          data: {
            water_level: telemetryData?.water_level,
            flow_rate: telemetryData?.flow_rate,
            timestamp: telemetryData?.timestamp
          }
        });
        
        // Cache the successful response
        telemetryCache[cacheKey] = {
          data: telemetryData,
          timestamp: Date.now()
        };
        
        console.log(`[fetchTelemetryData] Cached telemetry data for station ${stationId}`);
        
        return telemetryData;
      }
      
      // Handle error responses
      console.error(`[fetchTelemetryData] Error fetching telemetry for station ${stationId}:`, {
        status: telemetryResponse.status,
        statusText: telemetryResponse.statusText,
        timestamp: new Date().toISOString()
      });
      
      return null;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.warn(`[fetchTelemetryData] Telemetry request timed out for station ${stationId}:`, {
          timeout: '8s',
          timestamp: new Date().toISOString()
        });
      } else {
        console.error(`[fetchTelemetryData] Error fetching telemetry for station ${stationId}:`, {
          error: fetchError instanceof Error ? {
            name: fetchError.name,
            message: fetchError.message,
            stack: fetchError.stack
          } : fetchError,
          timestamp: new Date().toISOString()
        });
      }
      
      return null;
    }
  } catch (error) {
    console.error(`[fetchTelemetryData] Unexpected error for station ${stationId}:`, {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error,
      timestamp: new Date().toISOString()
    });
    return null;
  }
}

/**
 * Fetches monitoring stations and their telemetry data
 */
export const fetchMonitoringStations = async (
  amphure?: string,
  province?: string
): Promise<MonitoringStationsResponse> => {
  try {
    console.log(
      `[fetchMonitoringStations] Fetching monitoring stations for:`,
      { amphure, province }
    );
    
    // Clean and normalize strings - ensure consistent casing and trimming
    const cleanedAmphure = amphure ? cleanLocationString(amphure)?.trim() : undefined;
    const cleanedProvince = province ? cleanLocationString(province)?.trim() : undefined;
    
    console.log(
      `[fetchMonitoringStations] Normalized location parameters:`,
      { 
        cleanedAmphure, 
        cleanedProvince, 
        originalAmphure: amphure,
        originalProvince: province,
        charCodesAmphure: cleanedAmphure ? Array.from(cleanedAmphure).map(c => c.charCodeAt(0)) : [],
        charCodesProvince: cleanedProvince ? Array.from(cleanedProvince).map(c => c.charCodeAt(0)) : []
      }
    );
    
    // Check if we have any valid location parameters
    if (!cleanedAmphure && !cleanedProvince) {
      console.warn('[fetchMonitoringStations] Both amphure and province are missing or empty');
      return {
        stations: [],
        message: 'Missing location parameters: both amphure and province are empty'
      };
    }
    
    // Explicitly construct URL with URL object to ensure proper encoding
    const url = new URL(`${import.meta.env.VITE_API_URL}/api/telemetry/stations`);
    
    // Add query parameters for location
    if (cleanedAmphure) {
      url.searchParams.append("amphure", cleanedAmphure);
    }
    if (cleanedProvince) {
      url.searchParams.append("province", cleanedProvince);
    }

    // Added console logs as requested
    console.log('[UI] Fetching telemetry stations', cleanedAmphure, cleanedProvince);
    console.log('[API CALL] ', url.toString());
    
    // Additional detailed logging for character encoding
    console.log('[fetchMonitoringStations] Character encoding details:', {
      amphure: cleanedAmphure ? {
        value: cleanedAmphure,
        length: cleanedAmphure.length,
        normalizedNFC: cleanedAmphure.normalize('NFC'),
        normalizedNFD: cleanedAmphure.normalize('NFD'),
        // Remove Buffer usage for browser compatibility
        codePoints: Array.from(cleanedAmphure).map(c => c.codePointAt(0)?.toString(16))
      } : null,
      province: cleanedProvince ? {
        value: cleanedProvince,
        length: cleanedProvince.length,
        normalizedNFC: cleanedProvince.normalize('NFC'),
        normalizedNFD: cleanedProvince.normalize('NFD'),
        // Remove Buffer usage for browser compatibility
        codePoints: Array.from(cleanedProvince).map(c => c.codePointAt(0)?.toString(16))
      } : null
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); 
    
    try {
      const response = await fetch(url.toString(), {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('[fetchMonitoringStations] API response not OK:', {
          status: response.status,
          statusText: response.statusText,
          url: url.toString()
        });
        throw new Error(`Failed to fetch monitoring stations: ${response.statusText}`);
      }
      
      const data = await response.json();

      console.log('[fetchMonitoringStations] Response structure:', {
        hasData: !!data,
        responseType: typeof data,
        hasStations: data && 'stations' in data,
        hasDataArray: data && 'data' in data,
        firstStationData: data?.data && data.data.length > 0 ? JSON.stringify(data.data[0]).slice(0, 200) : 'none',
        timestamp: new Date().toISOString()
      });

      // Normalize response structure - handle both response formats
      const stationsArray = data?.stations || 
                           (data?.data && Array.isArray(data.data) ? data.data : []);
      
      if (!Array.isArray(stationsArray)) {
        console.warn('[fetchMonitoringStations] Invalid API response format:', {
          dataType: typeof data,
          stationsType: data && typeof data.stations,
          rawData: JSON.stringify(data).substring(0, 200) + '...' // Log just the beginning for brevity
        });
        return {
          stations: [],
          message: 'Invalid API response format'
        };
      }
      
      if (stationsArray.length === 0) {
        console.info('[fetchMonitoringStations] No stations found for location:', {
          amphure: cleanedAmphure,
          province: cleanedProvince,
          url: url.toString(),
          rawResponse: JSON.stringify(data)
        });
        return {
          stations: [],
          message: 'No stations found for this location'
        };
      }
      
      // Log the first station data to help debug telemetry
      if (stationsArray.length > 0) {
        console.log('[fetchMonitoringStations] First station data details:', {
          id: stationsArray[0].id || stationsArray[0].station_id,
          station_name: stationsArray[0].station_name || stationsArray[0].name,
          water_level: stationsArray[0].water_level,
          flow_rate: stationsArray[0].flow_rate,
          reading_time: stationsArray[0].reading_time,
          amphure: stationsArray[0].amphure,
          province: stationsArray[0].province
        });
      }
      
      // Directly use the stationsArray from the API which already contains latest data
      // Map it to the MonitoringStation type expected by the rest of the app
      const finalStations = stationsArray.map((station: any): MonitoringStation => {
         // Extract properties, providing defaults
         const stationIdStr = station.station_id?.toString() || station.id?.toString() || '';
         const waterLevel = station.water_level !== undefined ? parseFloat(station.water_level || 0) : 0;
         const flowRate = station.flow_rate !== undefined ? parseFloat(station.flow_rate || 0) : 0;
         const readingTime = station.reading_time || new Date().toISOString();
         const stationName = station.station_name || station.name || `Station ${stationIdStr || 'Unknown'}`;
         
         // Log telemetry data for debugging
         console.log(`[fetchMonitoringStations] Telemetry data for station ${stationIdStr}:`, {
           water_level: waterLevel,
           flow_rate: flowRate,
           reading_time: readingTime,
           location: { amphure: station.amphure, province: station.province }
         });

         return {
           // Base properties from telemetry_data_stations
           id: station.id, // Keep original ID if it exists (number)
           station_id: stationIdStr,
           station_name: stationName,
           code: station.code || '',
           irrigation_office: station.irrigation_office || '',
           river_basin: station.river_basin || '',
           river_name: station.river_name || '',
           amphure: station.amphure || cleanedAmphure || '',
           province: station.province || cleanedProvince || '',
           bank_level_meters: station.bank_level_meters?.toString() || '0',
           capacity_cms: station.capacity_cms?.toString() || '0',
           pole_center_msl: station.pole_center_msl?.toString() || '0',
           // Add water_level and flow_rate directly from the joined data
           water_level: waterLevel, 
           flow_rate: flowRate,
           // Populate telemetry_data using the joined data
           telemetry_data: {
             water_level: waterLevel,
             flow_rate: flowRate,
             timestamp: readingTime,
             notation: station.notation_string || "" // Assuming notation comes from stations list if available
           }
         };
      });
      
      console.log(`[fetchMonitoringStations] Processed ${finalStations.length} stations with telemetry data:`, {
        firstStation: finalStations.length > 0 ? {
          id: finalStations[0]?.id,
          station_id: finalStations[0]?.station_id,
          water_level: finalStations[0]?.water_level,
          flow_rate: finalStations[0]?.flow_rate,
          telemetry_timestamp: finalStations[0]?.telemetry_data?.timestamp
        } : 'none'
      });

      return {
        stations: finalStations,
        message: `Found ${finalStations.length} monitoring stations`
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('[fetchMonitoringStations] Fetch error:', fetchError);
      return {
        stations: [],
        error: fetchError instanceof Error ? fetchError.message : String(fetchError)
      };
    }
  } catch (error) {
    console.error('[fetchMonitoringStations] Unexpected error:', error);
    return {
      stations: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const CACHE_TIME = 30 * 60 * 1000; // 30 minutes

export const useMonitoringStations = () => {
  const { amphure, province } = useLocationStore();

  const fetchMonitoringStations = async (): Promise<TelemetryStation[]> => {
    try {
      const cleanedAmphure = cleanLocationString(amphure);
      const cleanedProvince = cleanLocationString(province);

      console.log('[useMonitoringStations] Fetching monitoring stations for:', {
        amphure: cleanedAmphure,
        province: cleanedProvince,
        timestamp: new Date().toISOString()
      });

      // Require at least one of amphure or province to be specified
      if (!cleanedAmphure && !cleanedProvince) {
        console.warn('[useMonitoringStations] No location specified, skipping request');
        return [];
      }

      const params = new URLSearchParams();
      if (cleanedAmphure) params.append('amphure', cleanedAmphure);
      if (cleanedProvince) params.append('province', cleanedProvince);

      const url = `${import.meta.env.VITE_API_URL}/api/telemetry/stations?${params.toString()}`;
      // Added console logs as requested
      console.log('[UI] Fetching telemetry stations', cleanedAmphure, cleanedProvince);
      console.log('[API CALL] ', url);
      
      // Additional logging for character encoding
      console.log('[useMonitoringStations] Character encoding debug:', {
        amphure: cleanedAmphure ? {
          value: cleanedAmphure,
          normalized: cleanedAmphure.normalize('NFC'),
          // Remove Buffer usage for browser compatibility
          codePoints: Array.from(cleanedAmphure).map(c => c.codePointAt(0)?.toString(16))
        } : null,
        province: cleanedProvince ? {
          value: cleanedProvince,
          normalized: cleanedProvince.normalize('NFC'),
          // Remove Buffer usage for browser compatibility
          codePoints: Array.from(cleanedProvince).map(c => c.codePointAt(0)?.toString(16))
        } : null
      });

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const response = await fetch(url, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          console.error('[useMonitoringStations] API response not OK:', {
            status: response.status,
            statusText: response.statusText
          });
          throw new Error(`Failed to fetch monitoring stations: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        console.log('[useMonitoringStations] API response:', {
          success: data.success,
          dataCount: data.data?.length || 0,
          locationInfo: data.location || 'not provided',
          timestamp: new Date().toISOString()
        });

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch monitoring stations');
        }

        // Check if we have valid data
        if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
          console.warn('[useMonitoringStations] No stations found for location:', {
            amphure: cleanedAmphure,
            province: cleanedProvince,
            locationFromResponse: data.location
          });
          return [];
        }

        // Safe mapping with null checks for each property
        return data.data.map((station: any) => ({
          id: station.id || station.station_id || '',
          stationId: station.station_id || '',
          name: station.station_name || '',
          dataSource: station.data_source || '',
          latitude: station.latitude ? parseFloat(station.latitude) : 0,
          longitude: station.longitude ? parseFloat(station.longitude) : 0,
          bankFullLevel: station.brae_level ? parseFloat(station.brae_level) : null,
          waterLevel: station.water_level ? parseFloat(station.water_level) : null,
          flowRate: station.flow_rate ? parseFloat(station.flow_rate) : null,
          warnLevel: station.warn_level ? parseFloat(station.warn_level) : null,
          criticalLevel: station.critical_level ? parseFloat(station.critical_level) : null,
          lastUpdate: station.reading_time || station.last_sync || '',
          amphure: station.amphure || '',
          province: station.province || '',
          isSelected: false,
          isDisabled: false,
          zeroGauge: station.zero_gauge ? parseFloat(station.zero_gauge) : null,
          groundLevel: station.ground_level ? parseFloat(station.ground_level) : null
        }));
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.error('[useMonitoringStations] Request timed out after 10 seconds');
          throw new Error('Request timed out. Please try again.');
        }
        
        throw fetchError;
      }
    } catch (error) {
      console.error('[useMonitoringStations] Error:', {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : String(error),
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  };

  return useQuery({
    queryKey: ['monitoringStations', amphure, province],
    queryFn: fetchMonitoringStations,
    staleTime: 15 * 60 * 1000, // 15 minutes (Increased from 5 minutes)
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 3,
    enabled: Boolean(amphure || province) // Enable query if either location is specified
  });
}; 