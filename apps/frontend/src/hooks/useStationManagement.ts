import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useMemo } from 'react';
import {
  // Station data atoms
  monitoringStationsAtom,
  rainStationsAtom,
  reservoirsAtom,
  userSelectedMonitoringStationsAtom,
  userSelectedRainStationsAtom,
  userSelectedReservoirsAtom,
  disabledMonitoringStationsAtom,
  disabledRainStationsAtom,
  disabledReservoirsAtom,
  
  // Location atoms
  currentAmphureAtom,
  currentProvinceAtom,
  
  // Query atoms
  monitoringStationsQueryAtom,
  rainStationsQueryAtom,
  reservoirsQueryAtom,
  
  // Loading and error atoms
  isLoadingMonitoringStationsAtom,
  isLoadingRainStationsAtom,
  isLoadingReservoirsAtom,
  monitoringStationsErrorAtom,
  rainStationsErrorAtom,
  reservoirsErrorAtom,
  
  // Synchronization atoms
  syncMonitoringStationsAtom,
  syncRainStationsAtom,
  syncReservoirsAtom,
  
  // Edit session atom
  editSessionStatusAtom,
  
  // Types
  MonitoringStation,
  RainStation,
  Reservoir
} from '../atoms/stationData';

// Define navigation state type
export interface NavigationState {
  returnedFromStationEdit?: boolean;
  editSessionTimestamp?: number;
  preserveState?: boolean;
  discardedChanges?: boolean;
}

/**
 * Custom hook for consolidated station data management
 * Provides a comprehensive interface for accessing and manipulating station data
 */
