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
import { useEffect, useRef } from "react";

interface WaterLevelInfoProps {
  amphure?: string;
  province?: string;
}

export const WaterLevelInfo = ({ amphure, province }: WaterLevelInfoProps) => {
  const { data: monitoringData, isLoading: isLoadingMonitoring, error: monitoringError } = useMonitoringStations(amphure, province);
  const { data: rainData, isLoading: isLoadingRain, error: rainError } = useRainStations(amphure, province);
  const { data: reservoirData, isLoading: isLoadingReservoir, error: reservoirError } = useReservoirs(amphure, province);
  const cardCreationCount = useRef(0);

  // Log when component mounts and when location changes
  useEffect(() => {
    console.info("[WaterLevelInfo] Component initialized", {
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
    // Reset card creation counter when new data arrives
    cardCreationCount.current = 0;
  }, [monitoringData, rainData, reservoirData, amphure, province]);

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
        console.info("[WaterLevelInfo] 📋 Final card creation count", {
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

  // Early return if no location data
  if (!amphure && !province) {
    console.info("[WaterLevelInfo] ⚠️ No location data provided", {
      timestamp: new Date().toISOString()
    });
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-lg">ข้อมูลสนับสนุน</h2>
        </div>
        <Alert>
          <AlertDescription>
            ไม่พบข้อมูลพื้นที่สำหรับค้นหาสถานี
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Info className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-lg">ข้อมูลสนับสนุน</h2>
      </div>

      {/* Monitoring Stations Section */}
      <div className="space-y-4">
        <h3 className="font-medium">
          สถานีเฝ้าระวัง {amphure && `ใน${amphure}`}
          {!amphure && province && `ใน${province}`}
        </h3>
        
        {isLoadingMonitoring && (
          <div className="space-y-4">
            <Skeleton className="h-[300px] w-full" />
            <Skeleton className="h-[300px] w-full" />
          </div>
        )}

        {monitoringError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              ไม่สามารถโหลดข้อมูลสถานีเฝ้าระวังได้
            </AlertDescription>
          </Alert>
        )}

        {monitoringData?.stations.length === 0 && (
          <Alert>
            <AlertDescription>
              ไม่พบสถานีเฝ้าระวังในพื้นที่นี้
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {monitoringData?.stations.map((station, index) => {
            logCardCreation(station, index, monitoringData.total, 'monitoring');
            return (
              <MonitoringStationCard 
                key={station.id} 
                station={station} 
              />
            );
          })}
        </div>
      </div>

      {/* Rain Stations Section */}
      <div className="space-y-4">
        <h3 className="font-medium">
          สถานีน้ำฝน {amphure && `ใน${amphure}`}
          {!amphure && province && `ใน${province}`}
        </h3>
        
        {isLoadingRain && (
          <div className="space-y-4">
            <Skeleton className="h-[300px] w-full" />
            <Skeleton className="h-[300px] w-full" />
          </div>
        )}

        {rainError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              ไม่สามารถโหลดข้อมูลสถานีน้ำฝนได้
            </AlertDescription>
          </Alert>
        )}

        {rainData?.stations.length === 0 && (
          <Alert>
            <AlertDescription>
              ไม่พบสถานีน้ำฝนในพื้นที่นี้
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {rainData?.stations.map((station, index) => {
            logCardCreation(station, index, rainData.total, 'rain');
            return (
              <RainStationCard 
                key={station.id} 
                station={station} 
              />
            );
          })}
        </div>
      </div>

      {/* Reservoirs Section */}
      <div className="space-y-4">
        <h3 className="font-medium">
          เขื่อน/อ่างเก็บน้ำ {amphure && `ใน${amphure}`}
          {!amphure && province && `ใน${province}`}
        </h3>
        
        {isLoadingReservoir && (
          <div className="space-y-4">
            <Skeleton className="h-[300px] w-full" />
            <Skeleton className="h-[300px] w-full" />
          </div>
        )}

        {reservoirError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              ไม่สามารถโหลดข้อมูลเขื่อน/อ่างเก็บน้ำได้
            </AlertDescription>
          </Alert>
        )}

        {reservoirData?.reservoirs.length === 0 && (
          <Alert>
            <AlertDescription>
              ไม่พบเขื่อน/อ่างเก็บน้ำในพื้นที่นี้
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {reservoirData?.reservoirs.map((reservoir, index) => {
            logCardCreation(reservoir, index, reservoirData.total, 'reservoir');
            return (
              <ReservoirCard 
                key={reservoir.id} 
                reservoir={reservoir} 
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};