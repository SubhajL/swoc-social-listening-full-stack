import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// Interface for error handling UI state
export interface ErrorHandlingUIState {
  // Synchronization error state
  syncError: Error | null;
  syncErrorMessage: string;
  isRetrying: boolean;
  retryCount: number;
  
  // Maximum retry attempts
  maxRetryAttempts: number;
}

// Initialize state
const initialErrorHandlingUIState: ErrorHandlingUIState = {
  syncError: null,
  syncErrorMessage: '',
  isRetrying: false,
  retryCount: 0,
  maxRetryAttempts: 3
};

// Create atom for error handling UI state
export const errorHandlingUIStateAtom = atomWithStorage<ErrorHandlingUIState>(
  'errorHandlingUIState',
  initialErrorHandlingUIState
);

// Derived atoms for individual error handling UI states
export const syncErrorAtom = atom(
  (get) => get(errorHandlingUIStateAtom).syncError,
  (get, set, value: Error | null) => {
    set(errorHandlingUIStateAtom, {
      ...get(errorHandlingUIStateAtom),
      syncError: value
    });
  }
);

export const syncErrorMessageAtom = atom(
  (get) => get(errorHandlingUIStateAtom).syncErrorMessage,
  (get, set, value: string) => {
    set(errorHandlingUIStateAtom, {
      ...get(errorHandlingUIStateAtom),
      syncErrorMessage: value
    });
  }
);

export const isRetryingAtom = atom(
  (get) => get(errorHandlingUIStateAtom).isRetrying,
  (get, set, value: boolean) => {
    set(errorHandlingUIStateAtom, {
      ...get(errorHandlingUIStateAtom),
      isRetrying: value
    });
  }
);

export const retryCountAtom = atom(
  (get) => get(errorHandlingUIStateAtom).retryCount,
  (get, set, value: number) => {
    set(errorHandlingUIStateAtom, {
      ...get(errorHandlingUIStateAtom),
      retryCount: value
    });
  }
);

export const maxRetryAttemptsAtom = atom(
  (get) => get(errorHandlingUIStateAtom).maxRetryAttempts,
  (get, set, value: number) => {
    set(errorHandlingUIStateAtom, {
      ...get(errorHandlingUIStateAtom),
      maxRetryAttempts: value
    });
  }
);

// Action atoms for common error handling patterns
export const incrementRetryCountAtom = atom(
  null,
  (get, set) => {
    const currentCount = get(errorHandlingUIStateAtom).retryCount;
    set(errorHandlingUIStateAtom, {
      ...get(errorHandlingUIStateAtom),
      retryCount: currentCount + 1
    });
  }
);

export const resetErrorStateAtom = atom(
  null,
  (get, set) => {
    set(errorHandlingUIStateAtom, {
      ...get(errorHandlingUIStateAtom),
      syncError: null,
      syncErrorMessage: '',
      isRetrying: false,
      retryCount: 0
    });
  }
);

export const setErrorStateAtom = atom(
  null,
  (get, set, error: Error, message: string) => {
    set(errorHandlingUIStateAtom, {
      ...get(errorHandlingUIStateAtom),
      syncError: error,
      syncErrorMessage: message
    });
  }
); 