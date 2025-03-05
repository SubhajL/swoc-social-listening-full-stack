import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, InfoIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MonitoringStationCard } from "@/components/monitoring/MonitoringStationCard";
import { RainStationCard } from "@/components/monitoring/RainStationCard";
import { ReservoirCard } from "@/components/monitoring/ReservoirCard";
import { MonitoringStation } from "@/types/monitoring-station";
import { RainStation } from "@/types/rain-station";
import { Reservoir } from "@/types/reservoir";
import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cleanLocationString, formatLocationForDisplay } from "@/lib/location-utils";
import { useStationData } from "@/atoms/hooks";

interface WaterLevelInfoCardProps {
  amphure?: string;
  province?: string;
  showButtons?: boolean;
  returnedFromStationEdit?: boolean;
  className?: string;
  title?: string;
  onAddStation?: (type: string) => void;
  onDeleteStation?: (type: string) => void;
  onSave?: () => void;
  isLoadingMonitoring?: boolean;
  isLoadingRain?: boolean;
  isLoadingReservoir?: boolean;
  monitoringError?: any;
  rainError?: any;
  reservoirError?: any;
}

export const WaterLevelInfoCard = ({ 
  amphure, 
  province, 
  showButtons = false,
  returnedFromStationEdit = false,
  className = "",
  title = "ข้อมูลสนับสนุน",
  onAddStation,
  onDeleteStation,
  onSave,
  isLoadingMonitoring = false,
  isLoadingRain = false,
  isLoadingReservoir = false,
  monitoringError = null,
  rainError = null,
  reservoirError = null
}: WaterLevelInfoCardProps) => {
  // Clean location strings for display
  const cleanedAmphure = cleanLocationString(amphure);
  const cleanedProvince = cleanLocationString(province);
  
  // Format location for display
  const displayAmphure = amphure ? formatLocationForDisplay(amphure, 'amphure') : undefined;
  const displayProvince = province ? formatLocationForDisplay(province, 'province') : undefined;
  
  // Get station data from Jotai
  const {
    monitoringStations,
    rainStations,
    reservoirs,
    userSelectedMonitoringStations,
    userSelectedRainStations,
    userSelectedReservoirs
  } = useStationData();
  
  // Determine which stations to display - prioritize user selected stations
  const monitoringStationsToDisplay = userSelectedMonitoringStations.length > 0 
    ? userSelectedMonitoringStations 
    : monitoringStations;
  
  const rainStationsToDisplay = userSelectedRainStations.length > 0 
    ? userSelectedRainStations 
    : rainStations;
  
  const reservoirsToDisplay = userSelectedReservoirs.length > 0 
    ? userSelectedReservoirs 
    : reservoirs;
  
  const cardCreationCount = useRef(0);
  
  // Handle adding station data
  const handleAddData = (type: string) => {
    if (onAddStation) {
      onAddStation(type);
    }
  };
  
  // Handle deleting station data
  const handleDeleteData = (type: string) => {
    if (onDeleteStation) {
      onDeleteStation(type);
    }
  };
  
  // Handle saving station data
  const handleSave = () => {
    if (onSave) {
      onSave();
    }
  };

  return (
    <ErrorBoundary component="WaterLevelInfoCard">
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
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
            
            {/* Save Button */}
            {showButtons && (
              <div className="flex justify-end">
                <Button 
                  variant="default" 
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleSave}
                >
                  บันทึกข้อมูล
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </ErrorBoundary>
  );
};

export default WaterLevelInfoCard; 