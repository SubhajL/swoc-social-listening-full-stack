import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Info } from "lucide-react";
import { MonitoringStationCard } from "@/components/monitoring/MonitoringStationCard";
import { RainStationCard } from "@/components/monitoring/RainStationCard";
import { ReservoirCard } from "@/components/monitoring/ReservoirCard";
import { useMonitoringStations } from "@/hooks/useMonitoringStations";
import { useRainStations } from "@/hooks/useRainStations";
import { useReservoirs } from "@/hooks/useReservoirs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, InfoIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useComplaintStore } from "@/stores/complaintStore";
import { cleanLocationString, formatLocationForDisplay } from "@/lib/location-utils";
import { MonitoringStation } from "@/types/monitoring-station";
import { RainStation } from "@/types/rain-station";
import { Reservoir } from "@/types/reservoir";

// Import the save icon
import SaveIcon from "@/assets/icon/save.svg";

interface WaterLevelInfoProps {
  amphure?: string;
  province?: string;
  showButtons?: boolean;
  returnedFromStationEdit?: boolean;
}

export const WaterLevelInfo = ({ 
  amphure, 
  province, 
  showButtons = false,
  returnedFromStationEdit = false
}: WaterLevelInfoProps) => {
  console.log('[WaterLevelInfo] Component rendered with location:', { amphure, province });
  
  // Clean location strings for display
  const cleanedAmphure = cleanLocationString(amphure);
  const cleanedProvince = cleanLocationString(province);
  
  // Format location for display
  const displayAmphure = amphure ? formatLocationForDisplay(amphure, 'amphure') : undefined;
  const displayProvince = province ? formatLocationForDisplay(province, 'province') : undefined;
  
  const { data: monitoringData, isLoading: isLoadingMonitoring, error: monitoringError } = useMonitoringStations(amphure, province);
  const { data: rainData, isLoading: isLoadingRain, error: rainError } = useRainStations(amphure, province);
  const { data: reservoirData, isLoading: isLoadingReservoir, error: reservoirError } = useReservoirs(amphure, province);
  const cardCreationCount = useRef(0);
  const complaintStore = useComplaintStore();
  const [isStoreReady, setIsStoreReady] = useState(false);
  const hasLoggedStoreData = useRef(false);
  const currentLocationRef = useRef<{amphure?: string; province?: string}>({});
  const hasResetStoreForLocation = useRef(false);
  const hasInitializedStoreWithCurrentData = useRef(false);
  
  // Log when data is loaded or errors occur
  useEffect(() => {
    if (monitoringData) {
      console.log('[WaterLevelInfo] Monitoring stations loaded:', { 
        count: monitoringData.stations?.length || 0,
        location: { amphure: cleanedAmphure, province: cleanedProvince }
      });
    }
    if (monitoringError) {
      console.error('[WaterLevelInfo] Error loading monitoring stations:', monitoringError);
    }
  }, [monitoringData, monitoringError, cleanedAmphure, cleanedProvince]);
  
  useEffect(() => {
    if (rainData) {
      console.log('[WaterLevelInfo] Rain stations loaded:', { 
        count: rainData.stations?.length || 0,
        location: { amphure: cleanedAmphure, province: cleanedProvince }
      });
    }
    if (rainError) {
      console.error('[WaterLevelInfo] Error loading rain stations:', rainError);
    }
  }, [rainData, rainError, cleanedAmphure, cleanedProvince]);
  
  useEffect(() => {
    if (reservoirData) {
      console.log('[WaterLevelInfo] Reservoirs loaded:', { 
        count: reservoirData.reservoirs?.length || 0,
        location: { amphure: cleanedAmphure, province: cleanedProvince }
      });
    }
    if (reservoirError) {
      console.error('[WaterLevelInfo] Error loading reservoirs:', reservoirError);
    }
  }, [reservoirData, reservoirError, cleanedAmphure, cleanedProvince]);
  
  // Track location changes
  useEffect(() => {
    console.log('[WaterLevelInfo] Location changed:', { 
      amphure, 
      province,
      cleanedAmphure,
      cleanedProvince
    });
    
    // Update the current location ref
    currentLocationRef.current = { amphure, province };
    
    // Reset the flag when location changes
    if (currentLocationRef.current.amphure !== amphure || currentLocationRef.current.province !== province) {
      hasResetStoreForLocation.current = false;
    }
  }, [amphure, province, cleanedAmphure, cleanedProvince]);

  // Check if store is ready
  useEffect(() => {
    if (complaintStore && !isStoreReady) {
      console.log("[WaterLevelInfo] Store is available");
      setIsStoreReady(true);
    } else if (!complaintStore) {
      console.warn("[WaterLevelInfo] Store is not yet available");
    }
  }, [complaintStore, isStoreReady]);

  // Log when component mounts and when location changes
  useEffect(() => {
    console.info("[WaterLevelInfo] Component initialized", {
      amphure,
      province,
      returnedFromStationEdit,
      storeReady: isStoreReady,
      timestamp: new Date().toISOString()
    });
    // Reset card creation counter on location change
    cardCreationCount.current = 0;
  }, [amphure, province, returnedFromStationEdit, isStoreReady]);

  // Handle location changes - reset store data if location changes
  useEffect(() => {
    // Skip if we're returning from station edit - we want to preserve the data
    if (returnedFromStationEdit) {
      console.info("[WaterLevelInfo] Skipping store reset because we returned from station edit");
      return;
    }

    // Skip if store is not ready
    if (!isStoreReady || !complaintStore) {
      console.info("[WaterLevelInfo] Store not ready yet, skipping reset");
      return;
    }
    
    // Skip if we've already reset the store for this location
    if (hasResetStoreForLocation.current) {
      console.info("[WaterLevelInfo] Already reset store for this location, skipping");
      return;
    }

    // Check if we have previous location data in the store
    const storeLocationData = complaintStore.getLocationData();
    const previousAmphure = storeLocationData?.amphure;
    const previousProvince = storeLocationData?.province;

    // Skip if no location change
    if (previousAmphure === amphure && previousProvince === province) {
      console.info("[WaterLevelInfo] No location change detected, skipping reset");
      return;
    }

    // Log the location change
    console.info("[WaterLevelInfo] Location change detected", {
      previous: { amphure: previousAmphure, province: previousProvince },
      current: { amphure, province },
      timestamp: new Date().toISOString()
    });

    // If location has changed, reset the store data
    if ((previousAmphure !== amphure || previousProvince !== province) && 
        (amphure || province)) {
      console.info("[WaterLevelInfo] 🔄 Resetting store data due to location change");
      
      // Set the flag to indicate we've reset the store for this location
      hasResetStoreForLocation.current = true;
      
      // Clear existing station data
      complaintStore.setStationData({
        monitoringStations: [],
        rainStations: [],
        reservoirs: [],
        userSelectedMonitoringStations: [],
        userSelectedRainStations: [],
        userSelectedReservoirs: [],
        disabledMonitoringStations: {},
        disabledRainStations: {},
        disabledReservoirs: {}
      });
      
      // Update location data in store by setting new complaint data
      if (amphure || province) {
        // Create minimal complaint data with just location information
        const minimalComplaintData = {
          id: 0,
          issue: "Location update",
          category: "Location update",
          reporter: "System",
          date: new Date().toISOString().split('T')[0],
          amphure: amphure ? [amphure] : [],
          province: province ? [province] : [],
          tumbon: []
        };
        
        complaintStore.setComplaintData(minimalComplaintData);
        console.info("[WaterLevelInfo] Updated complaint data in store with new location");
      }
    }
  }, [amphure, province, isStoreReady, returnedFromStationEdit, complaintStore]);

  // Log when data changes and initialize store if needed
  useEffect(() => {
    if (monitoringData) {
      console.info("[WaterLevelInfo] 📊 Monitoring stations data received", {
        totalStations: monitoringData.stations.length,
        location: {
          amphure: cleanedAmphure,
          province: cleanedProvince,
          queryType: amphure ? 'amphure' : province ? 'province' : 'none'
        },
        timestamp: new Date().toISOString()
      });
    }
    if (rainData) {
      console.info("[WaterLevelInfo] 🌧️ Rain stations data received", {
        totalStations: rainData.stations.length,
        location: {
          amphure: cleanedAmphure,
          province: cleanedProvince,
          queryType: amphure ? 'amphure' : province ? 'province' : 'none'
        },
        timestamp: new Date().toISOString()
      });
    }
    if (reservoirData) {
      console.info("[WaterLevelInfo] 💧 Reservoir data received", {
        totalReservoirs: reservoirData.reservoirs.length,
        location: {
          amphure: cleanedAmphure,
          province: cleanedProvince,
          queryType: amphure ? 'amphure' : province ? 'province' : 'none'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Initialize store with API data if all data is loaded and store is ready
    if (isStoreReady && monitoringData && rainData && reservoirData) {
      // Check sessionStorage for complaintFormState to see if it includes station data
      let includesStationData = false;
      try {
        const savedState = sessionStorage.getItem('complaintFormState');
        if (savedState) {
          const parsedState = JSON.parse(savedState);
          includesStationData = parsedState.includesStationData === true;
        }
      } catch (error) {
        console.error("[WaterLevelInfo] Error checking for includesStationData flag:", error);
      }
      
      // Only initialize if store is empty or if we're not returned from station edit with data
      const storeIsEmpty = !complaintStore.stationData || 
                          !complaintStore.stationData.monitoringStations || 
                          complaintStore.stationData.monitoringStations.length === 0;
      
      // Generate a unique key for the current data set to detect changes
      const dataKey = `${amphure || ''}-${province || ''}-${monitoringData.stations.length}-${rainData.stations.length}-${reservoirData.reservoirs.length}`;
      
      // Check if we need to initialize the store
      const shouldInitialize = (!returnedFromStationEdit || !includesStationData) && 
                              storeIsEmpty && 
                              !hasInitializedStoreWithCurrentData.current;
                          
      if (shouldInitialize) {
        console.info("[WaterLevelInfo] 🔄 Initializing store with API data", {
          monitoringStations: monitoringData.stations.length,
          rainStations: rainData.stations.length,
          reservoirs: reservoirData.reservoirs.length,
          dataKey,
          timestamp: new Date().toISOString()
        });
        
        // Mark that we've initialized the store with this data
        hasInitializedStoreWithCurrentData.current = true;
        
        // Use unknown as intermediate type to avoid type errors
        complaintStore.setStationData({
          monitoringStations: monitoringData.stations as unknown as MonitoringStation[],
          rainStations: rainData.stations as unknown as RainStation[],
          reservoirs: reservoirData.reservoirs as unknown as Reservoir[],
          userSelectedMonitoringStations: [],
          userSelectedRainStations: [],
          userSelectedReservoirs: [],
          disabledMonitoringStations: {},
          disabledRainStations: {},
          disabledReservoirs: {}
        });
      } else if (!shouldInitialize) {
        console.info("[WaterLevelInfo] Skipping store initialization", {
          reason: returnedFromStationEdit && includesStationData ? "returned from station edit with data" : 
                 returnedFromStationEdit ? "returned from station edit" : 
                 !storeIsEmpty ? "store is not empty" : 
                 hasInitializedStoreWithCurrentData.current ? "already initialized with current data" : "unknown",
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Reset card creation counter when new data arrives
    cardCreationCount.current = 0;
  }, [monitoringData, rainData, reservoirData, cleanedAmphure, cleanedProvince, isStoreReady, returnedFromStationEdit, complaintStore, amphure, province]);
  
  // Reset the initialization flag when location or data changes
  useEffect(() => {
    if (amphure !== currentLocationRef.current.amphure || province !== currentLocationRef.current.province) {
      hasInitializedStoreWithCurrentData.current = false;
      console.info("[WaterLevelInfo] Reset initialization flag due to location change");
    }
  }, [amphure, province]);
  
  // Log store data when available
  useEffect(() => {
    if (isStoreReady && complaintStore.stationData && !hasLoggedStoreData.current) {
      // Count disabled stations
      const disabledMonitoringCount = Object.keys(complaintStore.stationData.disabledMonitoringStations || {}).length;
      const disabledRainCount = Object.keys(complaintStore.stationData.disabledRainStations || {}).length;
      const disabledReservoirCount = Object.keys(complaintStore.stationData.disabledReservoirs || {}).length;
      
      console.info("[WaterLevelInfo] 🗄️ Store data available", {
        monitoringStations: complaintStore.stationData.monitoringStations?.length || 0,
        rainStations: complaintStore.stationData.rainStations?.length || 0,
        reservoirs: complaintStore.stationData.reservoirs?.length || 0,
        userSelectedMonitoring: complaintStore.stationData.userSelectedMonitoringStations?.length || 0,
        userSelectedRain: complaintStore.stationData.userSelectedRainStations?.length || 0,
        userSelectedReservoirs: complaintStore.stationData.userSelectedReservoirs?.length || 0,
        disabledMonitoring: disabledMonitoringCount,
        disabledRain: disabledRainCount,
        disabledReservoir: disabledReservoirCount,
        totalMonitoring: (complaintStore.stationData.monitoringStations?.length || 0) + 
                         (complaintStore.stationData.userSelectedMonitoringStations?.length || 0),
        totalRain: (complaintStore.stationData.rainStations?.length || 0) + 
                   (complaintStore.stationData.userSelectedRainStations?.length || 0),
        totalReservoir: (complaintStore.stationData.reservoirs?.length || 0) + 
                        (complaintStore.stationData.userSelectedReservoirs?.length || 0),
        timestamp: new Date().toISOString()
      });
      
      // Log disabled station IDs for debugging
      console.debug("[WaterLevelInfo] 🚫 Disabled stations", {
        disabledMonitoringStations: complaintStore.stationData.disabledMonitoringStations,
        disabledRainStations: complaintStore.stationData.disabledRainStations,
        disabledReservoirs: complaintStore.stationData.disabledReservoirs
      });
      
      hasLoggedStoreData.current = true;
    }
  }, [isStoreReady, complaintStore.stationData]);
  
  // Reset the logging flag when stationData changes
  useEffect(() => {
    hasLoggedStoreData.current = false;
  }, [complaintStore.stationData]);

  // Function to log card creation
  const logCardCreation = (item: any, index: number, total: number, type: 'monitoring' | 'rain' | 'reservoir') => {
    cardCreationCount.current++;
    
    // Handle different property names based on station type
    let name = '';
    let location = '';
    
    if (type === 'monitoring') {
      name = item.station_name || 'Unknown';
      location = `${item.amphure || ''}, ${item.province || ''}`;
    } else if (type === 'rain') {
      name = item.name || item.station_name || 'Unknown';
      location = `${item.amphure || ''}, ${item.province || ''}`;
    } else if (type === 'reservoir') {
      name = item.name || item.reservoir_name || 'Unknown';
      location = `${item.amphure || ''}, ${item.province || ''}`;
    }
    
    console.info(`[WaterLevelInfo] 🔄 Creating ${type} ${type === 'reservoir' ? 'card' : 'station card'} ${index + 1}/${total}`, {
      id: item.id,
      name,
      location,
      cardNumber: cardCreationCount.current,
      totalExpected: total,
      timestamp: new Date().toISOString()
    });
  };

  // Log final card creation count when component updates or unmounts
  useEffect(() => {
    const logFinalCardCount = () => {
      if (cardCreationCount.current > 0) {
        // Get store data counts if available
        let storeMonitoringCount = 0;
        let storeRainCount = 0;
        let storeReservoirCount = 0;
        let disabledMonitoringCount = 0;
        let disabledRainCount = 0;
        let disabledReservoirCount = 0;
        
        if (isStoreReady && complaintStore.stationData) {
          storeMonitoringCount = (complaintStore.stationData.monitoringStations?.length || 0) + 
                                (complaintStore.stationData.userSelectedMonitoringStations?.length || 0);
          storeRainCount = (complaintStore.stationData.rainStations?.length || 0) + 
                          (complaintStore.stationData.userSelectedRainStations?.length || 0);
          storeReservoirCount = (complaintStore.stationData.reservoirs?.length || 0) + 
                               (complaintStore.stationData.userSelectedReservoirs?.length || 0);
          disabledMonitoringCount = Object.keys(complaintStore.stationData.disabledMonitoringStations || {}).length;
          disabledRainCount = Object.keys(complaintStore.stationData.disabledRainStations || {}).length;
          disabledReservoirCount = Object.keys(complaintStore.stationData.disabledReservoirs || {}).length;
        }
        
        console.info("[WaterLevelInfo] 📋 Final card creation count", {
          createdCards: cardCreationCount.current,
          expectedTotalMonitoring: monitoringData?.stations?.length || 0,
          expectedTotalRain: rainData?.stations?.length || 0,
          expectedTotalReservoir: reservoirData?.reservoirs?.length || 0,
          storeMonitoringCount,
          storeRainCount,
          storeReservoirCount,
          disabledMonitoringCount,
          disabledRainCount,
          disabledReservoirCount,
          usingStoreData: isStoreReady && !!complaintStore.stationData,
          location: {
            amphure: cleanedAmphure,
            province: cleanedProvince
          },
          timestamp: new Date().toISOString()
        });
      }
    };
    
    // Return cleanup function that will run on unmount
    return logFinalCardCount;
  }, [
    monitoringData?.stations?.length, 
    rainData?.stations?.length, 
    reservoirData?.reservoirs?.length, 
    cleanedAmphure, 
    cleanedProvince, 
    isStoreReady, 
    complaintStore.stationData
  ]);

  // Common content box styles
  const contentBoxStyle = "w-full border border-[#E2E8F0] rounded-xl p-4 bg-white text-[#17254D] text-sm font-normal";
  const contentTextStyle = "px-4"; // Reduced horizontal padding for more compact layout
  const labelStyle = "text-[#64748B] font-medium text-base bg-white px-2 z-10";
  const labelContainerStyle = "flex justify-between items-center absolute -top-4 left-3 z-10";

  // Handle add data button click
  const handleAddData = (type: string) => {
    toast.success(`เพิ่มข้อมูล${type}`, {
      description: `กำลังเพิ่มข้อมูล${type}...`,
      duration: 3000,
    });
  };

  // Handle delete data button click
  const handleDeleteData = (type: string) => {
    toast.success(`ลบข้อมูล${type}`, {
      description: `กำลังลบข้อมูล${type}...`,
      duration: 3000,
    });
  };

  // Handle save button click
  const handleSave = () => {
    toast.success("บันทึกข้อมูล", {
      description: "กำลังบันทึกข้อมูล...",
      duration: 3000,
    });
  };

  // Early return if no location data
  if (!amphure && !province) {
    console.info("[WaterLevelInfo] ⚠️ No location data provided", {
      timestamp: new Date().toISOString()
    });
    return (
      <div className="space-y-8 px-4">
        <h2 className="text-xl font-semibold text-[#17254D] mb-6">ข้อมูลสนับสนุน</h2>
        <div className="flex flex-col relative mt-10 mx-auto max-w-full w-full">
          <Alert className="bg-gray-50">
            <InfoIcon className="h-5 w-5 text-blue-500" />
            <AlertDescription className="text-gray-600">
              กรุณาระบุพื้นที่ (อำเภอหรือจังหวัด) เพื่อค้นหาข้อมูลสถานี
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary component="WaterLevelInfo">
      <div className="space-y-10 px-4">
        {/* Main Heading */}
        <h2 className="text-xl font-semibold text-[#17254D] mb-6">ข้อมูลสนับสนุน</h2>
        
        {/* Monitoring Stations Section */}
        <div className="flex flex-col relative mt-10 mx-auto max-w-full w-full">
          <div className={labelContainerStyle}>
            <Label className={labelStyle}>
              สถานีเฝ้าระวัง {displayAmphure && `ใน${displayAmphure}`}{displayProvince && `ใน${displayProvince}`}
            </Label>
            {showButtons && (
              <Button 
                className="bg-[#42A5F5] text-white hover:bg-[#1E88E5] h-10 px-4 text-base flex items-center"
                onClick={() => handleAddData('สถานีเฝ้าระวัง')}
              >
                <Plus className="h-5 w-5 mr-2" /> เพิ่มข้อมูล
              </Button>
            )}
          </div>
          
          {isLoadingMonitoring && !isStoreReady && (
            <div className={contentBoxStyle}>
              <div className={contentTextStyle}>
                <div className="space-y-4">
                  <Skeleton className="h-[100px] w-full" />
                  <Skeleton className="h-[100px] w-full" />
                </div>
              </div>
            </div>
          )}

          {monitoringError && !isLoadingMonitoring && !isStoreReady && (
            <div className={contentBoxStyle}>
              <div className={contentTextStyle}>
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    ไม่สามารถโหลดข้อมูลสถานีเฝ้าระวังได้
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          )}

          {/* Check for store data first */}
          {isStoreReady && complaintStore.stationData && (() => {
            // Extract station data to a local variable with non-null assertion
            const stationData = complaintStore.stationData!;
            
            return (
              <>
                {/* Display user-selected monitoring stations from store */}
                {stationData.userSelectedMonitoringStations && 
                 stationData.userSelectedMonitoringStations.length > 0 && (
                  <div className={contentBoxStyle}>
                    <div className={contentTextStyle}>
                      <div className="space-y-8">
                        {stationData.userSelectedMonitoringStations.map((station, index) => (
                          <MonitoringStationCard 
                            key={`selected-${station.id}`} 
                            station={station} 
                            showButtons={showButtons}
                            isUserSelected={true}
                            onDeleteData={showButtons ? () => handleDeleteData(`สถานีเฝ้าระวัง ${station.station_name}`) : undefined}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Display monitoring stations from store */}
                {stationData.monitoringStations && 
                 stationData.monitoringStations.length > 0 && (
                  <div className={contentBoxStyle}>
                    <div className={contentTextStyle}>
                      <div className="space-y-8">
                        {stationData.monitoringStations.map((station, index) => {
                          // Check if station is disabled
                          const stationId = station.id.toString();
                          const isDisabled = stationData.disabledMonitoringStations?.[stationId];
                          
                          // Enhanced logging for debugging
                          console.debug(`[WaterLevelInfo] Rendering monitoring station ${index + 1}/${stationData.monitoringStations.length}`, {
                            id: station.id,
                            stationId: station.station_id,
                            name: station.station_name,
                            isDisabled,
                            showButtons,
                            timestamp: new Date().toISOString()
                          });
                          
                          logCardCreation(station, index, stationData.monitoringStations.length, 'monitoring');
                          return (
                            <MonitoringStationCard 
                              key={station.id} 
                              station={station} 
                              showButtons={showButtons}
                              disabled={isDisabled}
                              onDeleteData={showButtons ? () => handleDeleteData(`สถานีเฝ้าระวัง ${station.station_name}`) : undefined}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Show empty state if no monitoring stations in store */}
                {(!stationData.monitoringStations || 
                  stationData.monitoringStations.length === 0) && 
                 (!stationData.userSelectedMonitoringStations || 
                  stationData.userSelectedMonitoringStations.length === 0) && (
                  <div className={contentBoxStyle}>
                    <div className={contentTextStyle}>
                      <Alert className="bg-gray-50">
                        <InfoIcon className="h-4 w-4 text-blue-500" />
                        <AlertDescription className="text-gray-600">
                          ไม่พบสถานีเฝ้าระวังใน{displayAmphure || displayProvince || 'พื้นที่นี้'}
                        </AlertDescription>
                      </Alert>
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          {/* Fall back to API data if no store data */}
          {(!isStoreReady || !complaintStore.stationData) && !isLoadingMonitoring && !monitoringError && 
           monitoringData?.stations && monitoringData.stations.length > 0 && (
            <div className={contentBoxStyle}>
              <div className={contentTextStyle}>
                <div className="space-y-8">
                  {monitoringData.stations.map((station, index) => {
                    logCardCreation(station, index, monitoringData.stations.length, 'monitoring');
                    return (
                      <MonitoringStationCard 
                        key={station.id} 
                        station={station} 
                        showButtons={showButtons}
                        onDeleteData={showButtons ? () => handleDeleteData(`สถานีเฝ้าระวัง ${station.station_name}`) : undefined}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rain Stations Section */}
        <div className="flex flex-col relative mt-10 mx-auto max-w-full w-full">
          <div className={labelContainerStyle}>
            <Label className={labelStyle}>
              สถานีน้ำฝน {displayAmphure && `ใน${displayAmphure}`}{!displayAmphure && displayProvince && `ใน${displayProvince}`}
            </Label>
            {showButtons && (
              <Button 
                className="bg-[#42A5F5] text-white hover:bg-[#1E88E5] h-10 px-4 text-base flex items-center"
                onClick={() => handleAddData('สถานีน้ำฝน')}
              >
                <Plus className="h-5 w-5 mr-2" /> เพิ่มข้อมูล
              </Button>
            )}
          </div>
          
          {isLoadingRain && !isStoreReady && (
            <div className={contentBoxStyle}>
              <div className={contentTextStyle}>
                <div className="space-y-4">
                  <Skeleton className="h-[100px] w-full" />
                  <Skeleton className="h-[100px] w-full" />
                </div>
              </div>
            </div>
          )}

          {rainError && !isLoadingRain && !isStoreReady && (
            <div className={contentBoxStyle}>
              <div className={contentTextStyle}>
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    ไม่สามารถโหลดข้อมูลสถานีน้ำฝนได้
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          )}

          {/* Check for store data first */}
          {isStoreReady && complaintStore.stationData && (() => {
            // Extract station data to a local variable with non-null assertion
            const stationData = complaintStore.stationData!;
            
            return (
              <>
                {/* Display user-selected rain stations from store */}
                {stationData.userSelectedRainStations && 
                 stationData.userSelectedRainStations.length > 0 && (
                  <div className={contentBoxStyle}>
                    <div className={contentTextStyle}>
                      <div className="space-y-8">
                        {stationData.userSelectedRainStations.map((station, index) => (
                          <RainStationCard 
                            key={`selected-${station.id}`} 
                            station={station} 
                            showButtons={showButtons}
                            isUserSelected={true}
                            onDeleteData={showButtons ? () => handleDeleteData(`สถานีน้ำฝน ${station.station_name}`) : undefined}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Display rain stations from store */}
                {stationData.rainStations && 
                 stationData.rainStations.length > 0 && (
                  <div className={contentBoxStyle}>
                    <div className={contentTextStyle}>
                      <div className="space-y-8">
                        {stationData.rainStations.map((station, index) => {
                          // Check if station is disabled
                          const stationId = station.id.toString();
                          const isDisabled = stationData.disabledRainStations?.[stationId];
                          
                          // Enhanced logging for debugging
                          console.debug(`[WaterLevelInfo] Rendering rain station ${index + 1}/${stationData.rainStations.length}`, {
                            id: station.id,
                            stationId: station.station_id,
                            name: (station as any).name || station.station_name,
                            isDisabled,
                            showButtons,
                            timestamp: new Date().toISOString()
                          });
                          
                          logCardCreation(station, index, stationData.rainStations.length, 'rain');
                          
                          // Create a compatible station object with required properties
                          const compatibleStation = {
                            ...station,
                            station_name: (station as any).name || station.station_name || `Station ${station.id}`
                          };
                          
                          return (
                            <RainStationCard 
                              key={station.id} 
                              station={compatibleStation as unknown as RainStation} 
                              showButtons={showButtons}
                              disabled={isDisabled}
                              onDeleteData={showButtons ? () => handleDeleteData(`สถานีน้ำฝน ${compatibleStation.station_name}`) : undefined}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Show empty state if no rain stations in store */}
                {(!stationData.rainStations || 
                  stationData.rainStations.length === 0) && 
                 (!stationData.userSelectedRainStations || 
                  stationData.userSelectedRainStations.length === 0) && (
                  <div className={contentBoxStyle}>
                    <div className={contentTextStyle}>
                      <Alert className="bg-gray-50">
                        <InfoIcon className="h-4 w-4 text-blue-500" />
                        <AlertDescription className="text-gray-600">
                          ไม่พบสถานีน้ำฝนใน{displayAmphure || displayProvince || 'พื้นที่นี้'}
                        </AlertDescription>
                      </Alert>
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          {/* Fall back to API data if no store data */}
          {(!isStoreReady || !complaintStore.stationData) && !isLoadingRain && !rainError && 
           (!rainData?.stations || rainData.stations.length === 0) && (
            <div className={contentBoxStyle}>
              <div className={contentTextStyle}>
                <Alert className="bg-gray-50">
                  <InfoIcon className="h-4 w-4 text-blue-500" />
                  <AlertDescription className="text-gray-600">
                    ไม่พบสถานีน้ำฝนใน{displayAmphure || displayProvince || 'พื้นที่นี้'}
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          )}

          {(!isStoreReady || !complaintStore.stationData) && !isLoadingRain && !rainError && 
           rainData?.stations && rainData.stations.length > 0 && (
            <div className={contentBoxStyle}>
              <div className={contentTextStyle}>
                <div className="space-y-8">
                  {rainData.stations.map((station, index) => {
                    logCardCreation(station, index, rainData.stations.length, 'rain');
                    
                    // Create a compatible station object with required properties
                    const compatibleStation = {
                      ...station,
                      station_name: (station as any).name || `Station ${station.id}`
                    };
                    
                    return (
                      <RainStationCard 
                        key={station.id} 
                        station={compatibleStation as unknown as RainStation} 
                        showButtons={showButtons}
                        onDeleteData={showButtons ? () => handleDeleteData(`สถานีน้ำฝน ${compatibleStation.station_name}`) : undefined}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Reservoirs Section */}
        <div className="flex flex-col relative mt-10 mx-auto max-w-full w-full">
          <div className={labelContainerStyle}>
            <Label className={labelStyle}>
              เขื่อน/อ่างเก็บน้ำ {displayAmphure && `ใน${displayAmphure}`}{displayProvince && `ใน${displayProvince}`}
            </Label>
            {showButtons && (
              <Button 
                className="bg-[#42A5F5] text-white hover:bg-[#1E88E5] h-10 px-4 text-base flex items-center"
                onClick={() => handleAddData('เขื่อน/อ่างเก็บน้ำ')}
              >
                <Plus className="h-5 w-5 mr-2" /> เพิ่มข้อมูล
              </Button>
            )}
          </div>
          
          {isLoadingReservoir && !isStoreReady && (
            <div className={contentBoxStyle}>
              <div className={contentTextStyle}>
                <div className="space-y-4">
                  <Skeleton className="h-[100px] w-full" />
                  <Skeleton className="h-[100px] w-full" />
                </div>
              </div>
            </div>
          )}

          {reservoirError && !isLoadingReservoir && !isStoreReady && (
            <div className={contentBoxStyle}>
              <div className={contentTextStyle}>
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    ไม่สามารถโหลดข้อมูลเขื่อน/อ่างเก็บน้ำได้
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          )}

          {/* Check for store data first */}
          {isStoreReady && complaintStore.stationData && (() => {
            // Extract station data to a local variable with non-null assertion
            const stationData = complaintStore.stationData!;
            
            return (
              <>
                {/* Display user-selected reservoirs from store */}
                {stationData.userSelectedReservoirs && 
                 stationData.userSelectedReservoirs.length > 0 && (
                  <div className={contentBoxStyle}>
                    <div className={contentTextStyle}>
                      <div className="space-y-8">
                        {stationData.userSelectedReservoirs.map((reservoir, index) => (
                          <ReservoirCard 
                            key={`selected-${reservoir.id}`} 
                            reservoir={reservoir} 
                            showButtons={showButtons}
                            isUserSelected={true}
                            onDeleteData={showButtons ? () => handleDeleteData(`เขื่อน/อ่างเก็บน้ำ ${reservoir.reservoir_name}`) : undefined}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Display reservoirs from store */}
                {stationData.reservoirs && 
                 stationData.reservoirs.length > 0 && (
                  <div className={contentBoxStyle}>
                    <div className={contentTextStyle}>
                      <div className="space-y-8">
                        {stationData.reservoirs.map((reservoir, index) => {
                          // Check if reservoir is disabled
                          const reservoirId = reservoir.id.toString();
                          const isDisabled = stationData.disabledReservoirs?.[reservoirId];
                          
                          // Enhanced logging for debugging
                          console.debug(`[WaterLevelInfo] Rendering reservoir ${index + 1}/${stationData.reservoirs.length}`, {
                            id: reservoir.id,
                            name: (reservoir as any).name || reservoir.reservoir_name,
                            isDisabled,
                            showButtons,
                            timestamp: new Date().toISOString()
                          });
                          
                          logCardCreation(reservoir, index, stationData.reservoirs.length, 'reservoir');
                          
                          // Create a compatible reservoir object with required properties
                          const compatibleReservoir = {
                            ...reservoir,
                            reservoir_name: (reservoir as any).name || reservoir.reservoir_name || `Reservoir ${reservoir.id}`
                          };
                          
                          return (
                            <ReservoirCard 
                              key={reservoir.id} 
                              reservoir={compatibleReservoir as unknown as Reservoir} 
                              showButtons={showButtons}
                              disabled={isDisabled}
                              onDeleteData={showButtons ? () => handleDeleteData(`เขื่อน/อ่างเก็บน้ำ ${compatibleReservoir.reservoir_name}`) : undefined}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Show empty state if no reservoirs in store */}
                {(!stationData.reservoirs || 
                  stationData.reservoirs.length === 0) && 
                 (!stationData.userSelectedReservoirs || 
                  stationData.userSelectedReservoirs.length === 0) && (
                  <div className={contentBoxStyle}>
                    <div className={contentTextStyle}>
                      <Alert className="bg-gray-50">
                        <InfoIcon className="h-4 w-4 text-blue-500" />
                        <AlertDescription className="text-gray-600">
                          ไม่พบเขื่อน/อ่างเก็บน้ำใน{displayAmphure || displayProvince || 'พื้นที่นี้'}
                        </AlertDescription>
                      </Alert>
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          {/* Fall back to API data if no store data */}
          {(!isStoreReady || !complaintStore.stationData) && !isLoadingReservoir && !reservoirError && 
           (!reservoirData?.reservoirs || reservoirData.reservoirs.length === 0) && (
            <div className={contentBoxStyle}>
              <div className={contentTextStyle}>
                <Alert className="bg-gray-50">
                  <InfoIcon className="h-4 w-4 text-blue-500" />
                  <AlertDescription className="text-gray-600">
                    ไม่พบเขื่อน/อ่างเก็บน้ำใน{displayAmphure || displayProvince || 'พื้นที่นี้'}
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          )}

          {(!isStoreReady || !complaintStore.stationData) && !isLoadingReservoir && !reservoirError && 
           reservoirData?.reservoirs && reservoirData.reservoirs.length > 0 && (
            <div className={contentBoxStyle}>
              <div className={contentTextStyle}>
                <div className="space-y-8">
                  {reservoirData.reservoirs.map((reservoir, index) => {
                    logCardCreation(reservoir, index, reservoirData.reservoirs.length, 'reservoir');
                    
                    // Create a compatible reservoir object with required properties
                    const compatibleReservoir = {
                      ...reservoir,
                      reservoir_name: (reservoir as any).name || `Reservoir ${reservoir.id}`
                    };
                    
                    return (
                      <ReservoirCard 
                        key={reservoir.id} 
                        reservoir={compatibleReservoir as unknown as Reservoir} 
                        showButtons={showButtons}
                        onDeleteData={showButtons ? () => handleDeleteData(`เขื่อน/อ่างเก็บน้ำ ${compatibleReservoir.reservoir_name}`) : undefined}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Save Button */}
        {showButtons && (
          <div className="flex justify-center mt-6">
            <Button 
              onClick={handleSave}
              className="bg-[#42A5F5] text-white hover:bg-[#1E88E5] h-12 px-8 text-base font-medium rounded-md flex items-center"
            >
              <img src={SaveIcon} alt="Save" className="h-5 w-5 mr-2" />
              บันทึก
            </Button>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};