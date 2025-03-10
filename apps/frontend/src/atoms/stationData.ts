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

// Synchronization atoms to update stored atoms with fetched data
export const syncMonitoringStationsAtom = atom(
  null,
  async (get, set) => {
    try {
      console.log('[syncMonitoringStationsAtom] Syncing monitoring stations');
      const stations = await get(monitoringStationsQueryAtom);
      console.log('[syncMonitoringStationsAtom] Fetched stations:', stations.length);
      
      // Convert the API response to the expected MonitoringStation type
      const typedStations = stations.map((station: any) => ({
        id: station.id || station.station_id,
        name: station.station_name || station.name || 'Unknown Station',
        location: station.location || `${station.amphure || ''}, ${station.province || ''}`,
        coordinates: {
          lat: station.latitude || 0,
          lng: station.longitude || 0
        },
        status: station.status || 'active',
        type: 'monitoring' as const,
        // Include any additional fields from the API response
        ...station
      }));
      
      set(monitoringStationsAtom, typedStations);
      set(monitoringStationsErrorAtom, null);
    } catch (error) {
      console.error('[syncMonitoringStationsAtom] Error syncing monitoring stations:', error);
      set(monitoringStationsErrorAtom, error as Error);
    }
  }
);

export const syncRainStationsAtom = atom(
  null,
  async (get, set) => {
    try {
      console.log('[syncRainStationsAtom] Syncing rain stations');
      const stations = await get(rainStationsQueryAtom);
      console.log('[syncRainStationsAtom] Fetched stations:', stations.length);
      
      // Convert the API response to the expected RainStation type
      const typedStations = stations.map((station: any) => ({
        id: station.id || station.station_id,
        name: station.station_name || station.name || 'Unknown Station',
        location: station.location || `${station.amphure || ''}, ${station.province || ''}`,
        coordinates: {
          lat: station.latitude || 0,
          lng: station.longitude || 0
        },
        status: station.status || 'active',
        type: 'rain' as const,
        // Include any additional fields from the API response
        ...station
      }));
      
      set(rainStationsAtom, typedStations);
      set(rainStationsErrorAtom, null);
    } catch (error) {
      console.error('[syncRainStationsAtom] Error syncing rain stations:', error);
      set(rainStationsErrorAtom, error as Error);
    }
  }
);

export const syncReservoirsAtom = atom(
  null,
  async (get, set) => {
    try {
      console.log('[syncReservoirsAtom] Syncing reservoirs');
      const reservoirs = await get(reservoirsQueryAtom);
      console.log('[syncReservoirsAtom] Fetched reservoirs:', reservoirs.length);
      
      // Convert the API response to the expected Reservoir type
      const typedReservoirs = reservoirs.map((reservoir: any) => ({
        id: reservoir.id || reservoir.reservoir_id,
        name: reservoir.reservoir_name || reservoir.name || 'Unknown Reservoir',
        location: reservoir.location || `${reservoir.amphure || ''}, ${reservoir.province || ''}`,
        coordinates: {
          lat: reservoir.latitude || 0,
          lng: reservoir.longitude || 0
        },
        status: reservoir.status || 'active',
        currentLevel: reservoir.current_level || 0,
        capacity: reservoir.capacity || 0,
        type: 'reservoir' as const,
        // Include any additional fields from the API response
        ...reservoir
      }));
      
      set(reservoirsAtom, typedReservoirs);
      set(reservoirsErrorAtom, null);
    } catch (error) {
      console.error('[syncReservoirsAtom] Error syncing reservoirs:', error);
      set(reservoirsErrorAtom, error as Error);
    }
  }
); 