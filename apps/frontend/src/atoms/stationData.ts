import { atom, useAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { fetchRainStations } from '@/hooks/useRainStations';
import { fetchMonitoringStations } from '@/hooks/useMonitoringStations';
import { fetchReservoirs } from '@/hooks/useReservoirs';
import { locationAtom } from './location';

// Define types for station data
export interface MonitoringStation {
  id: string;
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

export const userSelectedMonitoringStationsAtom = atomWithStorage<MonitoringStation[]>(
  'userSelectedMonitoringStations',
  initialStationData.userSelectedMonitoringStations
);

export const userSelectedRainStationsAtom = atomWithStorage<RainStation[]>(
  'userSelectedRainStations',
  initialStationData.userSelectedRainStations
);

export const userSelectedReservoirsAtom = atomWithStorage<Reservoir[]>(
  'userSelectedReservoirs',
  initialStationData.userSelectedReservoirs
);

export const disabledMonitoringStationsAtom = atomWithStorage<Record<string, boolean>>(
  'disabledMonitoringStations',
  initialStationData.disabledMonitoringStations
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
    
    console.log('[monitoringStationsQueryAtom] Fetching monitoring stations:', {
      amphure,
      province,
      timestamp: new Date().toISOString()
    });
    
    // Only fetch if we have at least some location data (either amphure or province)
    if (amphure || province) {
      try {
        console.log('[monitoringStationsQueryAtom] Fetching from API with:', { amphure, province });
        
        const response = await fetchMonitoringStations(amphure, province);
        console.log('[monitoringStationsQueryAtom] API response:', {
          stationsCount: response.stations?.length || 0,
          success: !!response.stations
        });
        
        // Log detailed station ID information stored in Jotai
        console.log('[monitoringStationsQueryAtom] Station IDs stored in Jotai:', 
          response.stations?.map((station: any) => ({
            id: station.id,
            station_id: station.station_id,
            name: station.station_name
          }))
        );
        
        return response.stations || [];
      } catch (error) {
        console.error('[monitoringStationsQueryAtom] Error fetching monitoring stations:', error);
        throw error;
      }
    }
    
    console.log('[monitoringStationsQueryAtom] No location data, returning empty array');
    return [];
  }
);

export const rainStationsQueryAtom = atom(
  async (get) => {
    const amphure = get(currentAmphureAtom);
    const province = get(currentProvinceAtom);
    
    console.log('[rainStationsQueryAtom] Fetching rain stations:', {
      amphure,
      province,
    });

    // If no location is selected, return empty array
    if (!amphure && !province) {
      console.log('[rainStationsQueryAtom] No location data, returning empty array');
      return [];
    }

    try {
      console.log('[rainStationsQueryAtom] Fetching from API with:', { amphure, province });
      
      // Fetch both TMD and HII stations
      const response = await fetchRainStations(amphure, province, 'ALL');
      console.log('[rainStationsQueryAtom] API response:', {
        success: response.success,
        total: response.total,
        meta: response.meta
      });
      
      return response.stations;
    } catch (error) {
      console.error('[rainStationsQueryAtom] Error fetching rain stations:', error);
      return [];
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
    
    // Only fetch if we have at least some location data (either amphure or province)
    if (amphure || province) {
      try {
        console.log('[reservoirsQueryAtom] Fetching from API with:', { amphure, province });
        
        const response = await fetchReservoirs(amphure, province);
        console.log('[reservoirsQueryAtom] API response:', {
          reservoirsCount: response.reservoirs?.length || 0,
          success: !!response.reservoirs
        });
        return response.reservoirs || [];
      } catch (error) {
        console.error('Error fetching reservoirs:', error);
        throw error;
      }
    }
    
    console.log('[reservoirsQueryAtom] No location data, returning empty array');
    return [];
  }
);

// Create a writable loading state atom
export const loadingMonitoringStationsAtom = atom(false);

// Update the isLoadingMonitoringStationsAtom to use the writable atom
export const isLoadingMonitoringStationsAtom = atom(
  (get) => {
    // Check the explicit loading state first
    const isExplicitlyLoading = get(loadingMonitoringStationsAtom);
    if (isExplicitlyLoading) return true;
    
    // Otherwise use the derived logic
    const amphure = get(currentAmphureAtom);
    const province = get(currentProvinceAtom);
    const userSelected = get(userSelectedMonitoringStationsAtom);
    const storedStations = get(monitoringStationsAtom);
    
    // Only show loading if we're fetching (have location but no user selections or stored stations)
    return (amphure || province) && userSelected.length === 0 && storedStations.length === 0;
  }
);

export const isLoadingRainStationsAtom = atom(
  (get) => {
    const amphure = get(currentAmphureAtom);
    const province = get(currentProvinceAtom);
    const userSelected = get(userSelectedRainStationsAtom);
    const storedStations = get(rainStationsAtom);
    
    // Only show loading if we're fetching (have location but no user selections or stored stations)
    return (amphure || province) && userSelected.length === 0 && storedStations.length === 0;
  }
);

export const isLoadingReservoirsAtom = atom(
  (get) => {
    const amphure = get(currentAmphureAtom);
    const province = get(currentProvinceAtom);
    const userSelected = get(userSelectedReservoirsAtom);
    const storedReservoirs = get(reservoirsAtom);
    
    // Only show loading if we're fetching (have location but no user selections or stored reservoirs)
    return (amphure || province) && userSelected.length === 0 && storedReservoirs.length === 0;
  }
);

// Error state atoms
export const monitoringStationsErrorAtom = atom<Error | null>(null);
export const rainStationsErrorAtom = atom<Error | null>(null);
export const reservoirsErrorAtom = atom<Error | null>(null);

// Update the syncMonitoringStationsAtom to simplify the data fetching logic
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
    
    // Only fetch if we have location data
    if (amphure || province) {
      try {
        // Set loading state
        set(loadingMonitoringStationsAtom, true);
        
        // Clear previous error
        set(monitoringStationsErrorAtom, null);
        
        // Directly fetch from API
        const response = await fetchMonitoringStations(amphure, province);
        
        if (response.stations && Array.isArray(response.stations)) {
          console.log('[syncMonitoringStationsAtom] Fetched stations:', {
            count: response.stations.length
          });
          
          // Convert API response to our internal MonitoringStation type
          const mappedStations = response.stations.map((station: any) => ({
            id: station.id,
            name: station.station_name || station.name || `Station ${station.id}`,
            location: station.location || `${amphure || ''}, ${province || ''}`,
            coordinates: station.coordinates || { lat: 0, lng: 0 },
            status: station.status || 'active',
            lastReading: {
              timestamp: station.telemetry_data?.timestamp || new Date().toISOString(),
              value: station.telemetry_data?.water_level || 0,
              unit: 'm'
            },
            type: 'monitoring' as const,
            source: 'system' as const
          }));
          
          // Update the atom with the new data
          set(monitoringStationsAtom, mappedStations);
        } else {
          console.warn('[syncMonitoringStationsAtom] No stations returned from API');
          // Set empty array to clear previous data
          set(monitoringStationsAtom, []);
        }
      } catch (error) {
        console.error('[syncMonitoringStationsAtom] Error fetching stations:', error);
        // Set error atom
        set(monitoringStationsErrorAtom, error instanceof Error ? error : new Error(String(error)));
      } finally {
        // Reset loading state
        set(loadingMonitoringStationsAtom, false);
      }
    } else {
      console.log('[syncMonitoringStationsAtom] No location data, skipping fetch');
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
        // Clear previous error
        set(rainStationsErrorAtom, null);
        
        // Directly fetch from API
        const response = await fetchRainStations(amphure, province);
        
        if (response.stations && Array.isArray(response.stations)) {
          console.log('[syncRainStationsAtom] Fetched rain stations:', {
            count: response.stations.length,
            dataSources: response.stations.map((s: any) => s.data_source || 'unknown')
          });
          
          // Convert API response to our internal RainStation type
          const mappedStations = response.stations.map((station: any) => ({
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
            rainfall10m: station.rainfall10m || null,
            rainfall1h: station.rainfall1h || null,
            rainfall3h: station.rainfall3h || null,
            rainfall24h: station.rainfall24h || null,
            rainfall_today: station.rainfall_today || null,
            rainfall_date_calc: station.rainfall_date_calc || null,
            rainfall_datetime: station.rainfall_datetime || null,
            rainfall: {
              daily: station.rainfall?.daily || station.rainfall_today || 0,
              hourly: station.rainfall?.hourly || station.rainfall1h || 0,
              tenMinutes: station.rainfall?.tenMinutes || station.rainfall10m || 0,
              threeHours: station.rainfall?.threeHours || station.rainfall3h || 0,
              timestamp: station.rainfall?.timestamp || station.rainfall_datetime || new Date().toISOString()
            }
          }));
          
          // Update the atom with the new data
          set(rainStationsAtom, mappedStations);
        } else {
          console.warn('[syncRainStationsAtom] No rain stations returned from API');
          // Set empty array to clear previous data
          set(rainStationsAtom, []);
        }
      } catch (error) {
        console.error('[syncRainStationsAtom] Error fetching rain stations:', error);
        // Set error atom
        set(rainStationsErrorAtom, error instanceof Error ? error : new Error(String(error)));
      }
    } else {
      console.log('[syncRainStationsAtom] No location data, skipping fetch');
    }
  }
);

