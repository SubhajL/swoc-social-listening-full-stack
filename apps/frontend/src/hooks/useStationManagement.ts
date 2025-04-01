import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useMemo, useRef, useEffect } from 'react';
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
  
  // Original state atoms
  originalMonitoringStationsAtom,
  originalRainStationsAtom,
  originalReservoirsAtom,
  originalUserSelectedMonitoringStationsAtom,
  originalUserSelectedRainStationsAtom,
  originalUserSelectedReservoirsAtom,
  originalDisabledMonitoringStationsAtom,
  originalDisabledRainStationsAtom,
  originalDisabledReservoirsAtom,
  
  // State management atoms
  isEditModeAtom,
  hasUnsavedChangesAtom,
  saveOriginalStateAtom,
  restoreOriginalStateAtom,
  trackStationChangesAtom,
  
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
import { useToast } from '@/components/ui/use-toast';

// Define navigation state type
export interface NavigationState {
  returnedFromStationEdit?: boolean;
  editSessionTimestamp?: number;
  preserveState?: boolean;
  discardedChanges?: boolean;
  changedStationTypes?: Array<'monitoring' | 'rain' | 'reservoir'>;
}

// Create a stable empty object reference to use in dependency arrays
const EMPTY_OBJECT = {};

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
  
  // Get original state atoms
  const [originalMonitoring] = useAtom(originalMonitoringStationsAtom);
  const [originalRain] = useAtom(originalRainStationsAtom);
  const [originalReservoirs] = useAtom(originalReservoirsAtom);
  
  const [originalUserSelectedMonitoring] = useAtom(originalUserSelectedMonitoringStationsAtom);
  const [originalUserSelectedRain] = useAtom(originalUserSelectedRainStationsAtom);
  const [originalUserSelectedReservoirs] = useAtom(originalUserSelectedReservoirsAtom);
  
  const [originalDisabledMonitoring] = useAtom(originalDisabledMonitoringStationsAtom);
  const [originalDisabledRain] = useAtom(originalDisabledRainStationsAtom);
  const [originalDisabledReservoirs] = useAtom(originalDisabledReservoirsAtom);
  
  // Get state management atoms
  const [isEditMode, setIsEditMode] = useAtom(isEditModeAtom);
  const [hasUnsavedChanges] = useAtom(hasUnsavedChangesAtom);
  const saveOriginalState = useSetAtom(saveOriginalStateAtom);
  const restoreOriginalState = useSetAtom(restoreOriginalStateAtom);
  const trackStationChanges = useSetAtom(trackStationChangesAtom);
  
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
  const [editSessionStatus, setEditSessionStatus] = useAtom(editSessionStatusAtom);
  
  // Get toast function
  const { toast } = useToast();
  
  // Create refs for stable function references
  const syncFunctionsRef = useRef({
    syncMonitoring,
    syncRain,
    syncReservoirs
  });
  
  // Update refs when functions change
  syncFunctionsRef.current = {
    syncMonitoring,
    syncRain,
    syncReservoirs
  };
  
  // Create a ref to track previous location
  const prevLocationKeyRef = useRef('');
  
  // Memoize the keys of disabled stations for dependency tracking
  const disabledMonitoringKeys = useMemo(() => 
    Object.keys(disabledMonitoring), [disabledMonitoring]);
  
  const disabledRainKeys = useMemo(() => 
    Object.keys(disabledRain), [disabledRain]);
  
  const disabledReservoirsKeys = useMemo(() => 
    Object.keys(disabledReservoirs), [disabledReservoirs]);
  
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
    const filteredUserSelected = userSelectedMonitoring.filter(station => !disabledMonitoring[station.id]);
    return [...availableMonitoringStations, ...filteredUserSelected];
  }, [availableMonitoringStations, userSelectedMonitoring, disabledMonitoring]);
  
  const allAvailableRainStations = useMemo(() => {
    const filteredUserSelected = userSelectedRain.filter(station => !disabledRain[station.id]);
    return [...availableRainStations, ...filteredUserSelected];
  }, [availableRainStations, userSelectedRain, disabledRain]);
  
  const allAvailableReservoirs = useMemo(() => {
    const filteredUserSelected = userSelectedReservoirs.filter(reservoir => !disabledReservoirs[reservoir.id]);
    return [...availableReservoirs, ...filteredUserSelected];
  }, [availableReservoirs, userSelectedReservoirs, disabledReservoirs]);
  
  // Check if all stations of a type are disabled
  const areAllMonitoringStationsDisabled = useMemo(() => {
    const totalStations = monitoringStations.length + userSelectedMonitoring.length;
    const disabledCount = disabledMonitoringKeys.length;
    return totalStations > 0 && disabledCount >= totalStations;
  }, [monitoringStations.length, userSelectedMonitoring.length, disabledMonitoringKeys.length]);
  
  const areAllRainStationsDisabled = useMemo(() => {
    const totalStations = rainStations.length + userSelectedRain.length;
    const disabledCount = disabledRainKeys.length;
    return totalStations > 0 && disabledCount >= totalStations;
  }, [rainStations.length, userSelectedRain.length, disabledRainKeys.length]);
  
  const areAllReservoirsDisabled = useMemo(() => {
    const totalStations = reservoirs.length + userSelectedReservoirs.length;
    const disabledCount = disabledReservoirsKeys.length;
    return totalStations > 0 && disabledCount >= totalStations;
  }, [reservoirs.length, userSelectedReservoirs.length, disabledReservoirsKeys.length]);
  
  // Function to mark edit session as changed
  const markChanged = useCallback((type: 'monitoring' | 'rain' | 'reservoir') => {
    setEditSessionStatus(prev => {
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
  }, [setEditSessionStatus]);
  
  // Function to add a monitoring station
  const addMonitoringStation = useCallback((station: MonitoringStation) => {
    setUserSelectedMonitoring(prev => {
      // Check if station already exists
      const exists = prev.some(s => s.id === station.id);
      if (exists) {
        return prev;
      }
      
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
        return prev;
      }
      
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
        return prev;
      }
      
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
  
  // Memoize the station ID lookup functions for better performance
  const userSelectedMonitoringIds = useMemo(() => {
    return new Set(userSelectedMonitoring.map(s => s.id));
  }, [userSelectedMonitoring]);
  
  const userSelectedRainIds = useMemo(() => {
    return new Set(userSelectedRain.map(s => s.id));
  }, [userSelectedRain]);
  
  const userSelectedReservoirIds = useMemo(() => {
    return new Set(userSelectedReservoirs.map(r => r.id));
  }, [userSelectedReservoirs]);
  
  // Function to remove a monitoring station
  const removeMonitoringStation = useCallback((stationId: string) => {
    // Check if station is user-selected using the memoized Set
    const isUserSelected = userSelectedMonitoringIds.has(stationId);
    
    if (isUserSelected) {
      // Remove from user-selected stations
      setUserSelectedMonitoring(prev => prev.filter(s => s.id !== stationId));
    } else {
      // Disable system station
      setDisabledMonitoring(prev => ({ ...prev, [stationId]: true }));
    }
    
    // Mark edit session as changed
    markChanged('monitoring');
  }, [userSelectedMonitoringIds, setUserSelectedMonitoring, setDisabledMonitoring, markChanged]);
  
  // Function to remove a rain station
  const removeRainStation = useCallback((stationId: string) => {
    // Check if station is user-selected using the memoized Set
    const isUserSelected = userSelectedRainIds.has(stationId);
    
    if (isUserSelected) {
      // Remove from user-selected stations
      setUserSelectedRain(prev => prev.filter(s => s.id !== stationId));
    } else {
      // Disable system station
      setDisabledRain(prev => ({ ...prev, [stationId]: true }));
    }
    
    // Mark edit session as changed
    markChanged('rain');
  }, [userSelectedRainIds, setUserSelectedRain, setDisabledRain, markChanged]);
  
  // Function to remove a reservoir
  const removeReservoir = useCallback((reservoirId: string) => {
    // Check if reservoir is user-selected using the memoized Set
    const isUserSelected = userSelectedReservoirIds.has(reservoirId);
    
    if (isUserSelected) {
      // Remove from user-selected reservoirs
      setUserSelectedReservoirs(prev => prev.filter(r => r.id !== reservoirId));
    } else {
      // Disable system reservoir
      setDisabledReservoirs(prev => ({ ...prev, [reservoirId]: true }));
    }
    
    // Mark edit session as changed
    markChanged('reservoir');
  }, [userSelectedReservoirIds, setUserSelectedReservoirs, setDisabledReservoirs, markChanged]);
  
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
    } else {
      // Disable station
      setDisabledMonitoring(prev => ({ ...prev, [stationId]: true }));
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
    } else {
      // Disable station
      setDisabledRain(prev => ({ ...prev, [stationId]: true }));
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
    } else {
      // Disable reservoir
      setDisabledReservoirs(prev => ({ ...prev, [reservoirId]: true }));
    }
    
    // Mark edit session as changed
    markChanged('reservoir');
  }, [disabledReservoirs, setDisabledReservoirs, markChanged]);
  
  // Function to reset all changes
  const resetChanges = useCallback(() => {
    try {
      // Reset edit session status
      setEditSessionStatus({
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
      
      // Trigger synchronization using the stable refs
      syncFunctionsRef.current.syncMonitoring();
      syncFunctionsRef.current.syncRain();
      syncFunctionsRef.current.syncReservoirs();
    } catch (error) {
      console.error('[useStationManagement] Error resetting changes:', error);
      throw error;
    }
  }, [
    setEditSessionStatus,
    setDisabledMonitoring,
    setDisabledRain,
    setDisabledReservoirs,
    setUserSelectedMonitoring,
    setUserSelectedRain,
    setUserSelectedReservoirs
  ]);
  
  // Function to update location
  const updateLocation = useCallback((amphure?: string, province?: string) => {
    console.log('[useStationManagement] Updating location:', { amphure, province });
    
    // Normalize inputs to empty strings if undefined to simplify comparison
    const normalizedAmphure = amphure || '';
    const normalizedProvince = province || '';
    
    // Track if we've already processed this exact location combination (with === comparison)
    const locationKey = `${normalizedAmphure}:${normalizedProvince}`;
    
    // Skip if it's exactly the same location we already processed
    if (prevLocationKeyRef.current === locationKey) {
      console.log('[useStationManagement] Exact same location already processed, skipping update');
      return;
    }
    
    // Update the ref to the current location
    prevLocationKeyRef.current = locationKey;
    
    // Check if we actually need to update (allows for different objects with same string value)
    if (normalizedAmphure === currentAmphure && normalizedProvince === currentProvince) {
      console.log('[useStationManagement] Location unchanged, skipping update');
      return;
    }
    
    // Track if location actually changed
    let locationChanged = false;
    
    if (normalizedAmphure !== currentAmphure) {
      console.log('[useStationManagement] Setting amphure:', normalizedAmphure);
      setCurrentAmphure(normalizedAmphure);
      locationChanged = true;
    }
    
    if (normalizedProvince !== currentProvince) {
      console.log('[useStationManagement] Setting province:', normalizedProvince);
      setCurrentProvince(normalizedProvince);
      locationChanged = true;
    }
    
    // Debug log to show URL encoded parameters
    console.log('[useStationManagement] URL encoded parameters:', {
      amphure: encodeURIComponent(normalizedAmphure),
      province: encodeURIComponent(normalizedProvince)
    });
    
    // Force a refetch if location changed
    if (locationChanged) {
      console.log('[useStationManagement] Location changed, triggering refetch');
      
      // Clear any existing errors before fetching
      setMonitoringError(null);
      setRainError(null);
      setReservoirsError(null);
      
      // Debounce the API calls to prevent rapid successive requests
      const timeoutRef = setTimeout(() => {
        // Trigger refetch by calling sync functions
        Promise.all([
          Promise.resolve(syncFunctionsRef.current.syncMonitoring()).catch(err => {
            console.warn('[useStationManagement] Error syncing monitoring stations:', err);
            return null;
          }),
          Promise.resolve(syncFunctionsRef.current.syncRain()).catch(err => {
            console.warn('[useStationManagement] Error syncing rain stations:', err);
            return null;
          }),
          Promise.resolve(syncFunctionsRef.current.syncReservoirs()).catch(err => {
            console.warn('[useStationManagement] Error syncing reservoirs:', err);
            return null;
          })
        ]).then(() => {
          console.log('[useStationManagement] Refetch completed for all station types');
        });
      }, 100); // Small delay to debounce and ensure state updates are processed
      
      // Cleanup function to cancel timeout if component unmounts or function is called again
      return () => clearTimeout(timeoutRef);
    }
  }, [
    currentAmphure, 
    currentProvince, 
    setCurrentAmphure, 
    setCurrentProvince, 
    setMonitoringError,
    setRainError,
    setReservoirsError
  ]);
  
  // Function to enter edit mode and save the original state
  const enterEditMode = useCallback(() => {
    console.log('[useStationManagement] Entering edit mode and saving original state');
    saveOriginalState();
  }, [saveOriginalState]);
  
  // Function to exit edit mode without saving changes (discard)
  const discardChanges = useCallback(() => {
    console.log('[useStationManagement] Discarding changes and restoring original state');
    restoreOriginalState();
    
    // Show toast notification
    toast({
      title: "การเปลี่ยนแปลงถูกยกเลิก",
      description: "การเปลี่ยนแปลงทั้งหมดถูกยกเลิกและคืนค่ากลับเป็นค่าเดิม",
      variant: "default",
    });
    
    return true; // Return true to indicate successful discard
  }, [restoreOriginalState, toast]);
  
  // Function to save changes and exit edit mode
  const saveChanges = useCallback(() => {
    console.log('[useStationManagement] Saving changes and exiting edit mode');
    
    // Update the original state to match the current state
    saveOriginalState();
    
    // Reset edit mode
    setIsEditMode(false);
    
    // Show toast notification
    toast({
      title: "บันทึกการเปลี่ยนแปลงสำเร็จ",
      description: "การเปลี่ยนแปลงทั้งหมดถูกบันทึกเรียบร้อยแล้ว",
      variant: "default",
    });
    
    return true; // Return true to indicate successful save
  }, [saveOriginalState, setIsEditMode, toast]);
  
  // Track changes whenever station data changes
  useEffect(() => {
    if (isEditMode) {
      trackStationChanges();
    }
  }, [
    isEditMode,
    trackStationChanges,
    monitoringStations,
    rainStations,
    reservoirs,
    userSelectedMonitoring,
    userSelectedRain,
    userSelectedReservoirs,
    disabledMonitoring,
    disabledRain,
    disabledReservoirs
  ]);
  
  // Function to synchronize all station data
  const synchronizeAllStations = useCallback(() => {
    try {
      // Synchronize each type of station data using the stable refs
      // Wrap void functions in Promise.resolve() to make them properly chainable
      const monitoringPromise = Promise.resolve(syncFunctionsRef.current.syncMonitoring())
        .catch((error: Error) => {
          console.error('[useStationManagement] Error synchronizing monitoring stations:', error);
          return Promise.resolve(); // Continue with other synchronizations
        });
      
      const rainPromise = Promise.resolve(syncFunctionsRef.current.syncRain())
        .catch((error: Error) => {
          console.error('[useStationManagement] Error synchronizing rain stations:', error);
          return Promise.resolve(); // Continue with other synchronizations
        });
      
      const reservoirsPromise = Promise.resolve(syncFunctionsRef.current.syncReservoirs())
        .catch((error: Error) => {
          console.error('[useStationManagement] Error synchronizing reservoirs:', error);
          return Promise.resolve(); // Continue with other synchronizations
        });
      
      // Return a promise that resolves after all synchronizations complete or fail
      return Promise.all([monitoringPromise, rainPromise, reservoirsPromise])
        .then(() => {
          // Add a small delay to ensure state updates are processed
          return new Promise<void>(resolve => {
            setTimeout(() => {
              // Verify data integrity after synchronization
              verifyDataIntegrity();
              resolve();
            }, 100);
          });
        });
    } catch (error) {
      console.error('[useStationManagement] Error synchronizing station data:', error);
      
      // Attempt recovery for each station type
      const recoveryPromises: Promise<void>[] = [];
      
      try {
        recoveryPromises.push(
          Promise.resolve(syncFunctionsRef.current.syncMonitoring())
            .catch((e: Error) => {
              console.error('[useStationManagement] Recovery failed for monitoring stations:', e);
              return Promise.resolve();
            })
        );
      } catch (monitoringError) {
        console.error('[useStationManagement] Recovery failed for monitoring stations:', monitoringError);
      }
      
      try {
        recoveryPromises.push(
          Promise.resolve(syncFunctionsRef.current.syncRain())
            .catch((e: Error) => {
              console.error('[useStationManagement] Recovery failed for rain stations:', e);
              return Promise.resolve();
            })
        );
      } catch (rainError) {
        console.error('[useStationManagement] Recovery failed for rain stations:', rainError);
      }
      
      try {
        recoveryPromises.push(
          Promise.resolve(syncFunctionsRef.current.syncReservoirs())
            .catch((e: Error) => {
              console.error('[useStationManagement] Recovery failed for reservoirs:', e);
              return Promise.resolve();
            })
        );
      } catch (reservoirError) {
        console.error('[useStationManagement] Recovery failed for reservoirs:', reservoirError);
      }
      
      // Wait for all recovery attempts to complete
      return Promise.all(recoveryPromises)
        .then(() => {
          // Verify data integrity after recovery
          verifyDataIntegrity();
          return Promise.resolve();
        })
        .catch(() => {
          // If recovery fails, throw a more descriptive error
          throw new Error(`Failed to synchronize station data: ${error instanceof Error ? error.message : String(error)}`);
        });
    }
  }, []);
  
  // Function to verify data integrity after synchronization
  const verifyDataIntegrity = useCallback(() => {
    // Check if all stations of a type are disabled
    const allMonitoringDisabled = areAllMonitoringStationsDisabled;
    const allRainDisabled = areAllRainStationsDisabled;
    const allReservoirsDisabled = areAllReservoirsDisabled;
    
    // Log warnings for disabled station types
    if (allMonitoringDisabled) {
      console.warn('[useStationManagement] All monitoring stations are disabled after synchronization');
    }
    
    if (allRainDisabled) {
      console.warn('[useStationManagement] All rain stations are disabled after synchronization');
    }
    
    if (allReservoirsDisabled) {
      console.warn('[useStationManagement] All reservoirs are disabled after synchronization');
    }
    
    // If all stations of all types are disabled, attempt to restore defaults
    if (allMonitoringDisabled && allRainDisabled && allReservoirsDisabled) {
      console.warn('[useStationManagement] All station types are disabled, attempting to restore defaults');
      
      // Reset disabled stations to ensure at least some stations are available
      setDisabledMonitoring({});
      setDisabledRain({});
      setDisabledReservoirs({});
      
      // Re-trigger synchronization with a delay to avoid infinite loops
      setTimeout(() => {
        try {
          syncFunctionsRef.current.syncMonitoring();
          syncFunctionsRef.current.syncRain();
          syncFunctionsRef.current.syncReservoirs();
        } catch (error) {
          console.error('[useStationManagement] Error restoring defaults:', error);
        }
      }, 500);
    }
  }, [
    areAllMonitoringStationsDisabled,
    areAllRainStationsDisabled,
    areAllReservoirsDisabled,
    setDisabledMonitoring,
    setDisabledRain,
    setDisabledReservoirs
  ]);
  
  // Function to handle returning from StationCardEdit
  const handleReturnFromStationEdit = useCallback((navigationState: NavigationState) => {
    try {
      // If changes were discarded, don't synchronize
      if (navigationState.discardedChanges) {
        return;
      }
      
      // If returned from station edit, synchronize data
      if (navigationState.returnedFromStationEdit) {
        // Check if we have information about which station types were changed
        const changedTypes = navigationState.changedStationTypes || [];
        
        if (changedTypes.length > 0) {
          console.log('[useStationManagement] Synchronizing specific station types:', changedTypes);
          
          // Only synchronize the station types that were changed
          const syncPromises: Promise<void>[] = [];
          
          if (changedTypes.includes('monitoring')) {
            syncPromises.push(
              Promise.resolve(syncFunctionsRef.current.syncMonitoring())
                .catch((error: Error) => {
                  console.error('[useStationManagement] Error synchronizing monitoring stations:', error);
                  return Promise.resolve();
                })
            );
          }
          
          if (changedTypes.includes('rain')) {
            syncPromises.push(
              Promise.resolve(syncFunctionsRef.current.syncRain())
                .catch((error: Error) => {
                  console.error('[useStationManagement] Error synchronizing rain stations:', error);
                  return Promise.resolve();
                })
            );
          }
          
          if (changedTypes.includes('reservoir')) {
            syncPromises.push(
              Promise.resolve(syncFunctionsRef.current.syncReservoirs())
                .catch((error: Error) => {
                  console.error('[useStationManagement] Error synchronizing reservoirs:', error);
                  return Promise.resolve();
                })
            );
          }
          
          // Wait for all synchronizations to complete
          Promise.all(syncPromises)
            .then(() => {
              // Verify data integrity after synchronization
              setTimeout(verifyDataIntegrity, 100);
            })
            .catch((error: Error) => {
              console.error('[useStationManagement] Error during selective synchronization:', error);
              // Fall back to full synchronization
              synchronizeAllStations()
                .then(() => setTimeout(verifyDataIntegrity, 100))
                .catch((e: Error) => console.error('[useStationManagement] Fallback synchronization failed:', e));
            });
        } else {
          // If no specific types are specified, synchronize all
          synchronizeAllStations()
            .then(() => setTimeout(verifyDataIntegrity, 100))
            .catch((error: Error) => {
              console.error('[useStationManagement] Error during full synchronization:', error);
              // Even if synchronization fails, still verify data integrity
              setTimeout(verifyDataIntegrity, 100);
            });
        }
      }
    } catch (error) {
      console.error('[useStationManagement] Error handling return from StationCardEdit:', error);
      
      // Attempt recovery by verifying data integrity
      setTimeout(verifyDataIntegrity, 100);
      
      // Don't throw the error to prevent UI from breaking
      // Instead, log it and continue
    }
  }, [synchronizeAllStations, verifyDataIntegrity]);
  
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
    editSessionStatus,
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
    
    // Original state
    originalMonitoring,
    originalRain,
    originalReservoirs,
    originalUserSelectedMonitoring,
    originalUserSelectedRain,
    originalUserSelectedReservoirs,
    originalDisabledMonitoring,
    originalDisabledRain,
    originalDisabledReservoirs,
    
    // State management
    isEditMode,
    enterEditMode,
    discardChanges,
    saveChanges,
    
    // Navigation functions
    handleReturnFromStationEdit,
    
    // Synchronization functions
    syncMonitoring,
    syncRain,
    syncReservoirs,
    synchronizeAllStations
  };
} 