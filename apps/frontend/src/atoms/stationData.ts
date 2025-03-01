import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

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