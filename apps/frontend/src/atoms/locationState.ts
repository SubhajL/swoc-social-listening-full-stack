import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// Define the location state interface
export interface LocationState {
  amphure: string;
  province: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  lastUpdated: number;
}

// Default location data (Chiang Mai)
const DEFAULT_LOCATION: LocationState = {
  amphure: 'แม่แตง',
  province: 'เชียงใหม่',
  coordinates: {
    lat: 18.7883,
    lng: 98.9853
  },
  lastUpdated: Date.now()
};

// Create atoms with persistent storage
export const locationStateAtom = atomWithStorage<LocationState>(
  'location-state',
  DEFAULT_LOCATION
);

// Derived atoms for individual properties
export const amphureAtom = atom(
  (get) => get(locationStateAtom).amphure,
  (get, set, newAmphure: string) => {
    const currentState = get(locationStateAtom);
    set(locationStateAtom, {
      ...currentState,
      amphure: newAmphure,
      lastUpdated: Date.now()
    });
    console.log('[locationState] Updated amphure:', newAmphure);
  }
);

export const provinceAtom = atom(
  (get) => get(locationStateAtom).province,
  (get, set, newProvince: string) => {
    const currentState = get(locationStateAtom);
    set(locationStateAtom, {
      ...currentState,
      province: newProvince,
      lastUpdated: Date.now()
    });
    console.log('[locationState] Updated province:', newProvince);
  }
);

export const coordinatesAtom = atom(
  (get) => get(locationStateAtom).coordinates,
  (get, set, newCoordinates: { lat: number; lng: number }) => {
    const currentState = get(locationStateAtom);
    set(locationStateAtom, {
      ...currentState,
      coordinates: newCoordinates,
      lastUpdated: Date.now()
    });
    console.log('[locationState] Updated coordinates:', newCoordinates);
  }
);

// Action atom to update the entire location state
export const updateLocationAtom = atom(
  null,
  (get, set, newLocation: Partial<LocationState>) => {
    const currentState = get(locationStateAtom);
    set(locationStateAtom, {
      ...currentState,
      ...newLocation,
      lastUpdated: Date.now()
    });
    console.log('[locationState] Updated location state:', {
      ...currentState,
      ...newLocation
    });
  }
);

// Action atom to reset to default location
export const resetLocationAtom = atom(
  null,
  (_, set) => {
    set(locationStateAtom, {
      ...DEFAULT_LOCATION,
      lastUpdated: Date.now()
    });
    console.log('[locationState] Reset to default location:', DEFAULT_LOCATION);
  }
);

// Custom hook for location state management
export function useLocationState() {
  return {
    locationStateAtom,
    amphureAtom,
    provinceAtom,
    coordinatesAtom,
    updateLocationAtom,
    resetLocationAtom
  };
} 