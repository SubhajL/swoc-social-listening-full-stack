import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Info } from "lucide-react";
import { MonitoringStationCard } from "@/components/monitoring/MonitoringStationCard";
import { RainStationCard } from "@/components/monitoring/RainStationCard";
import { ReservoirCard } from "@/components/monitoring/ReservoirCard";
import { useMonitoringStations } from "@/hooks/useMonitoringStations";
import { useRainStations } from "@/hooks/useRainStations";
import { useReservoirs, Reservoir as APIReservoir } from "@/hooks/useReservoirs";
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
import { ProcessedPost } from "@/types/processed-post";
// Import Jotai hooks
import { useStationData } from "@/atoms/hooks";
import { useNavigate } from "react-router-dom";

// Import the save icon
import SaveIcon from "@/assets/icon/save.svg";

// Add adapter helpers for Reservoir type conversion
// This function adapts any reservoir-like object to the format expected by ReservoirCard
const adaptReservoir = (reservoir: unknown): Reservoir => {
  // Check if this is an API reservoir (with name property) or a DB reservoir (with reservoir_name property)
  const apiReservoir = reservoir as APIReservoir;
  const dbReservoir = reservoir as Reservoir;
  
  // Create a properly typed Reservoir object with all required properties
  return {
    id: typeof dbReservoir.id === 'number' ? dbReservoir.id : 
         apiReservoir.id ? parseInt(apiReservoir.id, 10) : 0,
    sequence_number: dbReservoir.sequence_number || null,
    irrigation_office: dbReservoir.irrigation_office || null,
    reservoir_name: dbReservoir.reservoir_name || apiReservoir.name || `Reservoir ${dbReservoir.id || apiReservoir.id}`,
    river_basin: dbReservoir.river_basin || null,
    river_name: dbReservoir.river_name || null,
    amphure: dbReservoir.amphure || null,
    province: dbReservoir.province || null,
    normal_storage_capacity: dbReservoir.normal_storage_capacity || 
                           (apiReservoir.capacity ? apiReservoir.capacity.toString() : null),
    minimum_storage_capacity: dbReservoir.minimum_storage_capacity || '0',
    type: dbReservoir.type || null,
    station_id: dbReservoir.station_id || apiReservoir.id?.toString() || null
  };
};

// Helper to get a display name for any reservoir-like object
const getReservoirDisplayName = (reservoir: unknown): string => {
  const apiReservoir = reservoir as APIReservoir;
  const dbReservoir = reservoir as Reservoir;
  return dbReservoir.reservoir_name || apiReservoir.name || `Reservoir ${dbReservoir.id || apiReservoir.id}`;
};

interface WaterLevelInfoProps {
  amphure?: string;
  province?: string;
  showButtons?: boolean;
  returnedFromStationEdit?: boolean;
  stationData?: MonitoringStation[] | any; // Allow any for backward compatibility
}

