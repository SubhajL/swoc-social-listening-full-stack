import { useAtom, useSetAtom } from 'jotai';
import { useCallback, useMemo, useRef } from 'react';
import { useStationManagement } from './useStationManagement';
import { 
  stationSelectionDialogOpenAtom,
  unsavedChangesDialogOpenAtom,
  waterManagementDialogOpenAtom,
  currentStationTypeAtom,
  pendingNavigationAtom,
  currentPageAtom,
  resetUIStateAtom
} from '@/atoms/stationEditUI';
import { StationType } from '@/components/complaint/StationCardEditInfo';
import { 
  isMonitoringStation, 
  isRainStation, 
  isReservoir 
} from '@/utils/stationTypeGuards';
import {
  navigationStateAtom,
  navigateToComplaintFormWithSavedChangesAtom,
  navigateToComplaintFormWithDiscardedChangesAtom,
  resetNavigationStateAtom
} from '@/atoms/navigationState';
import { useToast } from '@/components/ui/use-toast';

// Error types for better error handling
type ErrorSource = 'navigation' | 'stationManagement' | 'uiState' | 'apiCall';

interface ErrorContext {
  source: ErrorSource;
  operation: string;
  details?: Record<string, any>;
  originalError?: Error;
}

/**
 * Custom hook that combines station management and UI state
 * Provides a comprehensive interface for the StationCardEdit component
 */