export const syncReservoirsAtom = atom(
  null,
  (get, set) => {
    console.log('[stationData] Syncing reservoirs');
    
    try {
      // Get the current state
      const reservoirs = get(reservoirsAtom) || [];
      const userSelectedReservoirs = get(userSelectedReservoirsAtom) || [];
      const disabledReservoirs = get(disabledReservoirsAtom) || {};
      
      // Log the current state with detailed information
      console.log('[stationData] Current reservoirs state:', {
        reservoirs: reservoirs.length,
        reservoirIds: reservoirs.map(r => r.id),
        userSelectedReservoirs: userSelectedReservoirs.length,
        userSelectedReservoirIds: userSelectedReservoirs.map(r => r.id),
        disabledReservoirs: Object.keys(disabledReservoirs).length,
        disabledReservoirIds: Object.keys(disabledReservoirs)
      });
      
      // Check for invalid data
      const invalidReservoirs = reservoirs.filter(r => !r.id);
      const invalidUserSelectedReservoirs = userSelectedReservoirs.filter(r => !r.id);
      
      if (invalidReservoirs.length > 0) {
        console.warn('[stationData] Found invalid reservoirs without IDs:', invalidReservoirs);
      }
      
      if (invalidUserSelectedReservoirs.length > 0) {
        console.warn('[stationData] Found invalid user-selected reservoirs without IDs:', invalidUserSelectedReservoirs);
      }
      
      // Filter out user-selected reservoirs that are disabled
      const filteredUserSelectedReservoirs = userSelectedReservoirs.filter(
        reservoir => reservoir && reservoir.id && !disabledReservoirs[reservoir.id]
      );
      
      // Check for duplicate IDs
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
      
      // If the filtered list is different from the current list, update it
      if (JSON.stringify(filteredUserSelectedReservoirs) !== JSON.stringify(userSelectedReservoirs)) {
        console.log('[stationData] Updating user-selected reservoirs:', {
          before: userSelectedReservoirs.length,
          after: filteredUserSelectedReservoirs.length,
          removedIds: userSelectedReservoirs
            .filter(r => !filteredUserSelectedReservoirs.some(fr => fr.id === r.id))
            .map(r => r.id)
        });
        
        set(userSelectedReservoirsAtom, filteredUserSelectedReservoirs);
      } else {
        console.log('[stationData] No changes needed for user-selected reservoirs');
      }
      
      // Log the updated state
      console.log('[stationData] Updated reservoirs state:', {
        reservoirs: reservoirs.length,
        userSelectedReservoirs: filteredUserSelectedReservoirs.length,
        disabledReservoirs: Object.keys(disabledReservoirs).length
      });
    } catch (error) {
      console.error('[stationData] Error syncing reservoirs:', error);
      // Attempt recovery by setting to empty array if needed
      const userSelectedReservoirs = get(userSelectedReservoirsAtom);
      if (!userSelectedReservoirs || !Array.isArray(userSelectedReservoirs)) {
        console.warn('[stationData] Attempting recovery by resetting user-selected reservoirs');
        set(userSelectedReservoirsAtom, []);
      }
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