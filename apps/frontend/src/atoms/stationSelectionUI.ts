import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// Interface for station selection UI state
export interface StationSelectionUIState {
  // Selected stations in the dialog
  selectedStations: any[];
  
  // Pagination state
  startIndex: number;
}

// Initialize state
const initialStationSelectionUIState: StationSelectionUIState = {
  selectedStations: [],
  startIndex: 0
};

// Create atom for station selection UI state
export const stationSelectionUIStateAtom = atomWithStorage<StationSelectionUIState>(
  'stationSelectionUIState',
  initialStationSelectionUIState
);

// Derived atoms for individual station selection UI states
export const selectedStationsAtom = atom(
  (get) => get(stationSelectionUIStateAtom).selectedStations,
  (get, set, value: any[]) => {
    set(stationSelectionUIStateAtom, {
      ...get(stationSelectionUIStateAtom),
      selectedStations: value
    });
  }
);

export const startIndexAtom = atom(
  (get) => get(stationSelectionUIStateAtom).startIndex,
  (get, set, value: number) => {
    set(stationSelectionUIStateAtom, {
      ...get(stationSelectionUIStateAtom),
      startIndex: value
    });
  }
);

// Action atoms for common station selection patterns
export const toggleStationSelectionAtom = atom(
  null,
  (get, set, station: any) => {
    const currentSelectedStations = get(stationSelectionUIStateAtom).selectedStations;
    const isSelected = currentSelectedStations.some(s => s.id === station.id);
    
    if (isSelected) {
      set(stationSelectionUIStateAtom, {
        ...get(stationSelectionUIStateAtom),
        selectedStations: currentSelectedStations.filter(s => s.id !== station.id)
      });
    } else {
      set(stationSelectionUIStateAtom, {
        ...get(stationSelectionUIStateAtom),
        selectedStations: [...currentSelectedStations, station]
      });
    }
  }
);

export const resetStationSelectionAtom = atom(
  null,
  (get, set) => {
    set(stationSelectionUIStateAtom, {
      ...get(stationSelectionUIStateAtom),
      selectedStations: [],
      startIndex: 0
    });
  }
);

export const incrementStartIndexAtom = atom(
  null,
  (get, set, increment: number) => {
    const currentStartIndex = get(stationSelectionUIStateAtom).startIndex;
    set(stationSelectionUIStateAtom, {
      ...get(stationSelectionUIStateAtom),
      startIndex: currentStartIndex + increment
    });
  }
); 