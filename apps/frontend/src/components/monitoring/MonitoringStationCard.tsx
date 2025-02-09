import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MonitoringStation } from "@/types/monitoring-station";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Info, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

interface MonitoringStationCardProps {
  station: MonitoringStation;
  isLoading?: boolean;
  error?: Error | null;
}

export const MonitoringStationCard = ({ 
  station, 
  isLoading = false,
  error = null 
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
      <Card className="w-full">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-3/4" />
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-8 w-[100px]" />
              <Skeleton className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-8 w-[100px]" />
              <Skeleton className="h-4 w-4" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {station.station_name}
            {station.station_id && (
              <span className="text-sm text-gray-500 ml-2">
                (ID: {station.station_id})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              ไม่สามารถโหลดข้อมูลจากสถานีตรวจวัดได้
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {station.station_name}
          {station.station_id && (
            <span className="text-sm text-gray-500 ml-2">
              (ID: {station.station_id})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2">
            <Label>ระดับน้ำ</Label>
            <Input 
              value={waterLevel?.toFixed(2) ?? ''} 
              readOnly 
              className={`max-w-[100px] h-8 ${hasRealTimeData ? 'border-primary' : ''}`}
              data-testid="water-level-input"
            />
            <span className="text-sm">ม.</span>
            {hasRealTimeData && (
              <div data-testid="water-level-hover-trigger">
                {renderTelemetryInfo('water_level')}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Label>อัตราไหลน้ำ</Label>
            <Input 
              value={flowRate?.toFixed(2) ?? ''} 
              readOnly 
              className={`max-w-[100px] h-8 ${hasRealTimeData ? 'border-primary' : ''}`}
            />
            <span className="text-sm">ลบ.ม./วิ</span>
            {hasRealTimeData && renderTelemetryInfo('flow_rate')}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 