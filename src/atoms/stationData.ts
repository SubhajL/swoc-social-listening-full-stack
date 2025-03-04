import { atom, Getter } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// Define types locally since imports are not available
export interface MonitoringStation {
  id: string;
  name: string;
  // Add other properties as needed
}

export interface RainStation {
  id: string;
  name: string;
  // Add other properties as needed
}

export interface Reservoir {
  id: string;
  name: string;
  // Add other properties as needed
}

// Interface for station data (for type safety)
export interface StationData {
  // Auto-fetched stations based on location
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

// Initial state for station data
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

// Base atoms for station data with localStorage persistence
export const monitoringStationsAtom = atomWithStorage<MonitoringStation[]>(
  'monitoringStations', 
  []
);

export const rainStationsAtom = atomWithStorage<RainStation[]>(
  'rainStations', 
  []
);

export const reservoirsAtom = atomWithStorage<Reservoir[]>(
  'reservoirs', 
  []
);

// User selected stations with localStorage persistence
export const userSelectedMonitoringStationsAtom = atomWithStorage<MonitoringStation[]>(
  'userSelectedMonitoringStations', 
  []
);

export const userSelectedRainStationsAtom = atomWithStorage<RainStation[]>(
  'userSelectedRainStations', 
  []
);

export const userSelectedReservoirsAtom = atomWithStorage<Reservoir[]>(
  'userSelectedReservoirs', 
  []
);

// Disabled stations with localStorage persistence
export const disabledMonitoringStationsAtom = atomWithStorage<Record<string, boolean>>(
  'disabledMonitoringStations', 
  {}
);

export const disabledRainStationsAtom = atomWithStorage<Record<string, boolean>>(
  'disabledRainStations', 
  {}
);

export const disabledReservoirsAtom = atomWithStorage<Record<string, boolean>>(
  'disabledReservoirs', 
  {}
);

// Navigation state tracking (replaces window._stationDataUpdateIntentional)
// Using sessionStorage for this since it's temporary
export const navigatingAfterSaveAtom = atom<boolean>(false);

// Intentional update tracking (replaces window._stationDataUpdateIntentional)
export const stationDataUpdateIntentionalAtom = atom<boolean>(false);

// Derived atom for all station data
export const allStationDataAtom = atom((get: Getter) => {
  return {
    monitoringStations: get(monitoringStationsAtom),
    rainStations: get(rainStationsAtom),
    reservoirs: get(reservoirsAtom),
    userSelectedMonitoringStations: get(userSelectedMonitoringStationsAtom),
    userSelectedRainStations: get(userSelectedRainStationsAtom),
    userSelectedReservoirs: get(userSelectedReservoirsAtom),
    disabledMonitoringStations: get(disabledMonitoringStationsAtom),
    disabledRainStations: get(disabledRainStationsAtom),
    disabledReservoirs: get(disabledReservoirsAtom)
  } as StationData;
});

// Helper atoms for station counts
export const stationCountsAtom = atom((get: Getter) => {
  const monitoring = get(userSelectedMonitoringStationsAtom);
  const rain = get(userSelectedRainStationsAtom);
  const reservoirs = get(userSelectedReservoirsAtom);
  
  return {
    monitoringCount: monitoring.length,
    rainCount: rain.length,
    reservoirCount: reservoirs.length
  };
}); 