export function useStationManagement() {
  // Get station data atoms
  const [monitoringStations, setMonitoringStations] = useAtom(monitoringStationsAtom);
  const [rainStations, setRainStations] = useAtom(rainStationsAtom);
  const [reservoirs, setReservoirs] = useAtom(reservoirsAtom);
  
  // Get user-selected station atoms
  const [userSelectedMonitoring, setUserSelectedMonitoring] = useAtom(userSelectedMonitoringStationsAtom);
  const [userSelectedRain, setUserSelectedRain] = useAtom(userSelectedRainStationsAtom);
  const [userSelectedReservoirs, setUserSelectedReservoirs] = useAtom(userSelectedReservoirsAtom);
  
  // Get disabled station atoms
  const [disabledMonitoring, setDisabledMonitoring] = useAtom(disabledMonitoringStationsAtom);
  const [disabledRain, setDisabledRain] = useAtom(disabledRainStationsAtom);
  const [disabledReservoirs, setDisabledReservoirs] = useAtom(disabledReservoirsAtom);
  
  // Get location atoms
  const [currentAmphure, setCurrentAmphure] = useAtom(currentAmphureAtom);
  const [currentProvince, setCurrentProvince] = useAtom(currentProvinceAtom);
  
  // Get query atoms
  const monitoringStationsQuery = useAtomValue(monitoringStationsQueryAtom);
  const rainStationsQuery = useAtomValue(rainStationsQueryAtom);
  const reservoirsQuery = useAtomValue(reservoirsQueryAtom);
  
  // Get loading atoms
  const isLoadingMonitoring = useAtomValue(isLoadingMonitoringStationsAtom);
  const isLoadingRain = useAtomValue(isLoadingRainStationsAtom);
  const isLoadingReservoirs = useAtomValue(isLoadingReservoirsAtom);
  
  // Get error atoms
  const [monitoringError, setMonitoringError] = useAtom(monitoringStationsErrorAtom);
  const [rainError, setRainError] = useAtom(rainStationsErrorAtom);
  const [reservoirsError, setReservoirsError] = useAtom(reservoirsErrorAtom);
  
  // Get synchronization atoms
  const syncMonitoring = useSetAtom(syncMonitoringStationsAtom);
  const syncRain = useSetAtom(syncRainStationsAtom);
  const syncReservoirs = useSetAtom(syncReservoirsAtom);
  
  // Get edit session atom
  const [editSession, setEditSession] = useAtom(editSessionStatusAtom);
  
  // Derived state for available stations (filtering out disabled)
  const availableMonitoringStations = useMemo(() => {
    return monitoringStations.filter(station => !disabledMonitoring[station.id]);
  }, [monitoringStations, disabledMonitoring]);
  
  const availableRainStations = useMemo(() => {
    return rainStations.filter(station => !disabledRain[station.id]);
  }, [rainStations, disabledRain]);
  
  const availableReservoirs = useMemo(() => {
    return reservoirs.filter(reservoir => !disabledReservoirs[reservoir.id]);
  }, [reservoirs, disabledReservoirs]);
  
  // Derived state for all available stations (including user-selected)
  const allAvailableMonitoringStations = useMemo(() => {
    return [
      ...availableMonitoringStations,
      ...userSelectedMonitoring.filter(station => !disabledMonitoring[station.id])
    ];
  }, [availableMonitoringStations, userSelectedMonitoring, disabledMonitoring]);
  
  const allAvailableRainStations = useMemo(() => {
    return [
      ...availableRainStations,
      ...userSelectedRain.filter(station => !disabledRain[station.id])
    ];
  }, [availableRainStations, userSelectedRain, disabledRain]);
  
  const allAvailableReservoirs = useMemo(() => {
    return [
      ...availableReservoirs,
      ...userSelectedReservoirs.filter(reservoir => !disabledReservoirs[reservoir.id])
    ];
  }, [availableReservoirs, userSelectedReservoirs, disabledReservoirs]);
  
  // Check if all stations of a type are disabled
  const areAllMonitoringStationsDisabled = useMemo(() => {
    const totalStations = monitoringStations.length + userSelectedMonitoring.length;
    const disabledCount = Object.keys(disabledMonitoring).length;
    
    console.log('[useStationManagement] Checking if all monitoring stations are disabled:', {
      totalStations,
      disabledCount,
      allDisabled: totalStations > 0 && disabledCount >= totalStations
    });
    
    return totalStations > 0 && disabledCount >= totalStations;
  }, [monitoringStations, userSelectedMonitoring, disabledMonitoring]);
  
  const areAllRainStationsDisabled = useMemo(() => {
    const totalStations = rainStations.length + userSelectedRain.length;
    const disabledCount = Object.keys(disabledRain).length;
    
    console.log('[useStationManagement] Checking if all rain stations are disabled:', {
      totalStations,
      disabledCount,
      allDisabled: totalStations > 0 && disabledCount >= totalStations
    });
    
    return totalStations > 0 && disabledCount >= totalStations;
  }, [rainStations, userSelectedRain, disabledRain]);
  
  const areAllReservoirsDisabled = useMemo(() => {
    const totalStations = reservoirs.length + userSelectedReservoirs.length;
    const disabledCount = Object.keys(disabledReservoirs).length;
    
    console.log('[useStationManagement] Checking if all reservoirs are disabled:', {
      totalStations,
      disabledCount,
      allDisabled: totalStations > 0 && disabledCount >= totalStations
    });
    
    return totalStations > 0 && disabledCount >= totalStations;
  }, [reservoirs, userSelectedReservoirs, disabledReservoirs]);
  
  // Function to mark edit session as changed
  const markChanged = useCallback((type: 'monitoring' | 'rain' | 'reservoir') => {
    setEditSession(prev => {
      // Check if this station type is already in the array
      const hasStationType = prev.changedStationTypes.includes(type);
      
      return {
        hasChanges: true,
        lastEditTimestamp: Date.now(),
        changedStationTypes: hasStationType 
          ? prev.changedStationTypes 
          : [...prev.changedStationTypes, type]
      };
    });
    
    console.log(`[useStationManagement] Marked ${type} as changed`);
  }, [setEditSession]);
  
  // Function to add a monitoring station
  const addMonitoringStation = useCallback((station: MonitoringStation) => {
    setUserSelectedMonitoring(prev => {
      // Check if station already exists
      const exists = prev.some(s => s.id === station.id);
      if (exists) {
        console.log(`[useStationManagement] Monitoring station ${station.id} already exists, skipping`);
        return prev;
      }
      
      console.log(`[useStationManagement] Adding monitoring station ${station.id}`);
      return [...prev, station];
    });
    
    // If station was previously disabled, enable it
    if (disabledMonitoring[station.id]) {
      setDisabledMonitoring(prev => {
        const newDisabled = { ...prev };
        delete newDisabled[station.id];
        return newDisabled;
      });
    }
    
    // Mark edit session as changed
    markChanged('monitoring');
  }, [setUserSelectedMonitoring, disabledMonitoring, setDisabledMonitoring, markChanged]);
  
  // Function to add a rain station
  const addRainStation = useCallback((station: RainStation) => {
    setUserSelectedRain(prev => {
      // Check if station already exists
      const exists = prev.some(s => s.id === station.id);
      if (exists) {
        console.log(`[useStationManagement] Rain station ${station.id} already exists, skipping`);
        return prev;
      }
      
      console.log(`[useStationManagement] Adding rain station ${station.id}`);
      return [...prev, station];
    });
    
    // If station was previously disabled, enable it
    if (disabledRain[station.id]) {
      setDisabledRain(prev => {
        const newDisabled = { ...prev };
        delete newDisabled[station.id];
        return newDisabled;
      });
    }
    
    // Mark edit session as changed
    markChanged('rain');
  }, [setUserSelectedRain, disabledRain, setDisabledRain, markChanged]);
  
  // Function to add a reservoir
  const addReservoir = useCallback((reservoir: Reservoir) => {
    setUserSelectedReservoirs(prev => {
      // Check if reservoir already exists
      const exists = prev.some(r => r.id === reservoir.id);
      if (exists) {
        console.log(`[useStationManagement] Reservoir ${reservoir.id} already exists, skipping`);
        return prev;
      }
      
      console.log(`[useStationManagement] Adding reservoir ${reservoir.id}`);
      return [...prev, reservoir];
    });
    
    // If reservoir was previously disabled, enable it
    if (disabledReservoirs[reservoir.id]) {
      setDisabledReservoirs(prev => {
        const newDisabled = { ...prev };
        delete newDisabled[reservoir.id];
        return newDisabled;
      });
    }
    
    // Mark edit session as changed
    markChanged('reservoir');
  }, [setUserSelectedReservoirs, disabledReservoirs, setDisabledReservoirs, markChanged]);
  
  // Function to remove a monitoring station
  const removeMonitoringStation = useCallback((stationId: string) => {
    // Check if station is user-selected
    const isUserSelected = userSelectedMonitoring.some(s => s.id === stationId);
    
    if (isUserSelected) {
      // Remove from user-selected stations
      setUserSelectedMonitoring(prev => prev.filter(s => s.id !== stationId));
      console.log(`[useStationManagement] Removed user-selected monitoring station ${stationId}`);
    } else {
      // Disable system station
      setDisabledMonitoring(prev => ({ ...prev, [stationId]: true }));
      console.log(`[useStationManagement] Disabled system monitoring station ${stationId}`);
    }
    
    // Mark edit session as changed
    markChanged('monitoring');
  }, [userSelectedMonitoring, setUserSelectedMonitoring, setDisabledMonitoring, markChanged]);
  
  // Function to remove a rain station
  const removeRainStation = useCallback((stationId: string) => {
    // Check if station is user-selected
    const isUserSelected = userSelectedRain.some(s => s.id === stationId);
    
    if (isUserSelected) {
      // Remove from user-selected stations
      setUserSelectedRain(prev => prev.filter(s => s.id !== stationId));
      console.log(`[useStationManagement] Removed user-selected rain station ${stationId}`);
    } else {
      // Disable system station
      setDisabledRain(prev => ({ ...prev, [stationId]: true }));
      console.log(`[useStationManagement] Disabled system rain station ${stationId}`);
    }
    
    // Mark edit session as changed
    markChanged('rain');
  }, [userSelectedRain, setUserSelectedRain, setDisabledRain, markChanged]);
  
  // Function to remove a reservoir
  const removeReservoir = useCallback((reservoirId: string) => {
    // Check if reservoir is user-selected
    const isUserSelected = userSelectedReservoirs.some(r => r.id === reservoirId);
    
    if (isUserSelected) {
      // Remove from user-selected reservoirs
      setUserSelectedReservoirs(prev => prev.filter(r => r.id !== reservoirId));
      console.log(`[useStationManagement] Removed user-selected reservoir ${reservoirId}`);
    } else {
      // Disable system reservoir
      setDisabledReservoirs(prev => ({ ...prev, [reservoirId]: true }));
      console.log(`[useStationManagement] Disabled system reservoir ${reservoirId}`);
    }
    
    // Mark edit session as changed
    markChanged('reservoir');
  }, [userSelectedReservoirs, setUserSelectedReservoirs, setDisabledReservoirs, markChanged]);
  
  // Function to toggle monitoring station disabled state
  const toggleMonitoringStationDisabled = useCallback((stationId: string) => {
    const isDisabled = disabledMonitoring[stationId];
    
    if (isDisabled) {
      // Enable station
      setDisabledMonitoring(prev => {
        const newDisabled = { ...prev };
        delete newDisabled[stationId];
        return newDisabled;
      });
      console.log(`[useStationManagement] Enabled monitoring station ${stationId}`);
    } else {
      // Disable station
      setDisabledMonitoring(prev => ({ ...prev, [stationId]: true }));
      console.log(`[useStationManagement] Disabled monitoring station ${stationId}`);
    }
    
    // Mark edit session as changed
    markChanged('monitoring');
  }, [disabledMonitoring, setDisabledMonitoring, markChanged]);
  
  // Function to toggle rain station disabled state
  const toggleRainStationDisabled = useCallback((stationId: string) => {
    const isDisabled = disabledRain[stationId];
    
    if (isDisabled) {
      // Enable station
      setDisabledRain(prev => {
        const newDisabled = { ...prev };
        delete newDisabled[stationId];
        return newDisabled;
      });
      console.log(`[useStationManagement] Enabled rain station ${stationId}`);
    } else {
      // Disable station
      setDisabledRain(prev => ({ ...prev, [stationId]: true }));
      console.log(`[useStationManagement] Disabled rain station ${stationId}`);
    }
    
    // Mark edit session as changed
    markChanged('rain');
  }, [disabledRain, setDisabledRain, markChanged]);
  
  // Function to toggle reservoir disabled state
  const toggleReservoirDisabled = useCallback((reservoirId: string) => {
    const isDisabled = disabledReservoirs[reservoirId];
    
    if (isDisabled) {
      // Enable reservoir
      setDisabledReservoirs(prev => {
        const newDisabled = { ...prev };
        delete newDisabled[reservoirId];
        return newDisabled;
      });
      console.log(`[useStationManagement] Enabled reservoir ${reservoirId}`);
    } else {
      // Disable reservoir
      setDisabledReservoirs(prev => ({ ...prev, [reservoirId]: true }));
      console.log(`[useStationManagement] Disabled reservoir ${reservoirId}`);
    }
    
    // Mark edit session as changed
    markChanged('reservoir');
  }, [disabledReservoirs, setDisabledReservoirs, markChanged]);
  
  // Function to reset all changes
  const resetChanges = useCallback(() => {
    console.log('[useStationManagement] Resetting all changes');
    
    try {
      // Log current state before reset
      console.log('[useStationManagement] Current state before reset:', {
        monitoringStations: monitoringStations.length,
        rainStations: rainStations.length,
        reservoirs: reservoirs.length,
        userSelectedMonitoring: userSelectedMonitoring.length,
        userSelectedRain: userSelectedRain.length,
        userSelectedReservoirs: userSelectedReservoirs.length,
        disabledMonitoring: Object.keys(disabledMonitoring).length,
        disabledRain: Object.keys(disabledRain).length,
        disabledReservoirs: Object.keys(disabledReservoirs).length
      });
      
      // Reset edit session status
      setEditSession({
        hasChanges: false,
        lastEditTimestamp: 0,
        changedStationTypes: []
      });
      
      // Reset disabled stations
      setDisabledMonitoring({});
      setDisabledRain({});
      setDisabledReservoirs({});
      
      // Reset user-selected stations
      setUserSelectedMonitoring([]);
      setUserSelectedRain([]);
      setUserSelectedReservoirs([]);
      
      // Trigger synchronization
      syncMonitoring();
      syncRain();
      syncReservoirs();
      
      console.log('[useStationManagement] Reset complete');
    } catch (error) {
      console.error('[useStationManagement] Error resetting changes:', error);
      throw error;
    }
  }, [
    monitoringStations,
    rainStations,
    reservoirs,
    userSelectedMonitoring,
    userSelectedRain,
    userSelectedReservoirs,
    disabledMonitoring,
    disabledRain,
    disabledReservoirs,
    setEditSession,
    setDisabledMonitoring,
    setDisabledRain,
    setDisabledReservoirs,
    setUserSelectedMonitoring,
    setUserSelectedRain,
    setUserSelectedReservoirs,
    syncMonitoring,
    syncRain,
    syncReservoirs
  ]);
  
  // Function to update location
  const updateLocation = useCallback((amphure?: string, province?: string) => {
    console.log('[useStationManagement] Updating location:', { amphure, province });
    
    if (amphure !== undefined) {
      setCurrentAmphure(amphure);
    }
    
    if (province !== undefined) {
      setCurrentProvince(province);
    }
  }, [setCurrentAmphure, setCurrentProvince]);
  
  // Function to check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    return editSession.hasChanges;
  }, [editSession]);
  
  // Function to save changes
  const saveChanges = useCallback(() => {
    console.log('[useStationManagement] Saving changes');
    
    try {
      // Log current state before saving
      console.log('[useStationManagement] Current state before saving:', {
        monitoringStations: monitoringStations.length,
        rainStations: rainStations.length,
        reservoirs: reservoirs.length,
        userSelectedMonitoring: userSelectedMonitoring.length,
        userSelectedRain: userSelectedRain.length,
        userSelectedReservoirs: userSelectedReservoirs.length,
        disabledMonitoring: Object.keys(disabledMonitoring).length,
        disabledRain: Object.keys(disabledRain).length,
        disabledReservoirs: Object.keys(disabledReservoirs).length
      });
      
      // Mark edit session as saved without resetting the data
      setEditSession(prev => ({
        ...prev,
        hasChanges: false
      }));
      
      // Create navigation state for returning to complaint form
      const navigationState: NavigationState = {
        returnedFromStationEdit: true,
        editSessionTimestamp: Date.now()
      };
      
      console.log('[useStationManagement] Changes saved, navigation state:', navigationState);
      
      return navigationState;
    } catch (error) {
      console.error('[useStationManagement] Error saving changes:', error);
      throw error;
    }
  }, [
    monitoringStations,
    rainStations,
    reservoirs,
    userSelectedMonitoring,
    userSelectedRain,
    userSelectedReservoirs,
    disabledMonitoring,
    disabledRain,
    disabledReservoirs,
    setEditSession
  ]);
  
  // Function to discard changes and prepare navigation state
  const discardChanges = useCallback(() => {
    console.log('[useStationManagement] Discarding changes and preparing navigation state');
    
    try {
      // Reset all changes
      resetChanges();
      
      // Create navigation state for returning to complaint form
      const navigationState: NavigationState = {
        preserveState: true,
        discardedChanges: true
      };
      
      console.log('[useStationManagement] Changes discarded, navigation state:', navigationState);
      
      return navigationState;
    } catch (error) {
      console.error('[useStationManagement] Error discarding changes:', error);
      throw error;
    }
  }, [resetChanges]);
  
  // Function to handle navigation from StationCardEdit to ComplaintForm
  const prepareNavigationState = useCallback((saveChanges: boolean) => {
    if (saveChanges) {
      return {
        returnedFromStationEdit: true,
        editSessionTimestamp: Date.now()
      };
    } else {
      return {
        preserveState: true,
        discardedChanges: true
      };
    }
  }, []);
  
  // Function to synchronize all station data
  const synchronizeAllStations = useCallback(() => {
    console.log('[useStationManagement] Synchronizing all station data');
    
    try {
      // Log current state before synchronization
      console.log('[useStationManagement] Current state before synchronization:', {
        monitoringStations: monitoringStations.length,
        rainStations: rainStations.length,
        reservoirs: reservoirs.length,
        userSelectedMonitoring: userSelectedMonitoring.length,
        userSelectedRain: userSelectedRain.length,
        userSelectedReservoirs: userSelectedReservoirs.length,
        disabledMonitoring: Object.keys(disabledMonitoring).length,
        disabledRain: Object.keys(disabledRain).length,
        disabledReservoirs: Object.keys(disabledReservoirs).length
      });
      
      // Check for edge cases before synchronization
      const allMonitoringDisabled = monitoringStations.every(station => disabledMonitoring[station.id]);
      const allRainDisabled = rainStations.every(station => disabledRain[station.id]);
      const allReservoirsDisabled = reservoirs.every(reservoir => disabledReservoirs[reservoir.id]);
      
      if (allMonitoringDisabled) {
        console.warn('[useStationManagement] All monitoring stations are disabled before synchronization');
      }
      
      if (allRainDisabled) {
        console.warn('[useStationManagement] All rain stations are disabled before synchronization');
      }
      
      if (allReservoirsDisabled) {
        console.warn('[useStationManagement] All reservoirs are disabled before synchronization');
      }
      
      // Synchronize each type of station data
      syncMonitoring();
      syncRain();
      syncReservoirs();
      
      // Add a small delay to ensure state updates are processed
      setTimeout(() => {
        // Check for edge cases after synchronization
        const updatedAllMonitoringDisabled = monitoringStations.every(station => disabledMonitoring[station.id]);
        const updatedAllRainDisabled = rainStations.every(station => disabledRain[station.id]);
        const updatedAllReservoirsDisabled = reservoirs.every(reservoir => disabledReservoirs[reservoir.id]);
        
        if (updatedAllMonitoringDisabled) {
          console.warn('[useStationManagement] All monitoring stations are still disabled after synchronization');
        }
        
        if (updatedAllRainDisabled) {
          console.warn('[useStationManagement] All rain stations are still disabled after synchronization');
        }
        
        if (updatedAllReservoirsDisabled) {
          console.warn('[useStationManagement] All reservoirs are still disabled after synchronization');
        }
        
        // Log final state after synchronization
        console.log('[useStationManagement] Final state after synchronization:', {
          monitoringStations: monitoringStations.length,
          rainStations: rainStations.length,
          reservoirs: reservoirs.length,
          userSelectedMonitoring: userSelectedMonitoring.length,
          userSelectedRain: userSelectedRain.length,
          userSelectedReservoirs: userSelectedReservoirs.length,
          disabledMonitoring: Object.keys(disabledMonitoring).length,
          disabledRain: Object.keys(disabledRain).length,
          disabledReservoirs: Object.keys(disabledReservoirs).length
        });
        
        console.log('[useStationManagement] All station data synchronized successfully');
      }, 100);
    } catch (error) {
      console.error('[useStationManagement] Error synchronizing station data:', error);
      
      // Attempt recovery for each station type
      try {
        console.warn('[useStationManagement] Attempting recovery synchronization for monitoring stations');
        syncMonitoring();
      } catch (monitoringError) {
        console.error('[useStationManagement] Recovery failed for monitoring stations:', monitoringError);
      }
      
      try {
        console.warn('[useStationManagement] Attempting recovery synchronization for rain stations');
        syncRain();
      } catch (rainError) {
        console.error('[useStationManagement] Recovery failed for rain stations:', rainError);
      }
      
      try {
        console.warn('[useStationManagement] Attempting recovery synchronization for reservoirs');
        syncReservoirs();
      } catch (reservoirError) {
        console.error('[useStationManagement] Recovery failed for reservoirs:', reservoirError);
      }
      
      throw new Error(`Failed to synchronize station data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [
    monitoringStations,
    rainStations,
    reservoirs,
    userSelectedMonitoring,
    userSelectedRain,
    userSelectedReservoirs,
    disabledMonitoring,
    disabledRain,
    disabledReservoirs,
    syncMonitoring,
    syncRain,
    syncReservoirs
  ]);
  
  // Function to handle returning from StationCardEdit
  const handleReturnFromStationEdit = useCallback((navigationState: NavigationState) => {
    console.log('[useStationManagement] Handling return from StationCardEdit:', navigationState);
    
    try {
      // If changes were discarded, don't synchronize
      if (navigationState.discardedChanges) {
        console.log('[useStationManagement] Changes were discarded, skipping synchronization');
        return;
      }
      
      // If returned from station edit, synchronize data
      if (navigationState.returnedFromStationEdit) {
        console.log('[useStationManagement] Returned from station edit, synchronizing data');
        synchronizeAllStations();
      }
    } catch (error) {
      console.error('[useStationManagement] Error handling return from StationCardEdit:', error);
      throw error;
    }
  }, [synchronizeAllStations]);
  
  // Return all station data and functions
  return {
    // Station data
    monitoringStations,
    rainStations,
    reservoirs,
    userSelectedMonitoring,
    userSelectedRain,
    userSelectedReservoirs,
    disabledMonitoring,
    disabledRain,
    disabledReservoirs,
    
    // Derived data
    availableMonitoringStations,
    availableRainStations,
    availableReservoirs,
    allAvailableMonitoringStations,
    allAvailableRainStations,
    allAvailableReservoirs,
    
    // Station status checks
    areAllMonitoringStationsDisabled,
    areAllRainStationsDisabled,
    areAllReservoirsDisabled,
    
    // Location data
    currentAmphure,
    currentProvince,
    
    // Query data
    monitoringStationsQuery,
    rainStationsQuery,
    reservoirsQuery,
    
    // Loading and error states
    isLoadingMonitoring,
    isLoadingRain,
    isLoadingReservoirs,
    monitoringError,
    rainError,
    reservoirsError,
    
    // Edit session state
    editSession,
    hasUnsavedChanges,
    
    // Station management functions
    addMonitoringStation,
    addRainStation,
    addReservoir,
    removeMonitoringStation,
    removeRainStation,
    removeReservoir,
    toggleMonitoringStationDisabled,
    toggleRainStationDisabled,
    toggleReservoirDisabled,
    
    // State management functions
    resetChanges,
    updateLocation,
    markChanged,
    
    // Navigation functions
    saveChanges,
    discardChanges,
    prepareNavigationState,
    handleReturnFromStationEdit,
    
    // Synchronization functions
    syncMonitoring,
    syncRain,
    syncReservoirs,
    synchronizeAllStations
  };
} 