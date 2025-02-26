import { Label } from "@/components/ui/label";
import { MonitoringStationCard } from "@/components/monitoring/MonitoringStationCard";
import { RainStationCard } from "@/components/monitoring/RainStationCard";
import { ReservoirCard } from "@/components/monitoring/ReservoirCard";
import { useMonitoringStations } from "@/hooks/useMonitoringStations";
import { useRainStations } from "@/hooks/useRainStations";
import { useReservoirs } from "@/hooks/useReservoirs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Plus, Trash2, Save } from "lucide-react";
import { useEffect, useRef } from "react";
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface StationCardEditInfoProps {
  amphure?: string;
  province?: string;
}

export const StationCardEditInfo = ({ 
  amphure, 
  province
}: StationCardEditInfoProps) => {
  const { data: monitoringData, isLoading: isLoadingMonitoring, error: monitoringError } = useMonitoringStations(amphure, province);
  const { data: rainData, isLoading: isLoadingRain, error: rainError } = useRainStations(amphure, province);
  const { data: reservoirData, isLoading: isLoadingReservoir, error: reservoirError } = useReservoirs(amphure, province);
  const cardCreationCount = useRef(0);

  // Log when component mounts and when location changes
  useEffect(() => {
    console.info("[StationCardEditInfo] Component initialized", {
      amphure,
      province,
      timestamp: new Date().toISOString()
    });
    // Reset card creation counter on location change
    cardCreationCount.current = 0;
  }, [amphure, province]);

  // Log when data changes
  useEffect(() => {
    if (monitoringData) {
      console.info("[StationCardEditInfo] 📊 Monitoring stations data received", {
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
      console.info("[StationCardEditInfo] 🌧️ Rain stations data received", {
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
      console.info("[StationCardEditInfo] 💧 Reservoir data received", {
        totalReservoirs: reservoirData.total,
        location: {
          amphure,
          province,
          queryType: amphure ? 'amphure' : province ? 'province' : 'none'
        },
        timestamp: new Date().toISOString()
      });
    }
    // Reset card creation counter when new data arrives
    cardCreationCount.current = 0;
  }, [monitoringData, rainData, reservoirData, amphure, province]);

  // Function to log card creation
  const logCardCreation = (item: any, index: number, total: number, type: 'monitoring' | 'rain' | 'reservoir') => {
    cardCreationCount.current++;
    console.info(`[StationCardEditInfo] 🔄 Creating ${type} ${type === 'reservoir' ? 'card' : 'station card'} ${index + 1}/${total}`, {
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
        console.info("[StationCardEditInfo] 📋 Final card creation count", {
          createdCards: cardCreationCount.current,
          expectedTotalMonitoring: monitoringData?.total || 0,
          expectedTotalRain: rainData?.total || 0,
          expectedTotalReservoir: reservoirData?.total || 0,
          location: {
            amphure,
            province
          },
          timestamp: new Date().toISOString()
        });
      }
    };
  }, [monitoringData?.total, rainData?.total, reservoirData?.total, amphure, province]);

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
              className="bg-[#42A5F5] text-white hover:bg-[#1E88E5] h-10 px-4 text-base flex items-center"
              onClick={() => handleAddData("สถานีเฝ้าระวัง")}
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

          {monitoringError && (
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

          {!isLoadingMonitoring && !monitoringError && (monitoringData?.stations ?? []).length === 0 && (
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

          {!isLoadingMonitoring && !monitoringError && (monitoringData?.stations ?? []).length > 0 && (
            <div className={contentBoxStyle}>
              <div className={contentTextStyle}>
                <div className="space-y-8">
                  {(monitoringData?.stations ?? []).map((station, index) => {
                    logCardCreation(station, index, monitoringData?.total ?? 0, 'monitoring');
                    return (
                      <MonitoringStationCard 
                        key={station.id} 
                        station={station} 
                        isLoading={isLoadingMonitoring}
                        error={monitoringError}
                        showButtons={true}
                        onDeleteData={() => handleDeleteData(`สถานีเฝ้าระวัง ${station.station_name}`)}
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
              className="bg-[#42A5F5] text-white hover:bg-[#1E88E5] h-10 px-4 text-base flex items-center"
              onClick={() => handleAddData("สถานีน้ำฝน")}
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

          {rainError && (
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

          {!isLoadingRain && !rainError && (rainData?.stations ?? []).length === 0 && (
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

          {!isLoadingRain && !rainError && (rainData?.stations ?? []).length > 0 && (
            <div className={contentBoxStyle}>
              <div className={contentTextStyle}>
                <div className="space-y-8">
                  {(rainData?.stations ?? []).map((station, index) => {
                    logCardCreation(station, index, rainData?.total ?? 0, 'rain');
                    return (
                      <RainStationCard 
                        key={station.id} 
                        station={station}
                        showButtons={true}
                        onDeleteData={() => handleDeleteData(`สถานีน้ำฝน ${station.station_name}`)}
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
              className="bg-[#42A5F5] text-white hover:bg-[#1E88E5] h-10 px-4 text-base flex items-center"
              onClick={() => handleAddData("เขื่อน/อ่างเก็บน้ำ")}
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

          {reservoirError && (
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

          {!isLoadingReservoir && !reservoirError && (reservoirData?.reservoirs ?? []).length === 0 && (
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

          {!isLoadingReservoir && !reservoirError && (reservoirData?.reservoirs ?? []).length > 0 && (
            <div className={contentBoxStyle}>
              <div className={contentTextStyle}>
                <div className="space-y-8">
                  {(reservoirData?.reservoirs ?? []).map((reservoir, index) => {
                    logCardCreation(reservoir, index, reservoirData?.total ?? 0, 'reservoir');
                    return (
                      <ReservoirCard 
                        key={reservoir.id} 
                        reservoir={reservoir}
                        showButtons={true}
                        onDeleteData={() => handleDeleteData(`เขื่อน/อ่างเก็บน้ำ ${reservoir.reservoir_name}`)}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          
          {/* Save Button below Reservoir Frame */}
          <div className="flex justify-center mt-6">
            <Button 
              onClick={handleSave}
              className="bg-[#42A5F5] text-white hover:bg-[#1E88E5] h-12 px-8 text-base font-medium rounded-md flex items-center"
            >
              <Save className="h-5 w-5 mr-2" />
              บันทึก
            </Button>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}; 