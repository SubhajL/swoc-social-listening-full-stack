import { useAtom, useSetAtom } from 'jotai';
import { useCallback } from 'react';
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

/**
 * Custom hook that combines station management and UI state
 * Provides a comprehensive interface for the StationCardEdit component
 */
export function useStationEditState() {
  // Get station management state and functions
  const stationManagement = useStationManagement();
  
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
  
  // Function to open station selection dialog
  const openStationSelectionDialog = useCallback((stationType: StationType) => {
    console.log(`[useStationEditState] Opening station selection dialog for ${stationType}`);
    setCurrentStationType(stationType);
    setStationSelectionDialogOpen(true);
    setCurrentPage(1);
  }, [setCurrentStationType, setStationSelectionDialogOpen, setCurrentPage]);
  
  // Function to close station selection dialog
  const closeStationSelectionDialog = useCallback(() => {
    console.log('[useStationEditState] Closing station selection dialog');
    setStationSelectionDialogOpen(false);
  }, [setStationSelectionDialogOpen]);
  
  // Function to handle back navigation
  const handleBackNavigation = useCallback((path: string) => {
    console.log(`[useStationEditState] Handling back navigation to ${path}`);
    
    // If there are unsaved changes, show dialog
    if (stationManagement.hasUnsavedChanges) {
      console.log('[useStationEditState] Unsaved changes detected, showing dialog');
      setUnsavedChangesDialogOpen(true);
      setPendingNavigation(path);
    } else {
      // No unsaved changes, prepare navigation state
      console.log('[useStationEditState] No unsaved changes, preparing navigation state');
      
      // Reset navigation state since we're navigating without changes
      resetNavigationState();
      
      return { path, state: null };
    }
    
    return null;
  }, [
    stationManagement.hasUnsavedChanges, 
    setUnsavedChangesDialogOpen, 
    setPendingNavigation,
    resetNavigationState
  ]);
  
  // Function to save changes and navigate
  const saveChangesAndNavigate = useCallback(() => {
    console.log('[useStationEditState] Saving changes and navigating');
    
    try {
      // Save changes using station management
      stationManagement.saveChanges();
      
      // Update navigation state using Jotai atom
      navigateToComplaintFormWithSavedChanges();
      
      // Reset UI state
      resetUIState();
      
      console.log('[useStationEditState] Changes saved, navigation state updated:', navigationState);
      
      // Return navigation info
      return {
        path: pendingNavigation || '/complaint-form',
        state: null // No longer need to pass state via react-router
      };
    } catch (error) {
      console.error('[useStationEditState] Error saving changes:', error);
      throw error;
    }
  }, [
    stationManagement.saveChanges, 
    pendingNavigation, 
    resetUIState, 
    navigateToComplaintFormWithSavedChanges,
    navigationState
  ]);
  
  // Function to discard changes and navigate
  const discardChangesAndNavigate = useCallback(() => {
    console.log('[useStationEditState] Discarding changes and navigating');
    
    try {
      // Discard changes using station management
      stationManagement.discardChanges();
      
      // Update navigation state using Jotai atom
      navigateToComplaintFormWithDiscardedChanges();
      
      // Close dialog
      setUnsavedChangesDialogOpen(false);
      
      // Reset UI state
      resetUIState();
      
      console.log('[useStationEditState] Changes discarded, navigation state updated:', navigationState);
      
      // Return navigation info
      return {
        path: pendingNavigation || '/complaint-form',
        state: null // No longer need to pass state via react-router
      };
    } catch (error) {
      console.error('[useStationEditState] Error discarding changes:', error);
      throw error;
    }
  }, [
    stationManagement.discardChanges, 
    pendingNavigation, 
    setUnsavedChangesDialogOpen,
    resetUIState,
    navigateToComplaintFormWithDiscardedChanges,
    navigationState
  ]);
  
  // Function to cancel navigation
  const cancelNavigation = useCallback(() => {
    console.log('[useStationEditState] Canceling navigation');
    
    // Close dialog
    setUnsavedChangesDialogOpen(false);
    
    // Reset pending navigation
    setPendingNavigation(null);
  }, [setUnsavedChangesDialogOpen, setPendingNavigation]);
  
  // Function to handle stations selected from dialog
  const handleStationsFromDialog = useCallback((stations: any[]) => {
    console.log(`[useStationEditState] Adding ${stations.length} ${currentStationType} stations from dialog`);
    
    try {
      if (currentStationType === 'monitoring') {
        stations.forEach(station => {
          if (isMonitoringStation(station)) {
            stationManagement.addMonitoringStation(station);
          } else {
            console.warn('[useStationEditState] Received invalid monitoring station:', station);
          }
        });
      } else if (currentStationType === 'rain') {
        stations.forEach(station => {
          if (isRainStation(station)) {
            stationManagement.addRainStation(station);
          } else {
            console.warn('[useStationEditState] Received invalid rain station:', station);
          }
        });
      } else if (currentStationType === 'reservoir') {
        stations.forEach(reservoir => {
          if (isReservoir(reservoir)) {
            stationManagement.addReservoir(reservoir);
          } else {
            console.warn('[useStationEditState] Received invalid reservoir:', reservoir);
          }
        });
      }
      
      // Close dialog
      closeStationSelectionDialog();
      
      return true;
    } catch (error) {
      console.error(`[useStationEditState] Error adding ${currentStationType} stations:`, error);
      return false;
    }
  }, [
    currentStationType, 
    stationManagement.addMonitoringStation,
    stationManagement.addRainStation,
    stationManagement.addReservoir,
    closeStationSelectionDialog
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
    handleStationsFromDialog
  };
} 