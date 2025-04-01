import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useStationManagement } from './useStationManagement';
import { MonitoringStation, RainStation, Reservoir } from '@/atoms/stationData';
import { ensureStringId } from '@/utils/stationTypeGuards';

interface Location {
  amphure?: string;
  province?: string;
}

interface StationDataFetcherResult {
  // Station data
  monitoringStations: MonitoringStation[];
  rainStations: RainStation[];
  reservoirs: Reservoir[];
  
  // Loading states
  isLoadingMonitoring: boolean;
  isLoadingRain: boolean;
  isLoadingReservoirs: boolean;
  isLoading: boolean;
  
  // Refresh states
  isRefreshing: boolean;
  
  // Error states
  monitoringError: any;
  rainError: any;
  reservoirsError: any;
  
  // Utility functions
  refreshAll: () => Promise<void>;
  refreshMonitoring: () => Promise<void>;
  refreshRain: () => Promise<void>;
  refreshReservoirs: () => Promise<void>;
}

// Cache for telemetry data to reduce API calls
const telemetryCache: Record<string, { data: any; timestamp: number }> = {};
const TELEMETRY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetches telemetry data for a station with caching
 */
async function fetchTelemetryData(stationId: string | number): Promise<any> {
  try {
    // Ensure consistent string ID format
    const formattedId = ensureStringId(stationId);

    // Check cache first
    const cacheKey = `telemetry:${formattedId}`;
    const cachedData = telemetryCache[cacheKey];
    
    if (cachedData && (Date.now() - cachedData.timestamp) < TELEMETRY_CACHE_TTL) {
      console.log(`[fetchTelemetryData] Using cached telemetry data for station ${formattedId}`);
      return cachedData.data;
    }
    
    // Fetch fresh data
    console.log(`[fetchTelemetryData] Fetching fresh telemetry data for station ${formattedId}`);
    const telemetryUrl = `${import.meta.env.VITE_API_URL}/api/telemetry/${formattedId}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    try {
      const telemetryResponse = await fetch(telemetryUrl, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (telemetryResponse.ok) {
        const telemetryData = await telemetryResponse.json();
        
        // Cache the successful response
        telemetryCache[cacheKey] = {
          data: telemetryData,
          timestamp: Date.now()
        };
        
        return telemetryData;
      }
      
      // Handle error responses
      console.error(`[fetchTelemetryData] Error fetching telemetry for station ${formattedId}:`, {
        status: telemetryResponse.status,
        statusText: telemetryResponse.statusText
      });
      
      return null;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.warn(`[fetchTelemetryData] Telemetry request timed out for station ${formattedId}`);
      } else {
        console.error(`[fetchTelemetryData] Error fetching telemetry for station ${formattedId}:`, fetchError);
      }
      
      return null;
    }
  } catch (error) {
    console.error(`[fetchTelemetryData] Unexpected error for station ${stationId}:`, error);
    return null;
  }
}

/**
 * Enhances monitoring stations with real-time telemetry data
 */
async function enhanceMonitoringStationsWithTelemetry(stations: MonitoringStation[]): Promise<MonitoringStation[]> {
  if (!stations || stations.length === 0) return stations;
  
  const enhancedStations = await Promise.all(
    stations.map(async (station) => {
      try {
        // Only fetch telemetry data if we have a station_id
        if (!station.station_id) return station;
        
        const telemetryData = await fetchTelemetryData(station.station_id);
        
        if (!telemetryData || !telemetryData.success) {
          return station;
        }
        
        // Extract the data from the response
        const { data } = telemetryData;
        
        if (!data || (Array.isArray(data) && data.length === 0)) {
          return station;
        }
        
        // Process data array or single object
        const latestData = Array.isArray(data) ? data[0] : data;
        
        // Check for water_level and flow_rate in the data
        // Use type assertion to access properties that might not be in the type definition
        const stationAny = station as any;
        const waterLevel = latestData.water_level !== undefined ? parseFloat(latestData.water_level) : stationAny.water_level;
        const flowRate = latestData.flow_rate !== undefined ? parseFloat(latestData.flow_rate) : stationAny.flow_rate;
        const readingTime = latestData.reading_time || new Date().toISOString();
        
        console.log(`[enhanceMonitoringStationsWithTelemetry] Enhanced station ${station.station_id} with telemetry data:`, {
          waterLevel,
          flowRate,
          readingTime
        });
        
        // Return enhanced station with real-time data
        return {
          ...station,
          water_level: waterLevel,
          flow_rate: flowRate,
          telemetry_data: {
            water_level: waterLevel,
            flow_rate: flowRate,
            timestamp: readingTime,
            notation: ''
          }
        } as MonitoringStation; // Type assertion needed because we're adding additional properties
      } catch (error) {
        console.error(`[enhanceMonitoringStationsWithTelemetry] Error enhancing station ${station.id}:`, error);
        return station;
      }
    })
  );
  
  return enhancedStations;
}

/**
 * Custom hook that provides optimized station data fetching for WaterLevelInfoCard
 * Prevents unnecessary re-renders during refreshes
 * @param location The location (amphure/province) to fetch data for
 * @returns Optimized station data with manual refresh capabilities
 */
export function useStationDataFetcher(location: Location): StationDataFetcherResult {
  // Track refresh states
  const refreshingRef = useRef(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Track enhanced monitoring stations
  const [enhancedMonitoringStations, setEnhancedMonitoringStations] = useState<MonitoringStation[]>([]);
  
  // Get raw station data from the management hook
  const {
    allAvailableMonitoringStations,
    allAvailableRainStations,
    allAvailableReservoirs,
    
    isLoadingMonitoring,
    isLoadingRain,
    isLoadingReservoirs,
    
    monitoringError,
    rainError,
    reservoirsError,
    
    updateLocation,
    syncMonitoring,
    syncRain,
    syncReservoirs
  } = useStationManagement();
  
  // Convert to booleans to ensure type safety
  const safeIsLoadingMonitoring = Boolean(isLoadingMonitoring);
  const safeIsLoadingRain = Boolean(isLoadingRain);
  const safeIsLoadingReservoirs = Boolean(isLoadingReservoirs);
  
  // Derive combined loading state
  const isLoading = useMemo(() => 
    safeIsLoadingMonitoring || safeIsLoadingRain || safeIsLoadingReservoirs,
    [safeIsLoadingMonitoring, safeIsLoadingRain, safeIsLoadingReservoirs]
  );
  
  // Create a ref at top level to store the previous location key
  const prevLocationKeyRef = useRef<string>('');
  
  // Update location when it changes
  const { amphure, province } = location;
  useEffect(() => {
    if (!amphure || !province) {
      console.log('[useStationDataFetcher] Missing location data, skipping fetch');
      return;
    }
    
    // Generate the location key
    const locationKey = `${amphure}:${province}`;
    
    // Skip if it's the same location we already processed
    if (prevLocationKeyRef.current === locationKey) {
      console.log('[useStationDataFetcher] Location unchanged, skipping updateLocation call');
      return;
    }
    
    // Update the ref with the current location
    prevLocationKeyRef.current = locationKey;
    
    // Log before fetchTelemetryStations() is called - this is the point where we update location
    console.log('[UI] Fetching telemetry stations', amphure, province);
    
    // Log the exact character encoding for debugging
    console.log('[Debug] Telemetry location character details:', {
      amphure: {
        value: amphure,
        normalizedNFC: amphure.normalize('NFC'),
        length: amphure.length,
        // Use alternative to Buffer for browser environment
        codePoints: Array.from(amphure).map(c => c.codePointAt(0)?.toString(16))
      },
      province: {
        value: province,
        normalizedNFC: province.normalize('NFC'),
        length: province.length,
        // Use alternative to Buffer for browser environment
        codePoints: Array.from(province).map(c => c.codePointAt(0)?.toString(16))
      }
    });
    
    updateLocation(amphure, province);
  }, [amphure, province, updateLocation]);
  
  // Create a ref at top level to store the previous station IDs
  const prevStationIdsRef = useRef<string>('');
  
  // Enhance monitoring stations with telemetry data when they change
  useEffect(() => {
    // Skip if still loading
    if (safeIsLoadingMonitoring) return;
    
    // Skip if no stations available
    if (!allAvailableMonitoringStations || allAvailableMonitoringStations.length === 0) {
      setEnhancedMonitoringStations([]);
      return;
    }
    
    // Check if stations have actually changed using station IDs
    const stationIds = allAvailableMonitoringStations.map(station => station.id).sort().join(',');
    
    if (prevStationIdsRef.current === stationIds) {
      console.log('[useStationDataFetcher] Monitoring stations unchanged, skipping telemetry fetch');
      return;
    }
    
    // Update the ref with the current station IDs
    prevStationIdsRef.current = stationIds;
    
    console.log('[useStationDataFetcher] Enhancing monitoring stations with telemetry data:', 
      allAvailableMonitoringStations.length);
    
    // Fetch telemetry data for all stations
    enhanceMonitoringStationsWithTelemetry(allAvailableMonitoringStations)
      .then(enhanced => {
        setEnhancedMonitoringStations(enhanced);
      })
      .catch(error => {
        console.error('[useStationDataFetcher] Error enhancing stations:', error);
        // Fall back to non-enhanced stations on error
        setEnhancedMonitoringStations(allAvailableMonitoringStations);
      });
  }, [allAvailableMonitoringStations, safeIsLoadingMonitoring]);
  
  // Create optimized refresh functions that won't trigger unnecessary re-renders
  const refreshMonitoring = useCallback(async () => {
    if (refreshingRef.current) return;
    
    refreshingRef.current = true;
    setIsRefreshing(true);
    
    try {
      await Promise.resolve(syncMonitoring());
      
      // After syncing, refresh telemetry data for enhanced stations
      if (enhancedMonitoringStations.length > 0) {
        const refreshedStations = await enhanceMonitoringStationsWithTelemetry(enhancedMonitoringStations);
        setEnhancedMonitoringStations(refreshedStations);
      }
    } catch (error) {
      console.error('[useStationDataFetcher] Error refreshing monitoring stations:', error);
    } finally {
      setIsRefreshing(false);
      refreshingRef.current = false;
    }
  }, [syncMonitoring, enhancedMonitoringStations]);
  
  const refreshRain = useCallback(async () => {
    if (refreshingRef.current) return;
    
    refreshingRef.current = true;
    setIsRefreshing(true);
    
    try {
      await Promise.resolve(syncRain());
    } catch (error) {
      console.error('[useStationDataFetcher] Error refreshing rain stations:', error);
    } finally {
      setIsRefreshing(false);
      refreshingRef.current = false;
    }
  }, [syncRain]);
  
  const refreshReservoirs = useCallback(async () => {
    if (refreshingRef.current) return;
    
    refreshingRef.current = true;
    setIsRefreshing(true);
    
    try {
      await Promise.resolve(syncReservoirs());
    } catch (error) {
      console.error('[useStationDataFetcher] Error refreshing reservoirs:', error);
    } finally {
      setIsRefreshing(false);
      refreshingRef.current = false;
    }
  }, [syncReservoirs]);
  
  // Combined refresh function
  const refreshAll = useCallback(async () => {
    if (refreshingRef.current) return;
    
    refreshingRef.current = true;
    setIsRefreshing(true);
    
    try {
      // Run refreshes in parallel
      await Promise.all([
        Promise.resolve(syncMonitoring()).catch(err => console.error('[useStationDataFetcher] Error syncing monitoring:', err)),
        Promise.resolve(syncRain()).catch(err => console.error('[useStationDataFetcher] Error syncing rain:', err)),
        Promise.resolve(syncReservoirs()).catch(err => console.error('[useStationDataFetcher] Error syncing reservoirs:', err))
      ]);
      
      // After syncing, refresh telemetry data for enhanced stations
      if (enhancedMonitoringStations.length > 0) {
        const refreshedStations = await enhanceMonitoringStationsWithTelemetry(enhancedMonitoringStations);
        setEnhancedMonitoringStations(refreshedStations);
      }
    } catch (error) {
      console.error('[useStationDataFetcher] Error refreshing all stations:', error);
    } finally {
      setIsRefreshing(false);
      refreshingRef.current = false;
    }
  }, [syncMonitoring, syncRain, syncReservoirs, enhancedMonitoringStations]);
  
  return {
    // Return enhanced monitoring stations instead of raw ones
    monitoringStations: enhancedMonitoringStations.length > 0 
      ? enhancedMonitoringStations 
      : allAvailableMonitoringStations,
    rainStations: allAvailableRainStations,
    reservoirs: allAvailableReservoirs,
    
    // Loading states
    isLoadingMonitoring: safeIsLoadingMonitoring,
    isLoadingRain: safeIsLoadingRain,
    isLoadingReservoirs: safeIsLoadingReservoirs,
    isLoading,
    
    // Refresh states
    isRefreshing,
    
    // Error states
    monitoringError,
    rainError,
    reservoirsError,
    
    // Utility functions
    refreshAll,
    refreshMonitoring,
    refreshRain,
    refreshReservoirs
  };
} 