export function useStationEditState() {
  // Get station management state and functions
  const stationManagement = useStationManagement();
  const { toast } = useToast();
  
  // Get UI state atoms
  const [stationSelectionDialogOpen, setStationSelectionDialogOpen] = useAtom(stationSelectionDialogOpenAtom);
  const [unsavedChangesDialogOpen, setUnsavedChangesDialogOpen] = useAtom(unsavedChangesDialogOpenAtom);
  const [waterManagementDialogOpen, setWaterManagementDialogOpen] = useAtom(waterManagementDialogOpenAtom);
  const [currentStationType, setCurrentStationType] = useAtom(currentStationTypeAtom);
  const [pendingNavigation, setPendingNavigation] = useAtom(pendingNavigationAtom);
  const [currentPage, setCurrentPage] = useAtom(currentPageAtom);
  const resetUIState = useAtom(resetUIStateAtom)[1];
  
  // Get navigation state atoms
  const [navigationState, setNavigationState] = useAtom(navigationStateAtom);
  const navigateToComplaintFormWithSavedChanges = useSetAtom(navigateToComplaintFormWithSavedChangesAtom);
  const navigateToComplaintFormWithDiscardedChanges = useSetAtom(navigateToComplaintFormWithDiscardedChangesAtom);
  const resetNavigationState = useSetAtom(resetNavigationStateAtom);
  
  // Create stable references for functions
  const stableFunctionsRef = useRef({
    resetUIState,
    resetNavigationState,
    navigateToComplaintFormWithSavedChanges,
    navigateToComplaintFormWithDiscardedChanges,
    saveChanges: stationManagement.saveChanges,
    discardChanges: stationManagement.discardChanges
  });
  
  // Update refs when functions change
  stableFunctionsRef.current = {
    resetUIState,
    resetNavigationState,
    navigateToComplaintFormWithSavedChanges,
    navigateToComplaintFormWithDiscardedChanges,
    saveChanges: stationManagement.saveChanges,
    discardChanges: stationManagement.discardChanges
  };
  
  // Helper function for handling errors
  const handleError = useCallback((context: ErrorContext) => {
    // Log the error with context
    console.error(`[useStationEditState] Error in ${context.source}/${context.operation}:`, {
      ...context.details,
      error: context.originalError
    });
    
    // Show toast notification based on error type
    switch (context.source) {
      case 'navigation':
        toast({
          title: 'Navigation Error',
          description: `Failed to navigate: ${context.originalError?.message || 'Unknown error'}`,
          variant: 'destructive',
        });
        break;
      case 'stationManagement':
        toast({
          title: 'Station Management Error',
          description: `Failed to ${context.operation}: ${context.originalError?.message || 'Unknown error'}`,
          variant: 'destructive',
        });
        break;
      case 'apiCall':
        toast({
          title: 'API Error',
          description: `Failed to communicate with server: ${context.originalError?.message || 'Connection error'}`,
          variant: 'destructive',
        });
        break;
      default:
        toast({
          title: 'Error',
          description: context.originalError?.message || 'An unexpected error occurred',
          variant: 'destructive',
        });
    }
    
    // Attempt recovery based on error type
    if (context.source === 'navigation') {
      // Reset navigation state to prevent getting stuck
      try {
        stableFunctionsRef.current.resetNavigationState();
      } catch (recoveryError) {
        console.error('[useStationEditState] Failed to recover from navigation error:', recoveryError);
      }
    }
  }, [toast]);
  
  // Function to open station selection dialog
  const openStationSelectionDialog = useCallback((stationType: StationType) => {
    try {
      setCurrentStationType(stationType);
      setStationSelectionDialogOpen(true);
      setCurrentPage(1);
    } catch (error) {
      handleError({
        source: 'uiState',
        operation: 'openStationSelectionDialog',
        details: { stationType },
        originalError: error instanceof Error ? error : new Error(String(error))
      });
    }
  }, [setCurrentStationType, setStationSelectionDialogOpen, setCurrentPage, handleError]);
  
  // Function to close station selection dialog
  const closeStationSelectionDialog = useCallback(() => {
    try {
      setStationSelectionDialogOpen(false);
    } catch (error) {
      handleError({
        source: 'uiState',
        operation: 'closeStationSelectionDialog',
        originalError: error instanceof Error ? error : new Error(String(error))
      });
    }
  }, [setStationSelectionDialogOpen, handleError]);
  
  // Function to handle back navigation
  const handleBackNavigation = useCallback((path: string) => {
    try {
      // If there are unsaved changes, show dialog
      if (stationManagement.hasUnsavedChanges) {
        setUnsavedChangesDialogOpen(true);
        setPendingNavigation(path);
      } else {
        // No unsaved changes, prepare navigation state
        // Reset navigation state since we're navigating without changes
        stableFunctionsRef.current.resetNavigationState();
        
        return { path, state: null };
      }
      
      return null;
    } catch (error) {
      handleError({
        source: 'navigation',
        operation: 'handleBackNavigation',
        details: { path },
        originalError: error instanceof Error ? error : new Error(String(error))
      });
      
      // Return a safe fallback
      return { path, state: null };
    }
  }, [
    stationManagement.hasUnsavedChanges, 
    setUnsavedChangesDialogOpen, 
    setPendingNavigation,
    handleError
  ]);
  
  // Function to save changes and navigate
  const saveChangesAndNavigate = useCallback(() => {
    try {
      // Save changes using station management
      stableFunctionsRef.current.saveChanges();
      
      // Update navigation state using Jotai atom
      stableFunctionsRef.current.navigateToComplaintFormWithSavedChanges();
      
      // Reset UI state
      stableFunctionsRef.current.resetUIState();
      
      // Return navigation info
      return {
        path: pendingNavigation || '/complaint-form',
        state: null // No longer need to pass state via react-router
      };
    } catch (error) {
      // Enhanced error handling with context
      handleError({
        source: 'stationManagement',
        operation: 'saveChanges',
        details: { pendingNavigation, navigationState },
        originalError: error instanceof Error ? error : new Error(String(error))
      });
      
      // Return a safe fallback to prevent UI from getting stuck
      return {
        path: pendingNavigation || '/complaint-form',
        state: null
      };
    }
  }, [
    pendingNavigation,
    navigationState,
    handleError
  ]);
  
  // Function to discard changes and navigate
  const discardChangesAndNavigate = useCallback(() => {
    try {
      // Discard changes using station management
      stableFunctionsRef.current.discardChanges();
      
      // Update navigation state using Jotai atom
      stableFunctionsRef.current.navigateToComplaintFormWithDiscardedChanges();
      
      // Close dialog
      setUnsavedChangesDialogOpen(false);
      
      // Reset UI state
      stableFunctionsRef.current.resetUIState();
      
      // Return navigation info
      return {
        path: pendingNavigation || '/complaint-form',
        state: null // No longer need to pass state via react-router
      };
    } catch (error) {
      // Enhanced error handling with context
      handleError({
        source: 'stationManagement',
        operation: 'discardChanges',
        details: { pendingNavigation, navigationState },
        originalError: error instanceof Error ? error : new Error(String(error))
      });
      
      // Return a safe fallback to prevent UI from getting stuck
      return {
        path: pendingNavigation || '/complaint-form',
        state: null
      };
    }
  }, [
    pendingNavigation,
    setUnsavedChangesDialogOpen,
    navigationState,
    handleError
  ]);
  
  // Function to cancel navigation
  const cancelNavigation = useCallback(() => {
    try {
      // Close dialog
      setUnsavedChangesDialogOpen(false);
      
      // Reset pending navigation
      setPendingNavigation(null);
    } catch (error) {
      handleError({
        source: 'navigation',
        operation: 'cancelNavigation',
        originalError: error instanceof Error ? error : new Error(String(error))
      });
    }
  }, [setUnsavedChangesDialogOpen, setPendingNavigation, handleError]);
  
  // Memoize the station type checking functions
  const stationTypeCheckers = useMemo(() => ({
    isMonitoringStation,
    isRainStation,
    isReservoir
  }), []);
  
  // Function to handle stations selected from dialog
  const handleStationsFromDialog = useCallback((stations: any[]) => {
    try {
      if (currentStationType === 'monitoring') {
        stations.forEach(station => {
          if (stationTypeCheckers.isMonitoringStation(station)) {
            stationManagement.addMonitoringStation(station);
          } else {
            throw new Error(`Invalid monitoring station data: ${JSON.stringify(station)}`);
          }
        });
      } else if (currentStationType === 'rain') {
        stations.forEach(station => {
          if (stationTypeCheckers.isRainStation(station)) {
            stationManagement.addRainStation(station);
          } else {
            throw new Error(`Invalid rain station data: ${JSON.stringify(station)}`);
          }
        });
      } else if (currentStationType === 'reservoir') {
        stations.forEach(reservoir => {
          if (stationTypeCheckers.isReservoir(reservoir)) {
            stationManagement.addReservoir(reservoir);
          } else {
            throw new Error(`Invalid reservoir data: ${JSON.stringify(reservoir)}`);
          }
        });
      }
      
      // Close dialog
      closeStationSelectionDialog();
      
      return true;
    } catch (error) {
      // Enhanced error handling with context
      handleError({
        source: 'stationManagement',
        operation: `add${currentStationType}Stations`,
        details: { stationCount: stations.length },
        originalError: error instanceof Error ? error : new Error(String(error))
      });
      
      // Close dialog even on error to prevent UI from getting stuck
      closeStationSelectionDialog();
      
      return false;
    }
  }, [
    currentStationType, 
    stationManagement.addMonitoringStation,
    stationManagement.addRainStation,
    stationManagement.addReservoir,
    closeStationSelectionDialog,
    handleError,
    stationTypeCheckers
  ]);
  
  // Return combined state and functions
  return {
    // Station management state and functions
    ...stationManagement,
    
    // UI state
    stationSelectionDialogOpen,
    unsavedChangesDialogOpen,
    waterManagementDialogOpen,
    currentStationType,
    pendingNavigation,
    currentPage,
    
    // Navigation state
    navigationState,
    
    // UI state functions
    setStationSelectionDialogOpen,
    setUnsavedChangesDialogOpen,
    setWaterManagementDialogOpen,
    setCurrentStationType,
    setPendingNavigation,
    setCurrentPage,
    resetUIState,
    
    // Combined functions
    openStationSelectionDialog,
    closeStationSelectionDialog,
    handleBackNavigation,
    saveChangesAndNavigate,
    discardChangesAndNavigate,
    cancelNavigation,
    handleStationsFromDialog,
    
    // Error handling
    handleError
  };
} 