export const WaterLevelInfo = ({ 
  amphure, 
  province, 
  showButtons = false,
  returnedFromStationEdit = false,
  stationData
}: WaterLevelInfoProps) => {
  console.log('[WaterLevelInfo] Component rendered with location:', { amphure, province });
  console.log('[WaterLevelInfo] Received stationData:', stationData);
  
  const navigate = useNavigate();
  
  // Get station data from Jotai
  const {
    monitoringStations,
    rainStations,
    reservoirs,
    userSelectedMonitoringStations,
    userSelectedRainStations,
    userSelectedReservoirs
  } = useStationData();
  
  // Clean location strings for display
  const cleanedAmphure = cleanLocationString(amphure);
  const cleanedProvince = cleanLocationString(province);
  
  // Format location for display
  const displayAmphure = amphure ? formatLocationForDisplay(amphure, 'amphure') : undefined;
  const displayProvince = province ? formatLocationForDisplay(province, 'province') : undefined;
  
  // Use API data if no Jotai data is available
  const { data: monitoringData, isLoading: isLoadingMonitoring, error: monitoringError } = useMonitoringStations(
    monitoringStations.length > 0 ? undefined : amphure, 
    monitoringStations.length > 0 ? undefined : province
  );
  const { data: rainData, isLoading: isLoadingRain, error: rainError } = useRainStations(
    rainStations.length > 0 ? undefined : amphure, 
    rainStations.length > 0 ? undefined : province
  );
  const { data: reservoirData, isLoading: isLoadingReservoir, error: reservoirError } = useReservoirs(
    reservoirs.length > 0 ? undefined : amphure, 
    reservoirs.length > 0 ? undefined : province
  );
  
  // Determine which stations to display - prioritize Jotai data
  const monitoringStationsToDisplay = userSelectedMonitoringStations.length > 0 
    ? userSelectedMonitoringStations 
    : (monitoringStations.length > 0 
      ? monitoringStations 
      : (monitoringData?.stations ? monitoringData.stations : []));
  
  const rainStationsToDisplay = userSelectedRainStations.length > 0 
    ? userSelectedRainStations 
    : (rainStations.length > 0 
      ? rainStations 
      : (rainData?.stations ? rainData.stations : []));
  
  const reservoirsToDisplay = userSelectedReservoirs.length > 0 
    ? userSelectedReservoirs 
    : (reservoirs.length > 0 
      ? reservoirs 
      : (reservoirData ? (Array.isArray(reservoirData) ? reservoirData.map(adaptReservoir) : []) : []));
  
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
  
  // Log Jotai station data
  useEffect(() => {
    console.log('[WaterLevelInfo] Jotai station data:', {
      monitoringStationsCount: monitoringStations.length,
      rainStationsCount: rainStations.length,
      reservoirsCount: reservoirs.length,
      userSelectedMonitoringStationsCount: userSelectedMonitoringStations.length,
      userSelectedRainStationsCount: userSelectedRainStations.length,
      userSelectedReservoirsCount: userSelectedReservoirs.length
    });
  }, [
    monitoringStations, 
    rainStations, 
    reservoirs, 
    userSelectedMonitoringStations, 
    userSelectedRainStations, 
    userSelectedReservoirs
  ]);
  
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
        // Create minimal complaint data with location info
        const minimalComplaintData = {
          id: "0",
          type: "COMPLAINT",
          status: "PENDING",
          severity: 1,
          content: "Location update",
          text: "Location update",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          processed_post_id: 0,
          category_name: "REPORT_INCIDENT",
          profile_name: "System",
          post_date: new Date(),
          post_url: "",
          latitude: 0,
          longitude: 0,
          tumbon: [],
          amphure: amphure ? [amphure] : [],
          province: province ? [province] : [],
          coordinate_source: "direct"
        };
        
        complaintStore.setComplaintData(minimalComplaintData as any);
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
      
      // Check if we should initialize the store based on conditions
      const shouldInitialize = storeIsEmpty && 
                               (!returnedFromStationEdit || !includesStationData) &&
                              !hasInitializedStoreWithCurrentData.current;
                          
      // 🔍 DEBUG: Log detailed information about initialization conditions
      console.info("🔍 [DEBUG-WaterLevelInfo] Initialization condition check:", {
        storeIsEmpty,
        returnedFromStationEdit,
        includesStationData,
        hasInitializedWithCurrentData: hasInitializedStoreWithCurrentData.current,
        shouldInitialize,
        storeHasData: complaintStore.stationData ? 'yes' : 'no',
        stationDataCounts: complaintStore.stationData ? {
          monitoringStationsCount: complaintStore.stationData.monitoringStations?.length || 0,
          rainStationsCount: complaintStore.stationData.rainStations?.length || 0,
          reservoirsCount: complaintStore.stationData.reservoirs?.length || 0
        } : 'no data',
        timestamp: new Date().toISOString()
      });
                          
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
        // 🔍 DEBUG: Log the precise values that contributed to skipping
        console.info("🔍 [DEBUG-WaterLevelInfo] Detailed skip condition values:", {
          storeIsEmpty,
          returnedFromStationEdit,
          includesStationData,
          hasInitializedWithCurrentData: hasInitializedStoreWithCurrentData.current,
          storeHasData: complaintStore.stationData ? 'yes' : 'no',
          stationDataFromStore: complaintStore.stationData ? {
            monitoringStationsCount: complaintStore.stationData.monitoringStations?.length || 0,
            rainStationsCount: complaintStore.stationData.rainStations?.length || 0,
            reservoirsCount: complaintStore.stationData.reservoirs?.length || 0,
            userSelectedMonitoringCount: complaintStore.stationData.userSelectedMonitoringStations?.length || 0,
            userSelectedRainCount: complaintStore.stationData.userSelectedRainStations?.length || 0,
            userSelectedReservoirsCount: complaintStore.stationData.userSelectedReservoirs?.length || 0
          } : 'no data',
          complaintFormState: sessionStorage.getItem('complaintFormState') ? 
            JSON.parse(sessionStorage.getItem('complaintFormState') || '{}') : null,
          timestamp: new Date().toISOString()
        });
        
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
      name = getReservoirDisplayName(item);
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

  // Handle adding data
  const handleAddData = (type: string) => {
    if (type === 'monitoring') {
      navigate('/station-card-edit', { state: { tab: 'monitoring' } });
    } else if (type === 'rain') {
      navigate('/station-card-edit', { state: { tab: 'rain' } });
    } else if (type === 'reservoir') {
      navigate('/station-card-edit', { state: { tab: 'reservoir' } });
    }
  };

  // Handle deleting data
  const handleDeleteData = (type: string) => {
    // Implementation depends on your requirements
    toast.success(`ลบข้อมูล${type === 'monitoring' ? 'สถานีเฝ้าระวัง' : type === 'rain' ? 'สถานีตรวจวัดน้ำฝน' : 'เขื่อน/อ่างเก็บน้ำ'} สำเร็จ`);
  };

  // Handle save
  const handleSave = () => {
    // Save using Jotai instead of complaintStore
    toast.success('บันทึกข้อมูลสำเร็จ');
  };

  // Determine if we're loading data
  const isLoading = !stationData && (isLoadingMonitoring || isLoadingRain || isLoadingReservoir);
  
  // Determine if we have errors
  const hasErrors = !stationData && (monitoringError || rainError || reservoirError);

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

  // Render monitoring stations
  const renderMonitoringStations = () => {
    if (isLoading) return <Skeleton className="h-24 w-full" />;
    
    if (monitoringStationsToDisplay.length > 0) {
      return (
        <div className="space-y-3">
          {monitoringStationsToDisplay.map((station) => (
            <MonitoringStationCard 
              key={`monitoring-${station.id}-${cardCreationCount.current}`}
              station={station as any}
            />
          ))}
        </div>
      );
    }
    
    return (
      <Alert variant="default" className="bg-muted">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No monitoring stations found for this location.
        </AlertDescription>
      </Alert>
    );
  };
  
  // Render rain stations
  const renderRainStations = () => {
    if (isLoading) return <Skeleton className="h-24 w-full" />;
    
    if (rainStationsToDisplay.length > 0) {
      return (
        <div className="space-y-3">
          {rainStationsToDisplay.map((station) => (
            <RainStationCard 
              key={`rain-${station.id}-${cardCreationCount.current}`}
              station={station as any}
            />
          ))}
        </div>
      );
    }
    
    return (
      <Alert variant="default" className="bg-muted">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No rain stations found for this location.
        </AlertDescription>
      </Alert>
    );
  };
  
  // Render reservoirs
  const renderReservoirs = () => {
    if (isLoading) return <Skeleton className="h-24 w-full" />;
    
    if (reservoirsToDisplay.length > 0) {
      return (
        <div className="space-y-3">
          {reservoirsToDisplay.map((reservoir) => (
            <ReservoirCard 
              key={`reservoir-${reservoir.id}-${cardCreationCount.current}`}
              reservoir={reservoir as any}
            />
          ))}
        </div>
      );
    }
    
    return (
      <Alert variant="default" className="bg-muted">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No reservoirs found for this location.
        </AlertDescription>
      </Alert>
    );
  };

  return (
    <ErrorBoundary component="WaterLevelInfo">
      <div className="space-y-6 px-4">
        {/* Main Heading */}
        <h2 className="text-xl font-semibold text-[#17254D] mb-4">ข้อมูลสนับสนุน</h2>
        
        {/* Monitoring Stations Section */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">สถานีเฝ้าระวัง</h3>
            {showButtons && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1 text-blue-600 border-blue-600 hover:bg-blue-50"
                onClick={() => handleAddData('สถานีเฝ้าระวัง')}
              >
                <Plus className="h-4 w-4" />
                เพิ่มสถานี
              </Button>
            )}
          </div>
          
          {isLoadingMonitoring ? (
            <div className="space-y-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : monitoringError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                ไม่สามารถโหลดข้อมูลสถานีเฝ้าระวังได้ กรุณาลองใหม่อีกครั้ง
              </AlertDescription>
            </Alert>
          ) : monitoringStationsToDisplay.length === 0 ? (
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertDescription>
                ไม่พบข้อมูลสถานีเฝ้าระวังในพื้นที่{displayAmphure && ` ${displayAmphure}`}{displayProvince && ` ${displayProvince}`}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {monitoringStationsToDisplay.map((station) => (
                <MonitoringStationCard 
                  key={`monitoring-${station.id}-${cardCreationCount.current}`}
                  station={station as any}
                />
              ))}
            </div>
          )}
        </div>

        {/* Rain Stations Section */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">สถานีตรวจวัดน้ำฝน</h3>
            {showButtons && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1 text-blue-600 border-blue-600 hover:bg-blue-50"
                onClick={() => handleAddData('สถานีตรวจวัดน้ำฝน')}
              >
                <Plus className="h-4 w-4" />
                เพิ่มสถานี
              </Button>
            )}
          </div>
          
          {isLoadingRain ? (
            <div className="space-y-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : rainError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                ไม่สามารถโหลดข้อมูลสถานีตรวจวัดน้ำฝนได้ กรุณาลองใหม่อีกครั้ง
              </AlertDescription>
            </Alert>
          ) : rainStationsToDisplay.length === 0 ? (
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertDescription>
                ไม่พบข้อมูลสถานีตรวจวัดน้ำฝนในพื้นที่{displayAmphure && ` ${displayAmphure}`}{displayProvince && ` ${displayProvince}`}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {rainStationsToDisplay.map((station) => (
                <RainStationCard 
                  key={`rain-${station.id}-${cardCreationCount.current}`}
                  station={station as any}
                />
              ))}
            </div>
          )}
        </div>

        {/* Reservoirs Section */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">เขื่อน/อ่างเก็บน้ำ</h3>
            {showButtons && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1 text-blue-600 border-blue-600 hover:bg-blue-50"
                onClick={() => handleAddData('เขื่อน/อ่างเก็บน้ำ')}
              >
                <Plus className="h-4 w-4" />
                เพิ่มเขื่อน
              </Button>
            )}
          </div>
          
          {isLoadingReservoir ? (
            <div className="space-y-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : reservoirError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                ไม่สามารถโหลดข้อมูลเขื่อน/อ่างเก็บน้ำได้ กรุณาลองใหม่อีกครั้ง
              </AlertDescription>
            </Alert>
          ) : reservoirsToDisplay.length === 0 ? (
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertDescription>
                ไม่พบข้อมูลเขื่อน/อ่างเก็บน้ำในพื้นที่{displayAmphure && ` ${displayAmphure}`}{displayProvince && ` ${displayProvince}`}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {reservoirsToDisplay.map((reservoir) => (
                <ReservoirCard 
                  key={`reservoir-${reservoir.id}-${cardCreationCount.current}`}
                  reservoir={reservoir as any}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};