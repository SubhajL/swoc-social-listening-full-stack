import { useEffect, useState } from 'react';
import { useComplaintStore } from './complaintStore';

// Declare the window property for TypeScript
declare global {
  interface Window {
    _stationDataUpdateIntentional?: boolean;
    _hydrationStatus?: {
      isHydrated: boolean;
      attempts: number;
      lastAttempt: string;
    };
  }
}

/**
 * Custom hook to manually hydrate the Zustand store
 * This should be used in the top-level component to ensure
 * the store is hydrated after React is fully initialized
 * @returns {boolean} - Whether the store has been hydrated
 */
export const useHydrateStore = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [hydrationAttempts, setHydrationAttempts] = useState(0);
  const MAX_ATTEMPTS = 3;

  useEffect(() => {
    console.log("🔍 [DEBUG-StoreHydration] useEffect running, isHydrated:", isHydrated, "attempts:", hydrationAttempts);
    
    // Store hydration status in window for debugging
    window._hydrationStatus = {
      isHydrated,
      attempts: hydrationAttempts,
      lastAttempt: new Date().toISOString()
    };
    
    // Get the persist object from the store
    const persistStore = useComplaintStore.persist;
    console.log("🔍 [DEBUG-StoreHydration] persistStore exists:", !!persistStore);
    
    const hydrateStore = async () => {
      try {
        console.log("🔍 [DEBUG-StoreHydration] Starting hydration process, attempt:", hydrationAttempts + 1);
        console.log("🔍 [DEBUG-StoreHydration] Current timestamp:", new Date().toISOString());
        
        // Check if there's data in localStorage
        const savedData = localStorage.getItem('complaint-storage');
        console.log("🔍 [DEBUG-StoreHydration] localStorage data exists:", !!savedData);
        
        if (savedData) {
          try {
            // Parse the saved data to verify it's valid
            const parsedData = JSON.parse(savedData);
            console.log('[StoreHydration] Found data in localStorage:', {
              hasComplaintData: !!parsedData?.state?.complaintData,
              hasStationData: !!parsedData?.state?.stationData,
              userSelectedMonitoring: parsedData?.state?.stationData?.userSelectedMonitoringStations?.length || 0,
              userSelectedRain: parsedData?.state?.stationData?.userSelectedRainStations?.length || 0,
              userSelectedReservoirs: parsedData?.state?.stationData?.userSelectedReservoirs?.length || 0,
            });
            
            console.log("🔍 [DEBUG-StoreHydration] localStorage data structure:", {
              hasState: !!parsedData?.state,
              stateKeys: parsedData?.state ? Object.keys(parsedData.state) : [],
              version: parsedData?.version,
              timestamp: parsedData?.timestamp,
            });
            
            if (parsedData?.state?.stationData) {
              console.log("🔍 [DEBUG-StoreHydration] Station data details from localStorage:", {
                userSelectedMonitoringIds: parsedData.state.stationData.userSelectedMonitoringStations?.map((s: any) => s.id) || [],
                userSelectedRainIds: parsedData.state.stationData.userSelectedRainStations?.map((s: any) => s.id) || [],
                userSelectedReservoirIds: parsedData.state.stationData.userSelectedReservoirs?.map((s: any) => s.id) || [],
              });
            }
          } catch (error) {
            console.error('[StoreHydration] Error parsing localStorage data:', error);
            console.log("🔍 [DEBUG-StoreHydration] Error parsing localStorage:", error);
          }
        } else {
          console.log('[StoreHydration] No data found in localStorage');
        }
        
        // Create a promise that resolves when hydration is complete
        const hydrationPromise = new Promise<void>((resolve) => {
          console.log("🔍 [DEBUG-StoreHydration] Creating hydration promise");
          
          // Check if the persist object has the rehydrate method
          if (!persistStore || typeof persistStore.rehydrate !== 'function') {
            console.error("🔍 [DEBUG-StoreHydration] No rehydrate method found on persist object");
            setIsHydrated(true); // Mark as hydrated to prevent blocking the app
            resolve();
            return;
          }
          
          // Manually hydrate the store
          console.log("🔍 [DEBUG-StoreHydration] Calling persistStore.rehydrate()");
          persistStore.rehydrate();
          
          // Log for debugging
          console.log('[StoreHydration] Manual hydration triggered (attempt ' + (hydrationAttempts + 1) + ')');
          
          // Verify the store was hydrated with a timeout
          setTimeout(() => {
            console.log("🔍 [DEBUG-StoreHydration] Verification timeout fired");
            
            const storeState = useComplaintStore.getState();
            console.log('[StoreHydration] Store state after hydration:', {
              hasComplaintData: !!storeState.complaintData,
              hasStationData: !!storeState.stationData,
              userSelectedMonitoring: storeState.stationData?.userSelectedMonitoringStations?.length || 0,
              userSelectedRain: storeState.stationData?.userSelectedRainStations?.length || 0,
              userSelectedReservoirs: storeState.stationData?.userSelectedReservoirs?.length || 0,
            });
            
            console.log("🔍 [DEBUG-StoreHydration] Store state details:", {
              complaintDataKeys: storeState.complaintData ? Object.keys(storeState.complaintData) : [],
              stationDataKeys: storeState.stationData ? Object.keys(storeState.stationData) : [],
            });
            
            if (storeState.stationData) {
              console.log("🔍 [DEBUG-StoreHydration] Station data details from store:", {
                userSelectedMonitoringIds: storeState.stationData.userSelectedMonitoringStations?.map((s: any) => s.id) || [],
                userSelectedRainIds: storeState.stationData.userSelectedRainStations?.map((s: any) => s.id) || [],
                userSelectedReservoirIds: storeState.stationData.userSelectedReservoirs?.map((s: any) => s.id) || [],
              });
            }
            
            // Check if we have data in localStorage but not in the store
            const savedData = localStorage.getItem('complaint-storage');
            if (savedData) {
              try {
                const parsedData = JSON.parse(savedData);
                const localStorageHasData = !!parsedData?.state?.stationData?.userSelectedMonitoringStations?.length || 
                                           !!parsedData?.state?.stationData?.userSelectedRainStations?.length || 
                                           !!parsedData?.state?.stationData?.userSelectedReservoirs?.length;
                
                const storeHasData = !!storeState.stationData?.userSelectedMonitoringStations?.length || 
                                    !!storeState.stationData?.userSelectedRainStations?.length || 
                                    !!storeState.stationData?.userSelectedReservoirs?.length;
                
                console.log("🔍 [DEBUG-StoreHydration] Data comparison:", {
                  localStorageHasData,
                  storeHasData,
                  needsRetry: localStorageHasData && !storeHasData && hydrationAttempts < MAX_ATTEMPTS
                });
                
                if (localStorageHasData && !storeHasData && hydrationAttempts < MAX_ATTEMPTS) {
                  console.warn('[StoreHydration] Data exists in localStorage but not in store, retrying hydration');
                  console.log("🔍 [DEBUG-StoreHydration] Incrementing hydration attempts and retrying");
                  setHydrationAttempts(prev => prev + 1);
                  resolve(); // Resolve but we'll try again
                  return;
                }
                
                // If localStorage and store data don't match, try to manually update the store
                if (localStorageHasData && !storeHasData && hydrationAttempts >= MAX_ATTEMPTS) {
                  console.warn("🔍 [DEBUG-StoreHydration] Max attempts reached but data still missing, manually updating store");
                  try {
                    // Manually set the station data in the store
                    useComplaintStore.setState({
                      stationData: parsedData.state.stationData
                    });
                    console.log("🔍 [DEBUG-StoreHydration] Manually updated store with localStorage data");
                    
                    // Verify the update
                    setTimeout(() => {
                      const updatedState = useComplaintStore.getState();
                      console.log("🔍 [DEBUG-StoreHydration] Store state after manual update:", {
                        userSelectedMonitoring: updatedState.stationData?.userSelectedMonitoringStations?.length || 0,
                        userSelectedRain: updatedState.stationData?.userSelectedRainStations?.length || 0,
                        userSelectedReservoirs: updatedState.stationData?.userSelectedReservoirs?.length || 0,
                      });
                    }, 100);
                  } catch (error) {
                    console.error("🔍 [DEBUG-StoreHydration] Error manually updating store:", error);
                  }
                }
              } catch (error) {
                console.error('[StoreHydration] Error checking localStorage data:', error);
                console.log("🔍 [DEBUG-StoreHydration] Error comparing localStorage and store data:", error);
              }
            }
            
            // If we reach here, hydration is complete or we've reached max attempts
            console.log("🔍 [DEBUG-StoreHydration] Setting isHydrated to true");
            setIsHydrated(true);
            
            // Update window hydration status
            window._hydrationStatus = {
              isHydrated: true,
              attempts: hydrationAttempts + 1,
              lastAttempt: new Date().toISOString()
            };
            
            resolve();
          }, 300); // Increased timeout for more reliable hydration
        });
        
        console.log("🔍 [DEBUG-StoreHydration] Awaiting hydration promise");
        await hydrationPromise;
        console.log("🔍 [DEBUG-StoreHydration] Hydration promise resolved");
      } catch (error) {
        console.error('[StoreHydration] Error during hydration:', error);
        console.log("🔍 [DEBUG-StoreHydration] Error during hydration process:", error);
        
        // If we encounter an error but haven't reached max attempts, try again
        if (hydrationAttempts < MAX_ATTEMPTS) {
          console.warn('[StoreHydration] Retrying hydration after error');
          console.log("🔍 [DEBUG-StoreHydration] Incrementing hydration attempts after error");
          setHydrationAttempts(prev => prev + 1);
        } else {
          // If we've reached max attempts, mark as hydrated anyway to prevent blocking the app
          console.error('[StoreHydration] Max hydration attempts reached, proceeding anyway');
          console.log("🔍 [DEBUG-StoreHydration] Setting isHydrated to true after max attempts");
          setIsHydrated(true);
          
          // Update window hydration status
          window._hydrationStatus = {
            isHydrated: true,
            attempts: MAX_ATTEMPTS,
            lastAttempt: new Date().toISOString()
          };
        }
      }
    };
    
    // Only attempt hydration if not already hydrated
    if (!isHydrated) {
      console.log("🔍 [DEBUG-StoreHydration] Calling hydrateStore()");
      hydrateStore();
    } else {
      console.log("🔍 [DEBUG-StoreHydration] Store already hydrated, skipping");
    }
  }, [isHydrated, hydrationAttempts]);

  return isHydrated;
}; 