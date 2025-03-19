import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { StationType } from '@/components/complaint/StationCardEditInfo';

// Interface for UI state
export interface StationEditUIState {
  // Dialog states
  stationSelectionDialogOpen: boolean;
  unsavedChangesDialogOpen: boolean;
  waterManagementDialogOpen: boolean;
  
  // Tab state
  currentStationType: StationType;
  
  // Navigation state
  pendingNavigation: string | null;
  
  // Pagination state for dialogs
  currentPage: number;
}

// Initialize state
const initialUIState: StationEditUIState = {
  stationSelectionDialogOpen: false,
  unsavedChangesDialogOpen: false,
  waterManagementDialogOpen: false,
  currentStationType: 'monitoring',
  pendingNavigation: null,
  currentPage: 1
};

// Create atom for UI state
export const stationEditUIStateAtom = atomWithStorage<StationEditUIState>(
  'stationEditUIState',
  initialUIState
);

// Derived atoms for individual UI states
export const stationSelectionDialogOpenAtom = atom(
  (get) => get(stationEditUIStateAtom).stationSelectionDialogOpen,
  (get, set, value: boolean) => {
    set(stationEditUIStateAtom, {
      ...get(stationEditUIStateAtom),
      stationSelectionDialogOpen: value
    });
  }
);

export const unsavedChangesDialogOpenAtom = atom(
  (get) => get(stationEditUIStateAtom).unsavedChangesDialogOpen,
  (get, set, value: boolean) => {
    set(stationEditUIStateAtom, {
      ...get(stationEditUIStateAtom),
      unsavedChangesDialogOpen: value
    });
  }
);

export const waterManagementDialogOpenAtom = atom(
  (get) => get(stationEditUIStateAtom).waterManagementDialogOpen,
  (get, set, value: boolean) => {
    set(stationEditUIStateAtom, {
      ...get(stationEditUIStateAtom),
      waterManagementDialogOpen: value
    });
  }
);

export const currentStationTypeAtom = atom(
  (get) => get(stationEditUIStateAtom).currentStationType,
  (get, set, value: StationType) => {
    set(stationEditUIStateAtom, {
      ...get(stationEditUIStateAtom),
      currentStationType: value
    });
  }
);

export const pendingNavigationAtom = atom(
  (get) => get(stationEditUIStateAtom).pendingNavigation,
  (get, set, value: string | null) => {
    set(stationEditUIStateAtom, {
      ...get(stationEditUIStateAtom),
      pendingNavigation: value
    });
  }
);

export const currentPageAtom = atom(
  (get) => get(stationEditUIStateAtom).currentPage,
  (get, set, value: number) => {
    set(stationEditUIStateAtom, {
      ...get(stationEditUIStateAtom),
      currentPage: value
    });
  }
);

// Reset UI state
export const resetUIStateAtom = atom(
  null,
  (get, set) => {
    set(stationEditUIStateAtom, initialUIState);
  }
); 