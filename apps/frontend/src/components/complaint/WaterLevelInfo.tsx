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
import { AlertCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useComplaintStore } from "@/stores/complaintStore";

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
  const { data: monitoringData, isLoading: isLoadingMonitoring, error: monitoringError } = useMonitoringStations(amphure, province);
  const { data: rainData, isLoading: isLoadingRain, error: rainError } = useRainStations(amphure, province);
  const { data: reservoirData, isLoading: isLoadingReservoir, error: reservoirError } = useReservoirs(amphure, province);
  const cardCreationCount = useRef(0);
  const complaintStore = useComplaintStore();
  const [isStoreReady, setIsStoreReady] = useState(false);
  
  // Check if store is ready
  useEffect(() => {
    if (complaintStore) {
      console.log("[WaterLevelInfo] Store is available");
      setIsStoreReady(true);
    } else {
      console.warn("[WaterLevelInfo] Store is not yet available");
    }
  }, []);

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

  // Log when data changes and initialize store if needed
  useEffect(() => {
    if (monitoringData) {
      console.info("[WaterLevelInfo] 📊 Monitoring stations data received", {
        totalStations: monitoringData.total,
        location: {
          amphure,
          province,
          queryType: amphure ? 'amphure' : province ? 'province' : 'none'
        },
        timestamp: new Date().toISOString()
      });
    }
    if (rainData) {
      console.info("[WaterLevelInfo] 🌧️ Rain stations data received", {
        totalStations: rainData.total,
        location: {
          amphure,
          province,
          queryType: amphure ? 'amphure' : province ? 'province' : 'none'
        },
        timestamp: new Date().toISOString()
      });
    }
    if (reservoirData) {
      console.info("[WaterLevelInfo] 💧 Reservoir data received", {
        totalReservoirs: reservoirData.total,
        location: {
          amphure,
          province,
          queryType: amphure ? 'amphure' : province ? 'province' : 'none'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Initialize store with API data if all data is loaded and store is ready
    if (isStoreReady && monitoringData && rainData && reservoirData) {
      // Only initialize if store is empty or if we're not returned from station edit
      if (!returnedFromStationEdit && 
          (!complaintStore.stationData || 
           !complaintStore.stationData.monitoringStations || 
           complaintStore.stationData.monitoringStations.length === 0)) {
        
        console.info("[WaterLevelInfo] 🔄 Initializing store with API data", {
          monitoringStations: monitoringData.stations.length,
          rainStations: rainData.stations.length,
          reservoirs: reservoirData.reservoirs.length,
          timestamp: new Date().toISOString()
        });
        
        complaintStore.setStationData({
          monitoringStations: monitoringData.stations,
          rainStations: rainData.stations,
          reservoirs: reservoirData.reservoirs,
          userSelectedMonitoringStations: [],
          userSelectedRainStations: [],
          userSelectedReservoirs: [],
          disabledMonitoringStations: {},
          disabledRainStations: {},
          disabledReservoirs: {}
        });
      }
    }
    
    // Reset card creation counter when new data arrives
    cardCreationCount.current = 0;
  }, [monitoringData, rainData, reservoirData, amphure, province, isStoreReady, returnedFromStationEdit, complaintStore]);
  
  // Log store data when available
  useEffect(() => {
    if (isStoreReady && complaintStore.stationData) {
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
    }
  }, [isStoreReady, complaintStore.stationData]);

  // Function to log card creation
  const logCardCreation = (item: any, index: number, total: number, type: 'monitoring' | 'rain' | 'reservoir') => {
    cardCreationCount.current++;
    console.info(`[WaterLevelInfo] 🔄 Creating ${type} ${type === 'reservoir' ? 'card' : 'station card'} ${index + 1}/${total}`, {
      id: item.id,
      name: type === 'reservoir' ? item.reservoir_name : item.station_name,
      location: `${item.amphure}, ${item.province}`,
      cardNumber: cardCreationCount.current,
      totalExpected: total,
      timestamp: new Date().toISOString()
    });
  };

  // Log final card creation count when component updates or unmounts
  useEffect(() => {
    return () => {
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
          expectedTotalMonitoring: monitoringData?.total || 0,
          expectedTotalRain: rainData?.total || 0,
          expectedTotalReservoir: reservoirData?.total || 0,
          storeMonitoringCount,
          storeRainCount,
          storeReservoirCount,
          disabledMonitoringCount,
          disabledRainCount,
          disabledReservoirCount,
          usingStoreData: isStoreReady && !!complaintStore.stationData,
          location: {
            amphure,
            province
          },
          timestamp: new Date().toISOString()
        });
      }
    };
  }, [monitoringData?.total, rainData?.total, reservoirData?.total, amphure, province, isStoreReady, complaintStore.stationData]);

  // Common content box styles
  const contentBoxStyle = "w-full border border-[#E2E8F0] rounded-md p-4 bg-white text-[#17254D] text-sm font-normal";
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
    <ErrorBoundary component="WaterLevelInfo">
      <div className="space-y-10 px-4">
        {/* Main Heading */}
        <h2 className="text-xl font-semibold text-[#17254D] mb-6">ข้อมูลสนับสนุน</h2>
        
        {/* Monitoring Stations Section */}
        <div className="flex flex-col relative mt-10 mx-auto max-w-full w-full">
          <div className={labelContainerStyle}>
            <Label className={labelStyle}>
              สถานีเฝ้าระวัง {amphure && `ใน${amphure}`}{!amphure && province && `ใน${province}`}
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
                      <Alert>
                        <AlertDescription>
                          ไม่พบสถานีเฝ้าระวังในพื้นที่นี้
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
           (!monitoringData?.stations || monitoringData.stations.length === 0) && (
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
              สถานีน้ำฝน {amphure && `ใน${amphure}`}{!amphure && province && `ใน${province}`}
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
                            name: station.station_name,
                            isDisabled,
                            showButtons,
                            timestamp: new Date().toISOString()
                          });
                          
                          logCardCreation(station, index, stationData.rainStations.length, 'rain');
                          return (
                            <RainStationCard 
                              key={station.id} 
                              station={station} 
                              showButtons={showButtons}
                              disabled={isDisabled}
                              onDeleteData={showButtons ? () => handleDeleteData(`สถานีน้ำฝน ${station.station_name}`) : undefined}
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
                      <Alert>
                        <AlertDescription>
                          ไม่พบสถานีน้ำฝนในพื้นที่นี้
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
                <Alert>
                  <AlertDescription>
                    ไม่พบสถานีน้ำฝนในพื้นที่นี้
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
                    return (
                      <RainStationCard 
                        key={station.id} 
                        station={station} 
                        showButtons={showButtons}
                        onDeleteData={showButtons ? () => handleDeleteData(`สถานีน้ำฝน ${station.station_name}`) : undefined}
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
                            name: reservoir.reservoir_name,
                            isDisabled,
                            showButtons,
                            timestamp: new Date().toISOString()
                          });
                          
                          logCardCreation(reservoir, index, stationData.reservoirs.length, 'reservoir');
                          return (
                            <ReservoirCard 
                              key={reservoir.id} 
                              reservoir={reservoir} 
                              showButtons={showButtons}
                              disabled={isDisabled}
                              onDeleteData={showButtons ? () => handleDeleteData(`เขื่อน/อ่างเก็บน้ำ ${reservoir.reservoir_name}`) : undefined}
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
                      <Alert>
                        <AlertDescription>
                          ไม่พบเขื่อน/อ่างเก็บน้ำในพื้นที่นี้
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
                <Alert>
                  <AlertDescription>
                    ไม่พบเขื่อน/อ่างเก็บน้ำในพื้นที่นี้
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
                    return (
                      <ReservoirCard 
                        key={reservoir.id} 
                        reservoir={reservoir} 
                        showButtons={showButtons}
                        onDeleteData={showButtons ? () => handleDeleteData(`เขื่อน/อ่างเก็บน้ำ ${reservoir.reservoir_name}`) : undefined}
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