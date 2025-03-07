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
export const stationDataUpdateIntentionalAtom = atom<boolean>(false);

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
    const userSelected = get(userSelectedMonitoringStationsAtom);
    const amphure = get(currentAmphureAtom);
    const province = get(currentProvinceAtom);
    
    console.log('[monitoringStationsQueryAtom] Fetching monitoring stations:', {
      amphure,
      province,
      userSelectedLength: userSelected.length,
      timestamp: new Date().toISOString()
    });
    
    // If we already have user selections, prioritize those
    if (userSelected.length > 0) {
      console.log('[monitoringStationsQueryAtom] Using user selected stations:', userSelected.length);
      return userSelected;
    }
    
    // Check if we have stored stations
    const storedStations = get(monitoringStationsAtom);
    if (storedStations.length > 0) {
      console.log('[monitoringStationsQueryAtom] Using stored stations:', storedStations.length);
      return storedStations;
    }
    
    // Only fetch if we have location data
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
        return [];
      }
    }
    
    console.log('[monitoringStationsQueryAtom] No location data, returning empty array');
    return [];
  }
);

export const rainStationsQueryAtom = atom(
  async (get) => {
    const userSelected = get(userSelectedRainStationsAtom);
    const amphure = get(currentAmphureAtom);
    const province = get(currentProvinceAtom);
    
    console.log('[rainStationsQueryAtom] Fetching rain stations:', {
      amphure,
      province,
      userSelectedLength: userSelected.length,
      timestamp: new Date().toISOString()
    });
    
    // If we already have user selections, prioritize those
    if (userSelected.length > 0) {
      console.log('[rainStationsQueryAtom] Using user selected stations:', userSelected.length);
      return userSelected;
    }
    
    // Check if we have stored stations
    const storedStations = get(rainStationsAtom);
    if (storedStations.length > 0) {
      console.log('[rainStationsQueryAtom] Using stored stations:', storedStations.length);
      return storedStations;
    }
    
    // Only fetch if we have location data
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
        return [];
      }
    }
    
    console.log('[rainStationsQueryAtom] No location data, returning empty array');
    return [];
  }
);

export const reservoirsQueryAtom = atom(
  async (get) => {
    const userSelected = get(userSelectedReservoirsAtom);
    const amphure = get(currentAmphureAtom);
    const province = get(currentProvinceAtom);
    
    console.log('[reservoirsQueryAtom] Fetching reservoirs:', {
      amphure,
      province,
      userSelectedLength: userSelected.length,
      timestamp: new Date().toISOString()
    });
    
    // If we already have user selections, prioritize those
    if (userSelected.length > 0) {
      console.log('[reservoirsQueryAtom] Using user selected reservoirs:', userSelected.length);
      return userSelected;
    }
    
    // Check if we have stored reservoirs
    const storedReservoirs = get(reservoirsAtom);
    if (storedReservoirs.length > 0) {
      console.log('[reservoirsQueryAtom] Using stored reservoirs:', storedReservoirs.length);
      return storedReservoirs;
    }
    
    // Only fetch if we have location data
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
        return [];
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