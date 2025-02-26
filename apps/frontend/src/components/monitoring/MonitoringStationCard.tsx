import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MonitoringStation } from "@/types/monitoring-station";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Info, AlertCircle, Plus, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface MonitoringStationCardProps {
  station: MonitoringStation;
  isLoading?: boolean;
  error?: Error | null;
  showButtons?: boolean;
  onAddData?: () => void;
  onDeleteData?: () => void;
}

export const MonitoringStationCard = ({ 
  station, 
  isLoading = false,
  error = null,
  showButtons = false,
  onAddData,
  onDeleteData
}: MonitoringStationCardProps) => {
  const waterLevel = station.telemetry_data?.water_level ?? station.water_level;
  const flowRate = station.telemetry_data?.flow_rate ?? station.flow_rate;
  const hasRealTimeData = !!station.telemetry_data;

  // Debug logging
  console.log('MonitoringStationCard Debug:', {
    stationId: station.station_id,
    telemetryData: station.telemetry_data,
    hasRealTimeData,
    waterLevel,
    flowRate
  });

  // Common content box styles (matching WaterLevelInfo)
  const contentBoxStyle = "w-full border border-[#E2E8F0] rounded-md p-3 bg-white text-[#17254D] text-sm font-normal";
  const contentTextStyle = "px-3"; // Consistent horizontal padding for balanced layout
  const labelStyle = "text-[#64748B] font-medium text-base absolute -top-4 left-3 bg-white px-2 z-10";

  const renderTelemetryInfo = (type: 'water_level' | 'flow_rate') => {
    if (!station.telemetry_data) return null;

    return (
      <HoverCard>
        <HoverCardTrigger asChild>
          <button 
            type="button" 
            className="inline-flex items-center justify-center w-6 h-6 ml-1 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <Info className="w-4 h-4 text-primary" />
          </button>
        </HoverCardTrigger>
        <HoverCardContent className="w-80 p-4 bg-white border rounded-lg shadow-lg">
          <div className="space-y-2">
            <h4 className="font-medium">ข้อมูลจริงจากสถานีตรวจวัด</h4>
            <div className="text-sm space-y-1">
              <p className="text-gray-600">
                <span className="font-medium">ค่าที่วัดได้:</span>{' '}
                {type === 'water_level' ? waterLevel?.toFixed(2) + ' ม.' : flowRate?.toFixed(2) + ' ลบ.ม./วิ'}
              </p>
              <p className="text-gray-600">
                <span className="font-medium">อัพเดทล่าสุด:</span>{' '}
                {new Date(station.telemetry_data.timestamp).toLocaleString('th-TH')}
              </p>
              {station.telemetry_data.notation && (
                <p className="text-gray-600">
                  <span className="font-medium">หมายเหตุ:</span>{' '}
                  {station.telemetry_data.notation}
                </p>
              )}
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col relative mt-6 mx-auto max-w-full w-full px-3">
        <Label className={labelStyle}>
          <Skeleton className="h-6 w-32" />
        </Label>
        <div className={contentBoxStyle}>
          <div className={contentTextStyle}>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center whitespace-nowrap overflow-hidden">
                <Skeleton className="h-4 w-16 mr-2 flex-shrink-0" />
                <div className="flex items-center ml-auto flex-shrink-0">
                  <Skeleton className="h-8 w-[70px]" />
                  <Skeleton className="h-4 w-4 ml-1" />
                  <Skeleton className="h-4 w-4 ml-1" />
                </div>
              </div>
              <div className="flex items-center whitespace-nowrap overflow-hidden">
                <Skeleton className="h-4 w-16 mr-2 flex-shrink-0" />
                <div className="flex items-center ml-auto flex-shrink-0">
                  <Skeleton className="h-8 w-[70px]" />
                  <Skeleton className="h-4 w-4 ml-1" />
                  <Skeleton className="h-4 w-4 ml-1" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col relative mt-6 mx-auto max-w-full w-full px-3">
        <Label className={labelStyle}>
          {station.station_name}
          {station.station_id && (
            <span className="text-sm text-gray-500 ml-2">
              (ID: {station.station_id})
            </span>
          )}
        </Label>
        <div className={contentBoxStyle}>
          <div className={contentTextStyle}>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                ไม่สามารถโหลดข้อมูลจากสถานีตรวจวัดได้
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col relative mt-6 mx-auto max-w-full w-full px-3">
      <Label className={labelStyle}>
        {station.station_name}
        {station.station_id && (
          <span className="text-sm text-gray-500 ml-2">
            (ID: {station.station_id})
          </span>
        )}
      </Label>
      
      <div className={contentBoxStyle}>
        <div className="flex justify-between items-center">
          <div className="flex-grow">
            <div className={contentTextStyle}>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[#17254D] text-sm font-normal mb-2">ระดับน้ำ</div>
                    <div className="flex items-center whitespace-nowrap overflow-hidden">
                      <span className="text-[#17254D] text-sm font-normal mr-2 flex-shrink-0">ปัจจุบัน</span>
                      <div className="flex items-center flex-shrink-0">
                        <Input 
                          value={waterLevel !== undefined && waterLevel !== null ? waterLevel.toFixed(2) : ''} 
                          readOnly 
                          className="w-[70px] h-8 text-right"
                        />
                        <span className="text-sm whitespace-nowrap ml-1">ม.รทก.</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-[#17254D] text-sm font-normal mb-2">อัตราการไหล</div>
                    <div className="flex items-center whitespace-nowrap overflow-hidden">
                      <span className="text-[#17254D] text-sm font-normal mr-2 flex-shrink-0">ปัจจุบัน</span>
                      <div className="flex items-center flex-shrink-0">
                        <Input 
                          value={flowRate !== undefined && flowRate !== null ? flowRate.toFixed(2) : ''} 
                          readOnly 
                          className="w-[70px] h-8 text-right"
                        />
                        <span className="text-sm whitespace-nowrap ml-1">ลบ.ม./วินาที</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {showButtons && (
            <div className="flex space-x-2 ml-4">
              <Button
                className="bg-[#EF5350] text-white hover:bg-[#E53935] h-10 px-4 text-base flex items-center"
                onClick={onDeleteData}
              >
                <Trash2 className="h-5 w-5 mr-2" />
                ลบข้อมูล
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 