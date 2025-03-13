import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { fetchMonitoringStations } from '@/hooks/useMonitoringStations';
import { fetchRainStations } from '@/hooks/useRainStations';
import { fetchReservoirs } from '@/hooks/useReservoirs';

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
  type: 'rain';
  source?: 'system' | 'user';
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
        console.error('Error fetching monitoring stations:', error);
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
      timestamp: new Date().toISOString()
    });
    
    // Only fetch if we have at least some location data (either amphure or province)
    if (amphure || province) {
      try {
        console.log('[rainStationsQueryAtom] Fetching from API with:', { amphure, province });
        
        const response = await fetchRainStations(amphure, province);
        console.log('[rainStationsQueryAtom] API response:', {
          stationsCount: response.stations?.length || 0,
          success: !!response.stations
        });
        return response.stations || [];
      } catch (error) {
        console.error('Error fetching rain stations:', error);
        throw error;
      }
    }
    
    console.log('[rainStationsQueryAtom] No location data, returning empty array');
    return [];
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

// Loading state atoms
export const isLoadingMonitoringStationsAtom = atom(
  (get) => {
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

// Synchronization atoms - these are used to sync the stored atoms with the query atoms
// They filter out disabled stations based on their source
// System-generated stations are kept but marked as disabled
// User-added stations are removed when disabled
export const syncMonitoringStationsAtom = atom(
  null,
  (get, set) => {
    console.log('[stationData] Syncing monitoring stations');
    
    try {
      // Get the current state
      const monitoringStations = get(monitoringStationsAtom) || [];
      const userSelectedMonitoringStations = get(userSelectedMonitoringStationsAtom) || [];
      const disabledMonitoringStations = get(disabledMonitoringStationsAtom) || {};
      
      // Log the current state with detailed information
      console.log('[stationData] Current monitoring stations state:', {
        monitoringStations: monitoringStations.length,
        monitoringStationIds: monitoringStations.map(s => s.id),
        userSelectedMonitoringStations: userSelectedMonitoringStations.length,
        userSelectedMonitoringStationIds: userSelectedMonitoringStations.map(s => s.id),
        disabledMonitoringStations: Object.keys(disabledMonitoringStations).length,
        disabledMonitoringStationIds: Object.keys(disabledMonitoringStations)
      });
      
      // Check for invalid data
      const invalidMonitoringStations = monitoringStations.filter(s => !s.id);
      const invalidUserSelectedStations = userSelectedMonitoringStations.filter(s => !s.id);
      
      if (invalidMonitoringStations.length > 0) {
        console.warn('[stationData] Found invalid monitoring stations without IDs:', invalidMonitoringStations);
      }
      
      if (invalidUserSelectedStations.length > 0) {
        console.warn('[stationData] Found invalid user-selected monitoring stations without IDs:', invalidUserSelectedStations);
      }
      
      // Filter out user-selected stations that are disabled
      const filteredUserSelectedStations = userSelectedMonitoringStations.filter(
        station => station && station.id && !disabledMonitoringStations[station.id]
      );
      
      // Check for duplicate IDs
      const userSelectedIds = new Set<string>();
      const duplicateUserSelectedIds: string[] = [];
      
      filteredUserSelectedStations.forEach(station => {
        if (userSelectedIds.has(station.id)) {
          duplicateUserSelectedIds.push(station.id);
        } else {
          userSelectedIds.add(station.id);
        }
      });
      
      if (duplicateUserSelectedIds.length > 0) {
        console.warn('[stationData] Found duplicate user-selected monitoring station IDs:', duplicateUserSelectedIds);
      }
      
      // If the filtered list is different from the current list, update it
      if (JSON.stringify(filteredUserSelectedStations) !== JSON.stringify(userSelectedMonitoringStations)) {
        console.log('[stationData] Updating user-selected monitoring stations:', {
          before: userSelectedMonitoringStations.length,
          after: filteredUserSelectedStations.length,
          removedIds: userSelectedMonitoringStations
            .filter(s => !filteredUserSelectedStations.some(fs => fs.id === s.id))
            .map(s => s.id)
        });
        
        set(userSelectedMonitoringStationsAtom, filteredUserSelectedStations);
      } else {
        console.log('[stationData] No changes needed for user-selected monitoring stations');
      }
      
      // Log the updated state
      console.log('[stationData] Updated monitoring stations state:', {
        monitoringStations: monitoringStations.length,
        userSelectedMonitoringStations: filteredUserSelectedStations.length,
        disabledMonitoringStations: Object.keys(disabledMonitoringStations).length
      });
    } catch (error) {
      console.error('[stationData] Error syncing monitoring stations:', error);
      // Attempt recovery by setting to empty array if needed
      const userSelectedMonitoringStations = get(userSelectedMonitoringStationsAtom);
      if (!userSelectedMonitoringStations || !Array.isArray(userSelectedMonitoringStations)) {
        console.warn('[stationData] Attempting recovery by resetting user-selected monitoring stations');
        set(userSelectedMonitoringStationsAtom, []);
      }
    }
  }
);

export const syncRainStationsAtom = atom(
  null,
  (get, set) => {
    console.log('[stationData] Syncing rain stations');
    
    try {
      // Get the current state
      const rainStations = get(rainStationsAtom) || [];
      const userSelectedRainStations = get(userSelectedRainStationsAtom) || [];
      const disabledRainStations = get(disabledRainStationsAtom) || {};
      
      // Log the current state with detailed information
      console.log('[stationData] Current rain stations state:', {
        rainStations: rainStations.length,
        rainStationIds: rainStations.map(s => s.id),
        userSelectedRainStations: userSelectedRainStations.length,
        userSelectedRainStationIds: userSelectedRainStations.map(s => s.id),
        disabledRainStations: Object.keys(disabledRainStations).length,
        disabledRainStationIds: Object.keys(disabledRainStations)
      });
      
      // Check for invalid data
      const invalidRainStations = rainStations.filter(s => !s.id);
      const invalidUserSelectedStations = userSelectedRainStations.filter(s => !s.id);
      
      if (invalidRainStations.length > 0) {
        console.warn('[stationData] Found invalid rain stations without IDs:', invalidRainStations);
      }
      
      if (invalidUserSelectedStations.length > 0) {
        console.warn('[stationData] Found invalid user-selected rain stations without IDs:', invalidUserSelectedStations);
      }
      
      // Filter out user-selected stations that are disabled
      const filteredUserSelectedStations = userSelectedRainStations.filter(
        station => station && station.id && !disabledRainStations[station.id]
      );
      
      // Check for duplicate IDs
      const userSelectedIds = new Set<string>();
      const duplicateUserSelectedIds: string[] = [];
      
      filteredUserSelectedStations.forEach(station => {
        if (userSelectedIds.has(station.id)) {
          duplicateUserSelectedIds.push(station.id);
        } else {
          userSelectedIds.add(station.id);
        }
      });
      
      if (duplicateUserSelectedIds.length > 0) {
        console.warn('[stationData] Found duplicate user-selected rain station IDs:', duplicateUserSelectedIds);
      }
      
      // If the filtered list is different from the current list, update it
      if (JSON.stringify(filteredUserSelectedStations) !== JSON.stringify(userSelectedRainStations)) {
        console.log('[stationData] Updating user-selected rain stations:', {
          before: userSelectedRainStations.length,
          after: filteredUserSelectedStations.length,
          removedIds: userSelectedRainStations
            .filter(s => !filteredUserSelectedStations.some(fs => fs.id === s.id))
            .map(s => s.id)
        });
        
        set(userSelectedRainStationsAtom, filteredUserSelectedStations);
      } else {
        console.log('[stationData] No changes needed for user-selected rain stations');
      }
      
      // Log the updated state
      console.log('[stationData] Updated rain stations state:', {
        rainStations: rainStations.length,
        userSelectedRainStations: filteredUserSelectedStations.length,
        disabledRainStations: Object.keys(disabledRainStations).length
      });
    } catch (error) {
      console.error('[stationData] Error syncing rain stations:', error);
      // Attempt recovery by setting to empty array if needed
      const userSelectedRainStations = get(userSelectedRainStationsAtom);
      if (!userSelectedRainStations || !Array.isArray(userSelectedRainStations)) {
        console.warn('[stationData] Attempting recovery by resetting user-selected rain stations');
        set(userSelectedRainStationsAtom, []);
      }
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