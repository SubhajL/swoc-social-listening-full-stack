import { atom, useAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { fetchRainStations } from '@/hooks/useRainStations';
import { fetchMonitoringStations } from '@/hooks/useMonitoringStations';
import { fetchReservoirs } from '@/hooks/useReservoirs';
import { locationAtom } from './location';

// Define types for station data
export interface MonitoringStation {
  id: string;
  station_id: string;
  station_name: string;
  name: string;
  location: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  status: 'active' | 'inactive' | 'maintenance';
  lastReading?: {
    timestamp: string;
    value: number;
    unit: string;
  };
  type: 'monitoring';
  source?: 'system' | 'user';
  telemetry_data?: {
    water_level: number;
    flow_rate: number;
    timestamp: string;
    notation?: string;
  };
}

export interface RainStation {
  id: string;
  name: string;
  name_th?: string | null;
  latitude: number;
  longitude: number;
  station_type?: string;
  data_source?: string;
  province?: string | null;
  amphure?: string | null;
  tambon?: string | null;
  rainfall?: {
    daily?: number;
    hourly?: number;
    tenMinutes?: number;
    threeHours?: number;
    timestamp?: string;
  };
  rainfall_3d?: number;
  rainfall_7d?: number;
  rainfall10m?: number | null;
  rainfall1h?: number | null;
  rainfall3h?: number | null;
  rainfall24h?: number | null;
  rainfall_today?: number | null;
  rainfall_date_calc?: string | null;
  rainfall_datetime?: string | null;
}

export interface Reservoir {
  id: string;
  name: string;
  location: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  status: 'active' | 'inactive' | 'maintenance';
  capacity: number;
  currentLevel: number;
  percentFull: number;
  type: 'reservoir';
  source?: 'system' | 'user';
}

// Interface for station data (for type safety)
export interface StationData {
  monitoringStations: MonitoringStation[];
  rainStations: RainStation[];
  reservoirs: Reservoir[];
  
  // User-selected stations (added manually)
  userSelectedMonitoringStations: MonitoringStation[];
  userSelectedRainStations: RainStation[];
  userSelectedReservoirs: Reservoir[];
  
  // Disabled stations (deleted by user)
  disabledMonitoringStations: Record<string, boolean>;
  disabledRainStations: Record<string, boolean>;
  disabledReservoirs: Record<string, boolean>;
}

// Initialize state
const initialStationData: StationData = {
  monitoringStations: [],
  rainStations: [],
  reservoirs: [],
  userSelectedMonitoringStations: [],
  userSelectedRainStations: [],
  userSelectedReservoirs: [],
  disabledMonitoringStations: {},
  disabledRainStations: {},
  disabledReservoirs: {}
};

// Create atoms for each piece of state
export const monitoringStationsAtom = atomWithStorage<MonitoringStation[]>(
  'monitoringStations',
  initialStationData.monitoringStations
);

export const rainStationsAtom = atomWithStorage<RainStation[]>(
  'rainStations',
  initialStationData.rainStations
);

export const reservoirsAtom = atomWithStorage<Reservoir[]>(
  'reservoirs',
  initialStationData.reservoirs
);

// Base atoms without logging
export const userSelectedMonitoringStationsAtom = atomWithStorage<MonitoringStation[]>(
  'user-selected-monitoring-stations',
  []
);

// Derived atom for logging user selected stations
export const userSelectedMonitoringStationsLogAtom = atom(
  (get) => {
    const stations = get(userSelectedMonitoringStationsAtom);
    console.log('[userSelectedMonitoringStationsAtom] User selection updated:', {
      count: stations.length,
      stations: stations.map(s => ({
        id: s.id,
        station_id: s.station_id,
        name: s.station_name
      })),
      timestamp: new Date().toISOString()
    });
    return stations;
  }
);

export const userSelectedRainStationsAtom = atomWithStorage<RainStation[]>(
  'userSelectedRainStations',
  initialStationData.userSelectedRainStations
);

export const userSelectedReservoirsAtom = atomWithStorage<Reservoir[]>(
  'userSelectedReservoirs',
  initialStationData.userSelectedReservoirs
);

// Base atom without logging
export const disabledMonitoringStationsAtom = atomWithStorage<Record<string, boolean>>(
  'disabled-monitoring-stations',
  {}
);

// Derived atom for logging disabled stations
export const disabledMonitoringStationsLogAtom = atom(
  (get) => {
    const disabled = get(disabledMonitoringStationsAtom);
    console.log('[disabledMonitoringStationsAtom] Disabled stations updated:', {
      count: Object.keys(disabled).length,
      disabledIds: Object.keys(disabled),
      timestamp: new Date().toISOString()
    });
    return disabled;
  }
);

export const disabledRainStationsAtom = atomWithStorage<Record<string, boolean>>(
  'disabledRainStations',
  initialStationData.disabledRainStations
);

export const disabledReservoirsAtom = atomWithStorage<Record<string, boolean>>(
  'disabledReservoirs',
  initialStationData.disabledReservoirs
);

// Navigation and UI state
export const navigatingAfterSaveAtom = atom<boolean>(false);
export const editSessionStatusAtom = atom<{
  hasChanges: boolean;
  lastEditTimestamp: number;
  changedStationTypes: ('monitoring' | 'rain' | 'reservoir')[];
}>({
  hasChanges: false,
  lastEditTimestamp: 0,
  changedStationTypes: []
});

// Derived atoms
export const allStationDataAtom = atom<StationData>((get) => ({
  monitoringStations: get(monitoringStationsAtom),
  rainStations: get(rainStationsAtom),
  reservoirs: get(reservoirsAtom),
  userSelectedMonitoringStations: get(userSelectedMonitoringStationsAtom),
  userSelectedRainStations: get(userSelectedRainStationsAtom),
  userSelectedReservoirs: get(userSelectedReservoirsAtom),
  disabledMonitoringStations: get(disabledMonitoringStationsAtom),
  disabledRainStations: get(disabledRainStationsAtom),
  disabledReservoirs: get(disabledReservoirsAtom)
}));

// Derived atom for station counts
export const stationCountsAtom = atom((get) => {
  const monitoringStations = get(monitoringStationsAtom);
  const rainStations = get(rainStationsAtom);
  const reservoirs = get(reservoirsAtom);
  const userSelectedMonitoringStations = get(userSelectedMonitoringStationsAtom);
  const userSelectedRainStations = get(userSelectedRainStationsAtom);
  const userSelectedReservoirs = get(userSelectedReservoirsAtom);
  
  return {
    totalMonitoringStations: monitoringStations.length,
    totalRainStations: rainStations.length,
    totalReservoirs: reservoirs.length,
    selectedMonitoringStations: userSelectedMonitoringStations.length,
    selectedRainStations: userSelectedRainStations.length,
    selectedReservoirs: userSelectedReservoirs.length,
    totalStations: monitoringStations.length + rainStations.length + reservoirs.length,
    totalSelectedStations: userSelectedMonitoringStations.length + userSelectedRainStations.length + userSelectedReservoirs.length
  };
});

// Location atoms for tracking current location
export const currentAmphureAtom = atom<string | undefined>(undefined);
export const currentProvinceAtom = atom<string | undefined>(undefined);

// Derived atoms for API data with location dependency
export const monitoringStationsQueryAtom = atom(
  async (get) => {
    const amphure = get(currentAmphureAtom);
    const province = get(currentProvinceAtom);
    
    console.log('[monitoringStationsQueryAtom] Query triggered:', {
      amphure,
      province,
      timestamp: new Date().toISOString(),
      hasAmphure: !!amphure,
      hasProvince: !!province
    });

    // Add check: Only fetch if both amphure and province are defined
    if (!amphure || !province) {
      console.log('[monitoringStationsQueryAtom] Missing location data:', { 
        amphure, 
        province, 
        timestamp: new Date().toISOString() 
      });
      return []; // Return empty array if location is incomplete
    }

    console.log('[monitoringStationsQueryAtom] Initiating API fetch:', { 
      amphure, 
      province, 
      timestamp: new Date().toISOString() 
    });
    try {
      // Pass amphure and province as separate arguments
      const response = await fetchMonitoringStations(amphure, province);
      const stationsCount = response?.stations?.length ?? 0;
      console.log('[monitoringStationsQueryAtom] API response received:', { 
        stationsCount,
        // Use !!response.stations as success indicator based on previous code
        success: !!response?.stations,
        location: { province, amphure },
        timestamp: new Date().toISOString(),
        firstStation: stationsCount > 0 ? response.stations[0] : null
      });
      // Return response.stations, defaulting to empty array
      return response?.stations ?? []; 
    } catch (error) {
      console.error('[monitoringStationsQueryAtom] Error fetching monitoring stations:', { 
        error, 
        location: { province, amphure },
        timestamp: new Date().toISOString() 
      });
      return []; // Return empty array on error
    }
  }
);

export const rainStationsQueryAtom = atom(
  async (get) => {
    const amphure = get(currentAmphureAtom);
    const province = get(currentProvinceAtom);
    console.log('[rainStationsQueryAtom] Fetching rain stations:', { amphure, province });

    // Add check: Only fetch if both amphure and province are defined
    if (!amphure || !province) {
      console.log('[rainStationsQueryAtom] No location data, returning empty array');
      return [];
    }

    console.log('[rainStationsQueryAtom] Fetching from API with:', { amphure, province });
    try {
      // Pass amphure and province as separate arguments, include 'ALL'
      const response = await fetchRainStations(amphure, province, 'ALL');
      console.log('[rainStationsQueryAtom] API response:', { 
        success: response?.success, 
        total: response?.total,
        meta: response?.meta // Log meta if needed
      });
      // Return response.stations, defaulting to empty array
      return response?.stations ?? [];
    } catch (error) {
      console.error('[rainStationsQueryAtom] Error fetching rain stations:', {
        error, 
        location: { province, amphure }
      });
      return []; // Return empty array on error
    }
  }
);

// Add a new atom for filtering by data source
export const selectedRainDataSourceAtom = atomWithStorage<'TMD' | 'HII' | 'ALL'>('selectedRainDataSource', 'ALL');

// Add a new atom for filtered rain stations
export const filteredRainStationsAtom = atom(
  (get) => {
    const rainStations = get(rainStationsAtom);
    const dataSource = get(selectedRainDataSourceAtom);
    
    if (dataSource === 'ALL') {
      return rainStations;
    }
    
    return rainStations.filter(station => station.data_source === dataSource);
  }
);

export const reservoirsQueryAtom = atom(
  async (get) => {
    const amphure = get(currentAmphureAtom);
    const province = get(currentProvinceAtom);
    
    console.log('[reservoirsQueryAtom] Fetching reservoirs:', { 
      amphure, 
      province, 
      timestamp: new Date().toISOString() 
    });

    // Add check: Only fetch if both amphure and province are defined
    if (!amphure || !province) {
      console.log('[reservoirsQueryAtom] No location data, returning empty array');
      return [];
    }

    console.log('[reservoirsQueryAtom] Fetching from API with:', { amphure, province });
    try {
      // Pass amphure and province as separate arguments
      const response = await fetchReservoirs(amphure, province);
      const reservoirsCount = response?.reservoirs?.length ?? 0;
      console.log('[reservoirsQueryAtom] API response:', { 
        reservoirsCount,
        // Use !!response.reservoirs as success indicator based on previous code
        success: !!response?.reservoirs 
      });
      // Return response.reservoirs, defaulting to empty array
      return response?.reservoirs ?? [];
    } catch (error) {
      console.error('[reservoirsQueryAtom] Error fetching reservoirs:', {
        error, 
        location: { province, amphure }
      });
      return []; // Return empty array on error
    }
  }
);

// Create a writable loading state atom
export const loadingMonitoringStationsAtom = atom(false);

// Update the isLoadingMonitoringStationsAtom to ONLY use the writable atom
export const isLoadingMonitoringStationsAtom = atom(
  (get) => get(loadingMonitoringStationsAtom) // Directly return the state of the writable atom
);

// Create a writable loading state atom for rain stations
export const loadingRainStationsAtom = atom(false);

export const isLoadingRainStationsAtom = atom(
  (get) => get(loadingRainStationsAtom) // Directly return the state of the writable atom
);

// Create a writable loading state atom for reservoirs
export const loadingReservoirsAtom = atom(false);

export const isLoadingReservoirsAtom = atom(
  (get) => get(loadingReservoirsAtom) // Directly return the state of the writable atom
);

// Error state atoms
export const monitoringStationsErrorAtom = atom<Error | null>(null);
export const rainStationsErrorAtom = atom<Error | null>(null);
export const reservoirsErrorAtom = atom<Error | null>(null);

// Update the syncMonitoringStationsAtom function
export const syncMonitoringStationsAtom = atom(
  null,
  async (get, set) => {
    // Get current location
    const amphure = get(currentAmphureAtom);
    const province = get(currentProvinceAtom);
    
    console.log('[syncMonitoringStationsAtom] Syncing monitoring stations with location:', {
      amphure,
      province
    });
    
    try {
      // Set loading state
      set(loadingMonitoringStationsAtom, true);
      
      // Clear previous error
      set(monitoringStationsErrorAtom, null);
      
      // Enhanced debugging for API request
      console.log('[syncMonitoringStationsAtom] Making API call with parameters:', {
        amphure, 
        province,
        url: `${import.meta.env.VITE_API_URL}/api/telemetry/stations?amphure=${encodeURIComponent(amphure || '')}&province=${encodeURIComponent(province || '')}`
      });
      
      // Early return if no location data to avoid infinite retries
      if (!amphure && !province) {
        console.log('[syncMonitoringStationsAtom] No location data, skipping fetch');
        set(monitoringStationsAtom, []);
        return;
      }
      
      // Fetch monitoring stations - pass both amphure and province explicitly
      const response = await fetchMonitoringStations(amphure, province);
      
      // Log response information
      console.log('[syncMonitoringStationsAtom] Response summary:', {
        stationCount: response?.stations?.length || 0,
        message: response?.message || 'No message',
        hasError: !!response?.error,
        error: response?.error,
        timestamp: new Date().toISOString(),
        firstStation: response?.stations?.length > 0 ? JSON.stringify(response.stations[0]) : 'none'
      });
      
      // Standardize station data for storage
      if (response?.stations && Array.isArray(response.stations)) {
        // Process stations to add proper telemetry data
        const stationsWithTelemetry = await Promise.all(
          response.stations.map(async (station: any) => {
            // Debug each station
            console.log(`[syncMonitoringStationsAtom] Processing station ${station.id || station.station_id}:`, {
              water_level: station.water_level,
              flow_rate: station.flow_rate,
              timestamp: station.reading_time || station.timestamp,
              telemetry_data: station.telemetry_data
            });
            
            // Extract required station properties with fallbacks for missing fields
            return {
              id: station.id?.toString() || "",
              station_id: station.station_id || station.id?.toString() || "",
              station_name: station.station_name || station.name || `Station ${station.id || 'Unknown'}`,
              name: station.name || station.station_name || `Station ${station.id || 'Unknown'}`,
              location: station.location || `${amphure || ''}, ${province || ''}`,
              coordinates: station.coordinates || { 
                lat: parseFloat(station.latitude || 0), 
                lng: parseFloat(station.longitude || 0) 
              },
              status: station.status || 'active',
              water_level: parseFloat(station.water_level || 0),
              flow_rate: parseFloat(station.flow_rate || 0),
              lastReading: {
                timestamp: station.reading_time || new Date().toISOString(),
                value: parseFloat(station.water_level || 0),
                unit: 'm'
              },
              telemetry_data: {
                water_level: parseFloat(station.water_level || 0),
                flow_rate: parseFloat(station.flow_rate || 0),
                timestamp: station.reading_time || new Date().toISOString(),
                notation: station.notation_string || ''
              },
              type: 'monitoring' as const,
              source: 'system' as const,
              // Add these properties to ensure correct filtering and display
              province: station.province || province,
              amphure: station.amphure || amphure
            };
          })
        );
        
        // Update the stations atom with standardized data that includes telemetry
        set(monitoringStationsAtom, stationsWithTelemetry);
        console.log('[syncMonitoringStationsAtom] Updated monitoring stations:', {
          count: stationsWithTelemetry.length,
          firstStation: stationsWithTelemetry[0] ? {
            id: stationsWithTelemetry[0].id,
            name: stationsWithTelemetry[0].name,
            water_level: stationsWithTelemetry[0].water_level,
            flow_rate: stationsWithTelemetry[0].flow_rate,
            telemetry_timestamp: stationsWithTelemetry[0].telemetry_data?.timestamp
          } : null
        });
      } else {
        // If no stations found or invalid response, set empty array
        console.log('[syncMonitoringStationsAtom] No valid station data found, using empty array');
        set(monitoringStationsAtom, []);
      }
      
      // Handle any errors in the response
      if (response?.error) {
        set(monitoringStationsErrorAtom, new Error(response.error));
      } else {
        set(monitoringStationsErrorAtom, null);
      }
    } catch (error) {
      console.error('[syncMonitoringStationsAtom] Error fetching monitoring stations:', error);
      
      // Set empty stations array
      set(monitoringStationsAtom, []);
      
      // Update error state
      set(monitoringStationsErrorAtom, error as Error);
    } finally {
      // Reset loading state
      set(loadingMonitoringStationsAtom, false);
    }
  }
);

export const syncRainStationsAtom = atom(
  null,
  async (get, set) => {
    // Get current location
    const amphure = get(currentAmphureAtom);
    const province = get(currentProvinceAtom);
    
    console.log('[syncRainStationsAtom] Syncing rain stations with location:', { 
      amphure, 
      province 
    });
    
    // Only fetch if we have location data
    if (amphure || province) {
      try {
        // Set loading state
        set(loadingRainStationsAtom, true);
        
        // Clear previous error
        set(rainStationsErrorAtom, null);
        
        // Enhanced debugging for API request
        console.log('[syncRainStationsAtom] Making API call with parameters:', {
          amphure, 
          province,
          url: `${import.meta.env.VITE_API_URL}/api/rain-stations?amphure=${encodeURIComponent(amphure || '')}&province=${encodeURIComponent(province || '')}`
        });
        
        // Directly fetch from API
        const response = await fetchRainStations(amphure, province);
        
        if (response.stations && Array.isArray(response.stations)) {
          console.log('[syncRainStationsAtom] Fetched rain stations:', {
            count: response.stations.length,
            dataSources: response.stations.map((s: any) => s.data_source || 'unknown'),
            firstStation: response.stations.length > 0 ? {
              id: response.stations[0].id,
              name: response.stations[0].name || response.stations[0].name_th,
              rainfallData: {
                rainfall10m: response.stations[0].rainfall10m,
                rainfall1h: response.stations[0].rainfall1h,
                rainfall3h: response.stations[0].rainfall3h,
                rainfall24h: response.stations[0].rainfall24h,
                rainfall_today: response.stations[0].rainfall_today
              }
            } : 'none'
          });
          
          // Convert API response to our internal RainStation type
          const mappedStations = response.stations.map((station: any) => {
            console.log(`[syncRainStationsAtom] Processing station ${station.id}:`, {
              rainfall10m: station.rainfall10m,
              rainfall1h: station.rainfall1h,
              rainfall3h: station.rainfall3h,
              rainfall24h: station.rainfall24h,
              rainfall_today: station.rainfall_today
            });
            
            return {
              id: station.id,
              name: station.name || station.station_name || `Rain Station ${station.id}`,
              name_th: station.name_th || null,
              latitude: station.latitude || 0,
              longitude: station.longitude || 0,
              station_type: station.station_type || 'unknown',
              data_source: station.data_source || 'unknown',
              province: station.province || province || null,
              amphure: station.amphure || amphure || null,
              tambon: station.tambon || null,
              // Store original rainfall values exactly as they come from API 
              rainfall10m: station.rainfall10m !== undefined ? station.rainfall10m : null,
              rainfall1h: station.rainfall1h !== undefined ? station.rainfall1h : null,
              rainfall3h: station.rainfall3h !== undefined ? station.rainfall3h : null,
              rainfall24h: station.rainfall24h !== undefined ? station.rainfall24h : null,
              rainfall_today: station.rainfall_today !== undefined ? station.rainfall_today : null,
              rainfall_date_calc: station.rainfall_date_calc || null,
              rainfall_datetime: station.rainfall_datetime || null,
              // Also construct the standard rainfall object for backward compatibility
              rainfall: {
                daily: station.rainfall_today !== undefined ? station.rainfall_today : 
                       station.rainfall24h !== undefined ? station.rainfall24h : 0,
                hourly: station.rainfall1h !== undefined ? station.rainfall1h : 0,
                tenMinutes: station.rainfall10m !== undefined ? station.rainfall10m : 0,
                threeHours: station.rainfall3h !== undefined ? station.rainfall3h : 0,
                timestamp: station.rainfall_datetime || new Date().toISOString()
              }
            };
          });
          
          // Log stations with non-zero rainfall for debugging
          const stationsWithRainfall = mappedStations.filter((s: any) => 
            s.rainfall10m > 0 || s.rainfall1h > 0 || s.rainfall3h > 0 || 
            s.rainfall24h > 0 || s.rainfall_today > 0
          );
          
          console.log('[syncRainStationsAtom] Stations with rainfall data:', {
            count: stationsWithRainfall.length,
            stations: stationsWithRainfall.map((s: any) => ({
              id: s.id,
              name: s.name,
              rainfall10m: s.rainfall10m,
              rainfall1h: s.rainfall1h,
              rainfall3h: s.rainfall3h,
              rainfall24h: s.rainfall24h,
              rainfall_today: s.rainfall_today
            }))
          });
          
          // Update the atom with the new data ONLY if it has changed
          const currentStations = get(rainStationsAtom);
          if (JSON.stringify(mappedStations) !== JSON.stringify(currentStations)) {
            console.log('[syncRainStationsAtom] Rain station data changed, updating atom.');
            set(rainStationsAtom, mappedStations);
          } else {
            console.log('[syncRainStationsAtom] Rain station data unchanged, skipping atom update.');
          }
        } else {
          console.warn('[syncRainStationsAtom] No rain stations returned from API');
          // Set empty array to clear previous data ONLY if it's not already empty
          if (get(rainStationsAtom).length > 0) {
            console.log('[syncRainStationsAtom] Clearing existing rain station data.');
            set(rainStationsAtom, []);
          }
        }
      } catch (error) {
        console.error('[syncRainStationsAtom] Error fetching rain stations:', error);
        // Set error atom
        set(rainStationsErrorAtom, error instanceof Error ? error : new Error(String(error)));
      } finally {
         // Reset loading state
         set(loadingRainStationsAtom, false);
      }
    } else {
      console.log('[syncRainStationsAtom] No location data, skipping fetch');
      // Ensure loading is false if skipped
      set(loadingRainStationsAtom, false);
    }
  }
);

// syncReservoirsAtom: Updated to map fetched data to the correct atom type
export const syncReservoirsAtom = atom(
  null,
  async (get, set) => { 
    console.log('[stationData] Syncing reservoirs');
    
    try {
      // Set loading state
      set(loadingReservoirsAtom, true);

      // Clear previous error
      set(reservoirsErrorAtom, null);

      // 1. Get the newly fetched data for the current location
      const fetchedBackendReservoirs = await get(reservoirsQueryAtom); 
      console.log('[stationData] Fetched reservoirs for sync:', {
        count: fetchedBackendReservoirs.length,
        // Assuming fetched data has reservoir_id or id
        ids: fetchedBackendReservoirs.map((r: any) => r.reservoir_id || r.id)
      });

      // 2. Map the fetched data to the AtomReservoir structure
      const mappedReservoirs: Reservoir[] = fetchedBackendReservoirs.map((item: any): Reservoir => {
        const lat = parseFloat(item.reservoir_lat || item.latitude || 0);
        const lng = parseFloat(item.reservoir_long || item.longitude || 0);
        // Ensure id is a string, prioritize reservoir_id if present
        const idString = item.reservoir_id?.toString() || item.id?.toString() || ''; 
        
        return {
            id: idString, 
            // Use reservoir_name first, then name, then construct default
            name: item.reservoir_name || item.name || `Reservoir ${idString || 'Unknown'}`, 
            // Construct location from amphure/province if available
            location: `${item.amphure || ''}${item.amphure && item.province ? ', ' : ''}${item.province || ''}`, 
            coordinates: { lat, lng },
            status: 'active', // Default status
            // Use capacity field, default 0. Check for normal_storage_capacity too.
            capacity: parseFloat(item.normal_storage_capacity || item.capacity || 0), 
            // Use current_volume or maybe storage? Default 0. Needs clarification which field is correct.
            currentLevel: parseFloat(item.current_volume || item.storage || 0), 
             // Use percent_full if available, default 0
            percentFull: parseFloat(item.percent_full || 0),
            type: 'reservoir',
            source: 'system',
        };
      });
      console.log('[stationData] Mapped fetched data:', {
        count: mappedReservoirs.length,
        ids: mappedReservoirs.map(r => r.id)
      });

      // 3. Update the main reservoirsAtom with the *mapped* data
      set(reservoirsAtom, mappedReservoirs);
      console.log('[stationData] Set reservoirsAtom with mapped data.');

      // 4. Perform existing cleanup for user-selected and disabled reservoirs
      const userSelectedReservoirs = get(userSelectedReservoirsAtom) || [];
      const disabledReservoirs = get(disabledReservoirsAtom) || {};
      
      console.log('[stationData] Current user/disabled state:', {
        userSelected: userSelectedReservoirs.length,
        disabled: Object.keys(disabledReservoirs).length
      });

      // Filter out user-selected reservoirs that are disabled
      const filteredUserSelectedReservoirs = userSelectedReservoirs.filter(
        reservoir => reservoir && reservoir.id && !disabledReservoirs[reservoir.id]
      );

      // Check for duplicate IDs (optional but good practice)
      const userSelectedIds = new Set<string>();
      const duplicateUserSelectedIds: string[] = [];
      filteredUserSelectedReservoirs.forEach(reservoir => {
        if (userSelectedIds.has(reservoir.id)) {
          duplicateUserSelectedIds.push(reservoir.id);
        } else {
          userSelectedIds.add(reservoir.id);
        }
      });
      if (duplicateUserSelectedIds.length > 0) {
        console.warn('[stationData] Found duplicate user-selected reservoir IDs:', duplicateUserSelectedIds);
      }
      
      // If the filtered list is different from the original user-selected list, update it
      if (JSON.stringify(filteredUserSelectedReservoirs) !== JSON.stringify(userSelectedReservoirs)) {
        console.log('[stationData] Updating user-selected reservoirs (filtering disabled):', {
          before: userSelectedReservoirs.length,
          after: filteredUserSelectedReservoirs.length,
          removedIds: userSelectedReservoirs
            .filter(r => !filteredUserSelectedReservoirs.some(fr => fr.id === r.id))
            .map(r => r.id)
        });
        set(userSelectedReservoirsAtom, filteredUserSelectedReservoirs);
      } else {
        console.log('[stationData] No changes needed for user-selected reservoirs based on disabled status.');
      }
      
      // Clear any previous error for reservoirs
      // set(reservoirsErrorAtom, null);

      console.log('[stationData] Reservoir sync complete.');

    } catch (error) {
      console.error('[stationData] Error syncing reservoirs:', error);
      // Set error atom
      set(reservoirsErrorAtom, error instanceof Error ? error : new Error(String(error)));
      // Optionally clear the main atom on error?
      // set(reservoirsAtom, []); 

      // Attempt recovery for userSelectedReservoirsAtom if necessary
      const userSelectedReservoirs = get(userSelectedReservoirsAtom);
      if (!userSelectedReservoirs || !Array.isArray(userSelectedReservoirs)) {
        console.warn('[stationData] Attempting recovery by resetting user-selected reservoirs');
        set(userSelectedReservoirsAtom, []);
      }
    } finally {
       // Reset loading state
       set(loadingReservoirsAtom, false);
    }
  }
);

// Original state snapshot atoms for rollback functionality
export const originalMonitoringStationsAtom = atom<MonitoringStation[]>([]);
export const originalRainStationsAtom = atom<RainStation[]>([]);
export const originalReservoirsAtom = atom<Reservoir[]>([]);

export const originalUserSelectedMonitoringStationsAtom = atom<MonitoringStation[]>([]);
export const originalUserSelectedRainStationsAtom = atom<RainStation[]>([]);
export const originalUserSelectedReservoirsAtom = atom<Reservoir[]>([]);

export const originalDisabledMonitoringStationsAtom = atom<Record<string, boolean>>({});
export const originalDisabledRainStationsAtom = atom<Record<string, boolean>>({});
export const originalDisabledReservoirsAtom = atom<Record<string, boolean>>({});

// Atom to track if we're in edit mode
export const isEditModeAtom = atom<boolean>(false);

// Atom to track if there are unsaved changes
export const hasUnsavedChangesAtom = atom<boolean>(false);

// Function to save the current state as the original state
export const saveOriginalStateAtom = atom(
  null,
  (get, set) => {
    // Save the current state of all station atoms
    set(originalMonitoringStationsAtom, get(monitoringStationsAtom));
    set(originalRainStationsAtom, get(rainStationsAtom));
    set(originalReservoirsAtom, get(reservoirsAtom));
    
    set(originalUserSelectedMonitoringStationsAtom, get(userSelectedMonitoringStationsAtom));
    set(originalUserSelectedRainStationsAtom, get(userSelectedRainStationsAtom));
    set(originalUserSelectedReservoirsAtom, get(userSelectedReservoirsAtom));
    
    set(originalDisabledMonitoringStationsAtom, get(disabledMonitoringStationsAtom));
    set(originalDisabledRainStationsAtom, get(disabledRainStationsAtom));
    set(originalDisabledReservoirsAtom, get(disabledReservoirsAtom));
    
    // Set edit mode to true
    set(isEditModeAtom, true);
    
    // Reset unsaved changes flag
    set(hasUnsavedChangesAtom, false);
    
    console.log('[stationData] Original state saved for rollback');
  }
);

// Function to restore the original state (rollback)
export const restoreOriginalStateAtom = atom(
  null,
  (get, set) => {
    // Restore the original state of all station atoms
    set(monitoringStationsAtom, get(originalMonitoringStationsAtom));
    set(rainStationsAtom, get(originalRainStationsAtom));
    set(reservoirsAtom, get(originalReservoirsAtom));
    
    set(userSelectedMonitoringStationsAtom, get(originalUserSelectedMonitoringStationsAtom));
    set(userSelectedRainStationsAtom, get(originalUserSelectedRainStationsAtom));
    set(userSelectedReservoirsAtom, get(originalUserSelectedReservoirsAtom));
    
    set(disabledMonitoringStationsAtom, get(originalDisabledMonitoringStationsAtom));
    set(disabledRainStationsAtom, get(originalDisabledRainStationsAtom));
    set(disabledReservoirsAtom, get(originalDisabledReservoirsAtom));
    
    // Reset edit mode
    set(isEditModeAtom, false);
    
    // Reset unsaved changes flag
    set(hasUnsavedChangesAtom, false);
    
    console.log('[stationData] Original state restored (rollback completed)');
  }
);

// Atom to track changes to station data
export const trackStationChangesAtom = atom(
  null,
  (get, set) => {
    // Check if there are any changes by comparing current state with original state
    const monitoringChanged = JSON.stringify(get(monitoringStationsAtom)) !== JSON.stringify(get(originalMonitoringStationsAtom)) ||
                             JSON.stringify(get(userSelectedMonitoringStationsAtom)) !== JSON.stringify(get(originalUserSelectedMonitoringStationsAtom)) ||
                             JSON.stringify(get(disabledMonitoringStationsAtom)) !== JSON.stringify(get(originalDisabledMonitoringStationsAtom));
    
    const rainChanged = JSON.stringify(get(rainStationsAtom)) !== JSON.stringify(get(originalRainStationsAtom)) ||
                       JSON.stringify(get(userSelectedRainStationsAtom)) !== JSON.stringify(get(originalUserSelectedRainStationsAtom)) ||
                       JSON.stringify(get(disabledRainStationsAtom)) !== JSON.stringify(get(originalDisabledRainStationsAtom));
    
    const reservoirsChanged = JSON.stringify(get(reservoirsAtom)) !== JSON.stringify(get(originalReservoirsAtom)) ||
                             JSON.stringify(get(userSelectedReservoirsAtom)) !== JSON.stringify(get(originalUserSelectedReservoirsAtom)) ||
                             JSON.stringify(get(disabledReservoirsAtom)) !== JSON.stringify(get(originalDisabledReservoirsAtom));
    
    // Update the unsaved changes flag
    set(hasUnsavedChangesAtom, monitoringChanged || rainChanged || reservoirsChanged);
    
    // Update the edit session status
    set(editSessionStatusAtom, {
      hasChanges: monitoringChanged || rainChanged || reservoirsChanged,
      lastEditTimestamp: Date.now(),
      changedStationTypes: [
        ...(monitoringChanged ? ['monitoring'] : []),
        ...(rainChanged ? ['rain'] : []),
        ...(reservoirsChanged ? ['reservoir'] : [])
      ] as ('monitoring' | 'rain' | 'reservoir')[]
    });
    
    console.log('[stationData] Changes tracked:', {
      monitoringChanged,
      rainChanged,
      reservoirsChanged,
      hasChanges: monitoringChanged || rainChanged || reservoirsChanged
    });
  }
); 