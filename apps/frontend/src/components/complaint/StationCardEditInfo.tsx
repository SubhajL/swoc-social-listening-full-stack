import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Plus, Save } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { MonitoringStationCard } from "@/components/monitoring/MonitoringStationCard";
import { RainStationCard } from "@/components/monitoring/RainStationCard";
import { ReservoirCard } from "@/components/monitoring/ReservoirCard";
import { useMonitoringStations } from "@/hooks/useMonitoringStations";
import { useRainStations } from "@/hooks/useRainStations";
import { useReservoirs } from "@/hooks/useReservoirs";
import { StationSelectionDialog } from "@/components/complaint/StationSelectionDialog";
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";
import { StationType } from "@/components/complaint/StationSelectionDialog";
import { useComplaintStore } from "@/stores/complaintStore";
import { MonitoringStation } from "@/types/monitoring-station";
import { RainStation } from "@/types/rain-station";
import { Reservoir } from "@/types/reservoir";

interface StationCardEditInfoProps {
  amphure?: string;
  province?: string;
  onChangesMade?: () => void;
  onSave?: () => void;
  onDiscard?: () => void;
}

export const StationCardEditInfo = ({ 
  amphure, 
  province,
  onChangesMade,
  onSave,
  onDiscard
}: StationCardEditInfoProps) => {
  const navigate = useNavigate();
  
  // Track store initialization
  const [isStoreReady, setIsStoreReady] = useState(false);
  
  // Get complaint store state and actions
  const complaintStore = useComplaintStore();
  const stationData = complaintStore.stationData;
  
  // Local state for UI management
  const [currentStationType, setCurrentStationType] = useState<StationType>('monitoring');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Track if this is the initial mount
  const isInitialMount = useRef(true);
  
  // Ensure store is ready before using it
  useEffect(() => {
    // Check if the store is initialized
    if (complaintStore) {
      console.log("[StationCardEditInfo] Store is available");
      setIsStoreReady(true);
    } else {
      console.warn("[StationCardEditInfo] Store is not yet available");
    }
    
    // Reset hasChanges on initial mount
    if (isInitialMount.current) {
      console.log("[StationCardEditInfo] Initial mount, resetting hasChanges");
      setHasChanges(false);
      
      // Set isInitialMount to false after the initial mount
      isInitialMount.current = false;
    }
  }, []);
  
  // Fetch monitoring stations
  const { 
    data: monitoringData, 
    isLoading: isLoadingMonitoring, 
    error: monitoringError 
  } = useMonitoringStations(amphure, province);
  
  // Fetch rain stations
  const { 
    data: rainData, 
    isLoading: isLoadingRain, 
    error: rainError 
  } = useRainStations(amphure, province);
  
  // Fetch reservoirs
  const { 
    data: reservoirData, 
    isLoading: isLoadingReservoir, 
    error: reservoirError 
  } = useReservoirs(amphure, province);
  
  // Initialize station data in store when data is loaded
  useEffect(() => {
    // Only proceed if the store is ready and we have data
    if (!isStoreReady || isLoadingMonitoring || !monitoringData?.stations) return;
    
    try {
      // Only update if we don't have monitoring stations yet or if they've changed
      if (!stationData?.monitoringStations.length || 
          JSON.stringify(stationData.monitoringStations) !== JSON.stringify(monitoringData.stations)) {
        
        console.log("[StationCardEditInfo] Updating monitoring stations in store");
        complaintStore.setStationData({
          monitoringStations: monitoringData.stations || [],
          rainStations: stationData?.rainStations || [],
          reservoirs: stationData?.reservoirs || [],
          userSelectedMonitoringStations: stationData?.userSelectedMonitoringStations || [],
          userSelectedRainStations: stationData?.userSelectedRainStations || [],
          userSelectedReservoirs: stationData?.userSelectedReservoirs || [],
          disabledMonitoringStations: stationData?.disabledMonitoringStations || {},
          disabledRainStations: stationData?.disabledRainStations || {},
          disabledReservoirs: stationData?.disabledReservoirs || {}
        });
      }
    } catch (error) {
      console.error("[StationCardEditInfo] Error initializing monitoring stations:", error);
    }
  }, [monitoringData, isLoadingMonitoring, isStoreReady, stationData, complaintStore]);
  
  useEffect(() => {
    // Only proceed if the store is ready and we have data
    if (!isStoreReady || isLoadingRain || !rainData?.stations || !stationData) return;
    
    try {
      // Only update if rain stations have changed
      if (JSON.stringify(stationData.rainStations) !== JSON.stringify(rainData.stations)) {
        console.log("[StationCardEditInfo] Updating rain stations in store");
        complaintStore.setStationData({
          ...stationData,
          rainStations: rainData.stations || []
        });
      }
    } catch (error) {
      console.error("[StationCardEditInfo] Error initializing rain stations:", error);
    }
  }, [rainData, isLoadingRain, isStoreReady, stationData, complaintStore]);
  
  useEffect(() => {
    // Only proceed if the store is ready and we have data
    if (!isStoreReady || isLoadingReservoir || !reservoirData?.reservoirs || !stationData) return;
    
    try {
      // Only update if reservoirs have changed
      if (JSON.stringify(stationData.reservoirs) !== JSON.stringify(reservoirData.reservoirs)) {
        console.log("[StationCardEditInfo] Updating reservoirs in store");
        complaintStore.setStationData({
          ...stationData,
          reservoirs: reservoirData.reservoirs || []
        });
      }
    } catch (error) {
      console.error("[StationCardEditInfo] Error initializing reservoirs:", error);
    }
  }, [reservoirData, isLoadingReservoir, isStoreReady, stationData, complaintStore]);
  
  // Debug logging
  useEffect(() => {
    console.log("[StationCardEditInfo] Initialized with location:", {
      amphure,
      province,
      storeReady: isStoreReady,
      timestamp: new Date().toISOString()
    });
    
    return () => {
      console.log("[StationCardEditInfo] Component unmounted", {
        timestamp: new Date().toISOString()
      });
    };
  }, [amphure, province, isStoreReady]);
  
  // Check for existing changes when component mounts
  useEffect(() => {
    // Skip this effect on initial mount
    if (isInitialMount.current || !stationData) return;
    
    // Only check for changes if we're not in the initial mount
    // Check if there are any disabled stations
    const hasDisabledStations = 
      Object.values(stationData.disabledMonitoringStations).some(Boolean) ||
      Object.values(stationData.disabledRainStations).some(Boolean) ||
      Object.values(stationData.disabledReservoirs).some(Boolean);
    
    // Check if there are any user-selected stations
    const hasUserSelectedStations = 
      stationData.userSelectedMonitoringStations.length > 0 ||
      stationData.userSelectedRainStations.length > 0 ||
      stationData.userSelectedReservoirs.length > 0;
    
    console.log("[StationCardEditInfo] Checking for existing changes:", { 
      hasDisabledStations, 
      hasUserSelectedStations,
      isInitialMount: isInitialMount.current
    });
    
    // This will only run for changes made during the current session
    // We don't want to set hasChanges to true on initial load
  }, [stationData]);
  
  // Log when hasChanges changes
  useEffect(() => {
    console.log(`[StationCardEditInfo] hasChanges: ${hasChanges}`);
  }, [hasChanges]);
  
  // Log when station data changes
  useEffect(() => {
    if (!isStoreReady) return;
    
    console.log("[StationCardEditInfo] Station data updated:", {
      monitoringStations: stationData?.monitoringStations?.length || 0,
      rainStations: stationData?.rainStations?.length || 0,
      reservoirs: stationData?.reservoirs?.length || 0,
      userSelectedMonitoring: stationData?.userSelectedMonitoringStations?.length || 0,
      userSelectedRain: stationData?.userSelectedRainStations?.length || 0,
      userSelectedReservoirs: stationData?.userSelectedReservoirs?.length || 0,
      timestamp: new Date().toISOString()
    });
  }, [stationData, isStoreReady]);
  
  // Log card creation for debugging
  const logCardCreation = (item: any, index: number, total: number, type: 'monitoring' | 'rain' | 'reservoir') => {
    if (index === 0 || index === total - 1) {
      console.log(`[StationCardEditInfo] Creating ${type} card ${index + 1}/${total}`, {
        id: item.id,
        name: type === 'reservoir' ? item.reservoir_name : item.station_name,
        timestamp: new Date().toISOString()
      });
    }
  };

  // Common content box styles
  const contentBoxStyle = "w-full border border-[#E2E8F0] rounded-md p-4 bg-white text-[#17254D] text-sm font-normal";
  const contentTextStyle = "px-4"; // Reduced horizontal padding for more compact layout
  const labelStyle = "text-[#64748B] font-medium text-base bg-white px-2 z-10";
  const labelContainerStyle = "flex justify-between items-center absolute -top-4 left-3 z-10";

  // Handle add data button click
  const handleAddData = (type: StationType) => {
    setCurrentStationType(type);
    setDialogOpen(true);
  };

  // Handle station selection from dialog
  const handleStationSelect = (stations: any[]) => {
    if (stations.length === 0) return;
    
    switch (currentStationType) {
      case 'monitoring':
        // Add selected stations to user-selected stations in store
        stations.forEach(station => {
          // Check if station is already in user-selected stations
          const isAlreadySelected = stationData?.userSelectedMonitoringStations.some(
            s => s.id === station.id
          );
          
          if (!isAlreadySelected) {
            complaintStore.addUserSelectedStation('monitoring', station);
            setHasChanges(true);
          }
        });
        
        if (stations.length > 0) {
          toast.success(`เพิ่มสถานีเฝ้าระวัง ${stations.length} สถานี`, {
            description: "เพิ่มสถานีเฝ้าระวังเรียบร้อยแล้ว",
            duration: 3000,
          });
          notifyChanges();
        }
        break;
        
      case 'rain':
        // Add selected stations to user-selected stations in store
        stations.forEach(station => {
          // Check if station is already in user-selected stations
          const isAlreadySelected = stationData?.userSelectedRainStations.some(
            s => s.id === station.id
          );
          
          if (!isAlreadySelected) {
            complaintStore.addUserSelectedStation('rain', station);
            setHasChanges(true);
          }
        });
        
        if (stations.length > 0) {
          toast.success(`เพิ่มสถานีน้ำฝน ${stations.length} สถานี`, {
            description: "เพิ่มสถานีน้ำฝนเรียบร้อยแล้ว",
            duration: 3000,
          });
          notifyChanges();
        }
        break;
        
      case 'reservoir':
        // Add selected stations to user-selected stations in store
        stations.forEach(station => {
          // Check if station is already in user-selected stations
          const isAlreadySelected = stationData?.userSelectedReservoirs.some(
            s => s.id === station.id
          );
          
          if (!isAlreadySelected) {
            complaintStore.addUserSelectedStation('reservoir', station);
            setHasChanges(true);
          }
        });
        
        if (stations.length > 0) {
          toast.success(`เพิ่มเขื่อน/อ่างเก็บน้ำ ${stations.length} แห่ง`, {
            description: "เพิ่มเขื่อน/อ่างเก็บน้ำเรียบร้อยแล้ว",
            duration: 3000,
          });
          notifyChanges();
        }
        break;
    }
  };

  // Track changes made during the current session
  const handleStationChange = useCallback((type: StationType, action: 'add' | 'remove' | 'disable' | 'enable', station: MonitoringStation | RainStation | Reservoir | string | number) => {
    const stationId = typeof station === 'string' ? parseInt(station, 10) : 
                      typeof station === 'number' ? station : 
                      station.id;
    
    console.log(`[StationCardEditInfo] Station change: ${action} ${type} station ${stationId}`);
    
    // Mark that changes have been made in this session
    setHasChanges(true);
    
    // Call the onChangesMade callback if provided
    if (onChangesMade) {
      onChangesMade();
    }
    
    // Update the station data in the store
    if (complaintStore) {
      if (action === 'add') {
        if (typeof station === 'string' || typeof station === 'number') {
          console.error('Cannot add station with just ID, need full station object');
          return;
        }
        complaintStore.addUserSelectedStation(type, station);
      } else if (action === 'remove') {
        complaintStore.removeUserSelectedStation(type, stationId);
      } else if (action === 'disable' || action === 'enable') {
        // Toggle the disabled state - if we're enabling, it will toggle from true to false
        // If we're disabling, it will toggle from false to true
        complaintStore.toggleStationDisabled(type, stationId);
      }
    }
  }, [complaintStore, onChangesMade]);

  // Use this handler for all station changes
  const handleAddStation = useCallback((type: StationType, station: MonitoringStation | RainStation | Reservoir) => {
    handleStationChange(type, 'add', station);
  }, [handleStationChange]);

  const handleRemoveStation = useCallback((type: StationType, stationId: string | number) => {
    handleStationChange(type, 'remove', stationId);
  }, [handleStationChange]);

  const handleDisableStation = useCallback((type: StationType, stationId: string | number) => {
    handleStationChange(type, 'disable', stationId);
  }, [handleStationChange]);

  const handleEnableStation = useCallback((type: StationType, stationId: string | number) => {
    handleStationChange(type, 'enable', stationId);
  }, [handleStationChange]);

  // Handle adding a station from the selection dialog
  const handleAddStationFromDialog = (type: StationType, station: MonitoringStation | RainStation | Reservoir) => {
    // Use our new handler to ensure changes are tracked
    handleAddStation(type, station);
    setDialogOpen(false);
  };

  // Handle removing a user-selected station
  const handleRemoveUserSelected = (type: 'monitoring' | 'rain' | 'reservoir', id: number) => {
    console.log(`[StationCardEditInfo] Removing user-selected ${type} station with ID: ${id}`);
    
    // Check if the station exists in user-selected stations
    let stationExists = false;
    
    switch (type) {
      case 'monitoring':
        stationExists = stationData?.userSelectedMonitoringStations?.some(s => s.id === id) || false;
        break;
      case 'rain':
        stationExists = stationData?.userSelectedRainStations?.some(s => s.id === id) || false;
        break;
      case 'reservoir':
        stationExists = stationData?.userSelectedReservoirs?.some(s => s.id === id) || false;
        break;
    }
    
    if (!stationExists) {
      console.warn(`[StationCardEditInfo] Station ${id} not found in user-selected ${type} stations`);
      return;
    }
    
    // Remove the station from user-selected stations
    complaintStore.removeUserSelectedStation(type, id);
    
    // Mark that changes have been made
    setHasChanges(true);
    
    // Notify parent component of changes
    if (onChangesMade) {
      onChangesMade();
    }
    
    // Show success toast
    let stationTypeText = '';
    switch (type) {
      case 'monitoring':
        stationTypeText = 'สถานีเฝ้าระวัง';
        break;
      case 'rain':
        stationTypeText = 'สถานีน้ำฝน';
        break;
      case 'reservoir':
        stationTypeText = 'เขื่อน/อ่างเก็บน้ำ';
        break;
    }
    
    toast.success(`ลบ${stationTypeText}`, {
      description: `ลบ${stationTypeText}เรียบร้อยแล้ว`,
      duration: 3000,
    });
  };

  // Create station-specific delete handlers that match the expected function signature
  const createDeleteHandler = (type: StationType, stationId: number) => {
    return () => {
      console.log(`[StationCardEditInfo] Delete handler called for ${type} station ${stationId}`);
      handleRemoveUserSelected(type, stationId);
    };
  };

  // Handle toggling a station's disabled state
  const handleToggleDisabled = (type: StationType, stationId: number, currentlyDisabled: boolean) => {
    console.log(`[StationCardEditInfo] Toggle disabled: ${type} station ${stationId}, currently disabled: ${currentlyDisabled}`);
    
    // Use our new handlers to ensure changes are tracked
    if (currentlyDisabled) {
      handleEnableStation(type, stationId);
    } else {
      handleDisableStation(type, stationId);
    }
  };

  // Handle removing a station
  const handleRemoveStationClick = (type: StationType, stationId: number) => {
    // Use our new handler to ensure changes are tracked
    handleRemoveStation(type, stationId);
  };

  // Create station-specific toggle handlers that match the expected function signature
  const createToggleHandler = (type: StationType, stationId: number, isDisabled: boolean) => {
    return () => {
      handleToggleDisabled(type, stationId, isDisabled);
    };
  };

  // Add this to any function that modifies the station data
  const notifyChanges = () => {
    console.log("[StationCardEditInfo] Changes made, notifying parent");
    setHasChanges(true);
    if (onChangesMade) {
      onChangesMade();
    }
  };

  // Handle save button click
  const handleSave = () => {
    // Ensure we have the latest station data
    const currentStationData = complaintStore.stationData;
    
    // Log the data being saved
    console.log("[StationCardEditInfo] Saving station data:", {
      monitoringStations: currentStationData?.monitoringStations?.length || 0,
      rainStations: currentStationData?.rainStations?.length || 0,
      reservoirs: currentStationData?.reservoirs?.length || 0,
      userSelectedMonitoring: currentStationData?.userSelectedMonitoringStations?.length || 0,
      userSelectedRain: currentStationData?.userSelectedRainStations?.length || 0,
      userSelectedReservoirs: currentStationData?.userSelectedReservoirs?.length || 0,
    });
    
    toast.success("บันทึกข้อมูล", {
      description: "บันทึกข้อมูลเรียบร้อยแล้ว",
      duration: 3000,
    });
    
    // Call the onSave callback if provided
    if (onSave) {
      onSave();
    }
  };

  // Handle discard button click - navigate without saving current session changes
  const handleDiscard = () => {
    console.log("[StationCardEditInfo] Discarding changes in current session");
    
    toast.info("ไม่บันทึกการเปลี่ยนแปลง", {
      description: "กลับไปยังหน้าข้อร้องเรียนโดยไม่บันทึกการเปลี่ยนแปลงในครั้งนี้",
      duration: 3000,
    });
    
    // Call the onDiscard callback if provided
    if (onDiscard) {
      onDiscard();
    }
  };

  // Early return if no location data
  if (!amphure && !province) {
    console.info("[StationCardEditInfo] ⚠️ No location data provided", {
      timestamp: new Date().toISOString()
    });
    return (
      <div className="space-y-8 px-4">
        <h2 className="text-xl font-semibold text-[#17254D] mb-6">ข้อมูลสนับสนุน</h2>
        <div className="flex flex-col relative mt-10 mx-auto max-w-full w-full">
          <Alert>
            <AlertDescription>
              ไม่พบข้อมูลพื้นที่สำหรับค้นหาสถานี
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary component="StationCardEditInfo">
      <div className="space-y-10 px-4">
        {/* Main Heading */}
        <h2 className="text-xl font-semibold text-[#17254D] mb-6">ข้อมูลสนับสนุน</h2>
        
        {/* Monitoring Stations Section */}
        <div className="flex flex-col relative mt-10 mx-auto max-w-full w-full">
          <div className={labelContainerStyle}>
            <Label className={labelStyle}>
              สถานีเฝ้าระวัง {amphure && `ใน${amphure}`}{!amphure && province && `ใน${province}`}
            </Label>
            <Button 
              className="bg-[#42A5F5] text-white hover:bg-[#1E88E5] h-10 px-4 text-base flex items-center justify-center ml-auto"
              onClick={() => handleAddData('monitoring')}
            >
              <Plus className="h-5 w-5 mr-2" /> เพิ่มข้อมูล
            </Button>
          </div>
          
          {isLoadingMonitoring && (
            <div className={contentBoxStyle}>
              <div className={contentTextStyle}>
                <div className="space-y-4">
                  <Skeleton className="h-[100px] w-full" />
                  <Skeleton className="h-[100px] w-full" />
                </div>
              </div>
            </div>
          )}

          {monitoringError && !isLoadingMonitoring && (
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

          {!isLoadingMonitoring && !monitoringError && 
           (stationData?.monitoringStations?.length || 0) === 0 && 
           (stationData?.userSelectedMonitoringStations?.length || 0) === 0 && (
            <div className={contentBoxStyle}>
              <div className={contentTextStyle}>
                <Alert>
                  <AlertDescription>
                    ไม่พบสถานีเฝ้าระวังในพื้นที่นี้
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          )}

          {/* Display user-selected monitoring stations */}
          {stationData?.userSelectedMonitoringStations && stationData.userSelectedMonitoringStations.length > 0 && (
            <div className={contentBoxStyle}>
              <div className={contentTextStyle}>
                <div className="space-y-8">
                  {stationData.userSelectedMonitoringStations.map((station, index) => (
                    <MonitoringStationCard 
                      key={`selected-${station.id}`} 
                      station={station} 
                      showButtons={true}
                      isUserSelected={true}
                      onToggleDisabled={createToggleHandler('monitoring', station.id, stationData.disabledMonitoringStations[station.id.toString()])}
                      onDeleteData={createDeleteHandler('monitoring', station.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Display available monitoring stations */}
          {!isLoadingMonitoring && !monitoringError && 
           stationData?.monitoringStations && stationData.monitoringStations.length > 0 && (
            <div className={contentBoxStyle}>
              <div className={contentTextStyle}>
                <div className="space-y-8">
                  {stationData.monitoringStations.map((station, index) => {
                    logCardCreation(station, index, stationData.monitoringStations.length, 'monitoring');
                    const stationId = station.id.toString();
                    const isDisabled = stationData.disabledMonitoringStations[stationId];
                    
                    return (
                      <MonitoringStationCard 
                        key={station.id} 
                        station={station} 
                        isLoading={isLoadingMonitoring}
                        error={monitoringError}
                        showButtons={true}
                        disabled={isDisabled}
                        onToggleDisabled={createToggleHandler('monitoring', station.id, isDisabled)}
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
              สถานีน้ำฝน {amphure && `ใน${amphure}`}{!amphure && province && `ใน${province}`}
            </Label>
            <Button 
              className="bg-[#42A5F5] text-white hover:bg-[#1E88E5] h-10 px-4 text-base flex items-center justify-center ml-auto"
              onClick={() => handleAddData('rain')}
            >
              <Plus className="h-5 w-5 mr-2" /> เพิ่มข้อมูล
            </Button>
          </div>
          
          {isLoadingRain && (
            <div className={contentBoxStyle}>
              <div className={contentTextStyle}>
                <div className="space-y-4">
                  <Skeleton className="h-[100px] w-full" />
                  <Skeleton className="h-[100px] w-full" />
                </div>
              </div>
            </div>
          )}

          {rainError && !isLoadingRain && (
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

          {!isLoadingRain && !rainError && 
           (stationData?.rainStations?.length || 0) === 0 && 
           (stationData?.userSelectedRainStations?.length || 0) === 0 && (
            <div className={contentBoxStyle}>
              <div className={contentTextStyle}>
                <Alert>
                  <AlertDescription>
                    ไม่พบสถานีน้ำฝนในพื้นที่นี้
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          )}

          {/* Display user-selected rain stations */}
          {stationData?.userSelectedRainStations && stationData.userSelectedRainStations.length > 0 && (
            <div className={contentBoxStyle}>
              <div className={contentTextStyle}>
                <div className="space-y-8">
                  {stationData.userSelectedRainStations.map((station, index) => (
                    <RainStationCard 
                      key={`selected-${station.id}`} 
                      station={station} 
                      showButtons={true}
                      isUserSelected={true}
                      onToggleDisabled={createToggleHandler('rain', station.id, stationData.disabledRainStations[station.id.toString()])}
                      onDeleteData={createDeleteHandler('rain', station.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Display available rain stations */}
          {!isLoadingRain && !rainError && 
           stationData?.rainStations && stationData.rainStations.length > 0 && (
            <div className={contentBoxStyle}>
              <div className={contentTextStyle}>
                <div className="space-y-8">
                  {stationData.rainStations.map((station, index) => {
                    logCardCreation(station, index, stationData.rainStations.length, 'rain');
                    const stationId = station.id.toString();
                    const isDisabled = stationData.disabledRainStations[stationId];
                    
                    return (
                      <RainStationCard 
                        key={station.id} 
                        station={station}
                        showButtons={true}
                        disabled={isDisabled}
                        onToggleDisabled={createToggleHandler('rain', station.id, isDisabled)}
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
              เขื่อน/อ่างเก็บน้ำ {amphure && `ใน${amphure}`}{!amphure && province && `ใน${province}`}
            </Label>
            <Button 
              className="bg-[#42A5F5] text-white hover:bg-[#1E88E5] h-10 px-4 text-base flex items-center justify-center ml-auto"
              onClick={() => handleAddData('reservoir')}
            >
              <Plus className="h-5 w-5 mr-2" /> เพิ่มข้อมูล
            </Button>
          </div>
          
          {isLoadingReservoir && (
            <div className={contentBoxStyle}>
              <div className={contentTextStyle}>
                <div className="space-y-4">
                  <Skeleton className="h-[100px] w-full" />
                  <Skeleton className="h-[100px] w-full" />
                </div>
              </div>
            </div>
          )}

          {reservoirError && !isLoadingReservoir && (
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

          {!isLoadingReservoir && !reservoirError && 
           (stationData?.reservoirs?.length || 0) === 0 && 
           (stationData?.userSelectedReservoirs?.length || 0) === 0 && (
            <div className={contentBoxStyle}>
              <div className={contentTextStyle}>
                <Alert>
                  <AlertDescription>
                    ไม่พบเขื่อน/อ่างเก็บน้ำในพื้นที่นี้
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          )}

          {/* Display user-selected reservoirs */}
          {stationData?.userSelectedReservoirs && stationData.userSelectedReservoirs.length > 0 && (
            <div className={contentBoxStyle}>
              <div className={contentTextStyle}>
                <div className="space-y-8">
                  {stationData.userSelectedReservoirs.map((reservoir, index) => (
                    <ReservoirCard 
                      key={`selected-${reservoir.id}`} 
                      reservoir={reservoir} 
                      showButtons={true}
                      isUserSelected={true}
                      onToggleDisabled={createToggleHandler('reservoir', reservoir.id, stationData.disabledReservoirs[reservoir.id.toString()])}
                      onDeleteData={createDeleteHandler('reservoir', reservoir.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Display available reservoirs */}
          {!isLoadingReservoir && !reservoirError && 
           stationData?.reservoirs && stationData.reservoirs.length > 0 && (
            <div className={contentBoxStyle}>
              <div className={contentTextStyle}>
                <div className="space-y-8">
                  {stationData.reservoirs.map((reservoir, index) => {
                    logCardCreation(reservoir, index, stationData.reservoirs.length, 'reservoir');
                    const reservoirId = reservoir.id.toString();
                    const isDisabled = stationData.disabledReservoirs[reservoirId];
                    
                    return (
                      <ReservoirCard 
                        key={reservoir.id} 
                        reservoir={reservoir}
                        showButtons={true}
                        disabled={isDisabled}
                        onToggleDisabled={createToggleHandler('reservoir', reservoir.id, isDisabled)}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          
          {/* Save Button below Reservoir Frame */}
          <div className="flex justify-center mt-6 gap-4">
            <Button 
              onClick={handleDiscard}
              disabled={!hasChanges}
              className="bg-white text-[#42A5F5] hover:bg-gray-50 border border-[#42A5F5] h-12 px-16 text-base font-medium rounded-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ไม่บันทึก
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!hasChanges}
              className="bg-[#42A5F5] text-white hover:bg-[#1E88E5] h-12 px-16 text-base font-medium rounded-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-5 w-5 mr-2" />
              บันทึก
            </Button>
          </div>
        </div>
        
        {/* Station Selection Dialog */}
        <StationSelectionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          stationType={currentStationType}
          currentProvince={province}
          currentAmphure={amphure}
          onStationSelect={handleStationSelect}
          currentStations={[
            ...(stationData?.monitoringStations || []),
            ...(stationData?.rainStations || []),
            ...(stationData?.reservoirs || []),
            ...(stationData?.userSelectedMonitoringStations || []),
            ...(stationData?.userSelectedRainStations || []),
            ...(stationData?.userSelectedReservoirs || [])
          ]}
        />
      </div>
    </ErrorBoundary>
  );
}; 