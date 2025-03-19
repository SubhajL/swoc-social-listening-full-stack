import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

/**
 * Navigation state interface for transitions between components
 */
export interface NavigationState {
  // Source and destination tracking
  sourceComponent: string | null;
  destinationComponent: string | null;
  
  // Station edit specific state
  returnedFromStationEdit: boolean;
  editSessionTimestamp: number;
  discardedChanges: boolean;
  
  // Preserved state flag
  preserveState: boolean;
  
  // Track which station types were changed
  changedStationTypes?: Array<'monitoring' | 'rain' | 'reservoir'>;
}

/**
 * Initial navigation state
 */
const initialNavigationState: NavigationState = {
  sourceComponent: null,
  destinationComponent: null,
  returnedFromStationEdit: false,
  editSessionTimestamp: 0,
  discardedChanges: false,
  preserveState: false,
  changedStationTypes: []
};

/**
 * Main navigation state atom with storage persistence
 * Uses sessionStorage to persist across page refreshes but not browser sessions
 */
export const navigationStateAtom = atomWithStorage<NavigationState>(
  'navigationState',
  initialNavigationState,
  {
    getItem: (key) => {
      const storedValue = sessionStorage.getItem(key);
      return storedValue ? JSON.parse(storedValue) : initialNavigationState;
    },
    setItem: (key, value) => {
      sessionStorage.setItem(key, JSON.stringify(value));
    },
    removeItem: (key) => {
      sessionStorage.removeItem(key);
    }
  }
);

/**
 * Derived atoms for specific navigation state properties
 */

// Source component atom
export const sourceComponentAtom = atom(
  (get) => get(navigationStateAtom).sourceComponent,
  (get, set, value: string | null) => {
    set(navigationStateAtom, {
      ...get(navigationStateAtom),
      sourceComponent: value
    });
  }
);

// Destination component atom
export const destinationComponentAtom = atom(
  (get) => get(navigationStateAtom).destinationComponent,
  (get, set, value: string | null) => {
    set(navigationStateAtom, {
      ...get(navigationStateAtom),
      destinationComponent: value
    });
  }
);

// Station edit return flag atom
export const returnedFromStationEditAtom = atom(
  (get) => get(navigationStateAtom).returnedFromStationEdit,
  (get, set, value: boolean) => {
    set(navigationStateAtom, {
      ...get(navigationStateAtom),
      returnedFromStationEdit: value
    });
  }
);

// Edit session timestamp atom
export const editSessionTimestampAtom = atom(
  (get) => get(navigationStateAtom).editSessionTimestamp,
  (get, set, value: number) => {
    set(navigationStateAtom, {
      ...get(navigationStateAtom),
      editSessionTimestamp: value
    });
  }
);

// Discarded changes flag atom
export const discardedChangesAtom = atom(
  (get) => get(navigationStateAtom).discardedChanges,
  (get, set, value: boolean) => {
    set(navigationStateAtom, {
      ...get(navigationStateAtom),
      discardedChanges: value
    });
  }
);

// Preserve state flag atom
export const preserveStateAtom = atom(
  (get) => get(navigationStateAtom).preserveState,
  (get, set, value: boolean) => {
    set(navigationStateAtom, {
      ...get(navigationStateAtom),
      preserveState: value
    });
  }
);

// Changed station types atom
export const changedStationTypesAtom = atom(
  (get) => get(navigationStateAtom).changedStationTypes || [],
  (get, set, value: Array<'monitoring' | 'rain' | 'reservoir'>) => {
    set(navigationStateAtom, {
      ...get(navigationStateAtom),
      changedStationTypes: value
    });
  }
);

/**
 * Action atoms for common navigation patterns
 */

// Set navigation for StationCardEdit to ComplaintForm with saved changes
export const navigateToComplaintFormWithSavedChangesAtom = atom(
  null,
  (get, set) => {
    // Get the current edit session to access changed station types
    const currentState = get(navigationStateAtom);
    
    set(navigationStateAtom, {
      sourceComponent: 'StationCardEdit',
      destinationComponent: 'ComplaintForm',
      returnedFromStationEdit: true,
      editSessionTimestamp: Date.now(),
      discardedChanges: false,
      preserveState: true,
      changedStationTypes: currentState.changedStationTypes || []
    });
  }
);

// Set navigation for StationCardEdit to ComplaintForm with discarded changes
export const navigateToComplaintFormWithDiscardedChangesAtom = atom(
  null,
  (get, set) => {
    set(navigationStateAtom, {
      sourceComponent: 'StationCardEdit',
      destinationComponent: 'ComplaintForm',
      returnedFromStationEdit: false,
      editSessionTimestamp: Date.now(),
      discardedChanges: true,
      preserveState: true,
      changedStationTypes: []
    });
  }
);

// Set navigation for ComplaintForm to StationCardEdit
export const navigateToStationCardEditAtom = atom(
  null,
  (get, set) => {
    set(navigationStateAtom, {
      sourceComponent: 'ComplaintForm',
      destinationComponent: 'StationCardEdit',
      returnedFromStationEdit: false,
      editSessionTimestamp: 0,
      discardedChanges: false,
      preserveState: true,
      changedStationTypes: []
    });
  }
);

// Reset navigation state
export const resetNavigationStateAtom = atom(
  null,
  (get, set) => {
    set(navigationStateAtom, initialNavigationState);
  }
); 