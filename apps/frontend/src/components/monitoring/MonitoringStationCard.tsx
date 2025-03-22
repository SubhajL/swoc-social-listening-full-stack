import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MonitoringStation } from "@/types/monitoring-station";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Info, AlertCircle, Plus, Trash2, UserCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import React, { useMemo } from "react";

// Extended MonitoringStation interface with additional properties
interface ExtendedMonitoringStation {
  id: string;
  station_id?: string;
  station_name?: string;
  name?: string;
  water_level?: number;
  flow_rate?: number;
  telemetry_data?: {
    water_level: number;
    flow_rate: number;
    timestamp: string;
    notation?: string;
  };
  source?: 'system' | 'user';
  status?: string;
  location?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

interface MonitoringStationCardProps {
  station: ExtendedMonitoringStation;
  isLoading?: boolean;
  error?: Error | null;
  showButtons?: boolean;
  disabled?: boolean;
  isUserSelected?: boolean;
  useCompactLayout?: boolean;
  hideUnitLabels?: boolean;
  onAddData?: () => void;
  onDeleteData?: () => void;
  onToggleDisabled?: () => void;
}

const MonitoringStationCardComponent = ({ 
  station, 
  isLoading = false,
  error = null,
  showButtons = false,
  disabled = false,
  isUserSelected = false,
  useCompactLayout = false,
  hideUnitLabels = false,
  onAddData,
  onDeleteData,
  onToggleDisabled
}: MonitoringStationCardProps) => {
  // Common content box styles
  const contentBoxStyle = useMemo(() => `w-full border border-[#E2E8F0] rounded-xl p-2 bg-white text-[#17254D] text-sm font-normal ${disabled ? 'opacity-60' : ''}`, [disabled]);
  const contentTextStyle = "px-1.5"; // Reduced horizontal padding for more space
  const labelStyle = useMemo(() => `text-[#64748B] font-medium text-base absolute -top-3.5 left-3 bg-card px-3 py-0.5 z-10 ${disabled ? 'opacity-60' : ''}`, [disabled]);

  // Use fallback values if telemetry_data is missing
  const { waterLevel, flowRate, hasRealTimeData } = useMemo(() => {
    const waterLevel = station.telemetry_data?.water_level ?? station.water_level ?? 0;
    const flowRate = station.telemetry_data?.flow_rate ?? station.flow_rate ?? 0;
    const hasRealTimeData = !!station.telemetry_data;
    return { waterLevel, flowRate, hasRealTimeData };
  }, [station.telemetry_data, station.water_level, station.flow_rate]);

  // Debug logging - commented out to reduce console noise
  /* 
  console.log('MonitoringStationCard Debug:', {
    id: station.id,
    idType: typeof station.id,
    stationId: station.station_id,
    stationIdType: typeof station.station_id,
    stationName: station.station_name,
    displayedStationId: station.station_id, // The ID that will be displayed
    telemetryData: station.telemetry_data,
    hasRealTimeData,
    waterLevel,
    flowRate,
    disabled,
    isUserSelected,
    useCompactLayout,
    hideUnitLabels
  });
  */

  const renderTelemetryInfo = (type: 'water_level' | 'flow_rate') => {
    if (!station.telemetry_data) return null;

    return (
      <HoverCard>
        <HoverCardTrigger asChild>
          <button 
            type="button" 
            className="inline-flex items-center justify-center w-6 h-6 ml-1 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={disabled}
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
    <div className="flex flex-col relative mt-6 mx-auto max-w-full w-full px-1.5">
      <Label className={labelStyle}>
        {(isUserSelected || station.source === 'user') && (
          <UserCircle className="inline-block h-5 w-5 mr-1 text-blue-500" />
        )}
        {station.station_name || station.name || "สถานีตรวจวัด"}
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
                    <div className="text-[#17254D] text-sm font-normal mb-1">ระดับน้ำ</div>
                    {!useCompactLayout && (
                      <div className="text-[#64748B] text-xs font-normal mb-2">หน่วย: ม.รทก.</div>
                    )}
                    <div className="flex items-center whitespace-nowrap overflow-hidden">
                      <span className="text-[#17254D] text-sm font-normal mr-2 flex-shrink-0">ปัจจุบัน</span>
                      <div className="flex items-center flex-shrink-0">
                        <Input 
                          value={waterLevel !== undefined && waterLevel !== null ? waterLevel.toFixed(2) : ''} 
                          readOnly 
                          disabled={disabled}
                          className="w-[70px] h-8 text-right"
                        />
                        {!hideUnitLabels && (
                          <span className="text-sm whitespace-nowrap ml-1">ม.รทก.</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-[#17254D] text-sm font-normal mb-1">อัตราการไหล</div>
                    {!useCompactLayout && (
                      <div className="text-[#64748B] text-xs font-normal mb-2">หน่วย: ลบ.ม./วินาที</div>
                    )}
                    <div className="flex items-center whitespace-nowrap overflow-hidden">
                      <span className="text-[#17254D] text-sm font-normal mr-2 flex-shrink-0">ปัจจุบัน</span>
                      <div className="flex items-center flex-shrink-0">
                        <Input 
                          value={flowRate !== undefined && flowRate !== null ? flowRate.toFixed(2) : ''} 
                          readOnly 
                          disabled={disabled}
                          className="w-[70px] h-8 text-right"
                        />
                        {!hideUnitLabels && (
                          <span className="text-sm whitespace-nowrap ml-1">ลบ.ม./วินาที</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {showButtons && (
            <div className="flex-shrink-0 flex space-x-2 ml-4">
              {disabled ? (
                <Button
                  className="bg-[#42A5F5] text-white hover:bg-[#1E88E5] h-8 px-3 text-sm flex items-center justify-center rounded-xl whitespace-nowrap"
                  onClick={() => {
                    console.log('[MonitoringStationCard] Enable button clicked for station:', station.id);
                    console.log('[MonitoringStationCard] Station source:', station.source);
                    console.log('[MonitoringStationCard] Is disabled (from props):', disabled);
                    console.log('[MonitoringStationCard] Is user selected (from props):', isUserSelected);
                    
                    if (onToggleDisabled) {
                      console.log('[MonitoringStationCard] Calling onToggleDisabled');
                      onToggleDisabled();
                    } else {
                      console.warn('[MonitoringStationCard] onToggleDisabled is not defined');
                    }
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  เพิ่มข้อมูล
                </Button>
              ) : (
                <Button
                  className="bg-[#EF5350] text-white hover:bg-[#E53935] h-8 px-3 text-sm flex items-center justify-center rounded-xl whitespace-nowrap"
                  onClick={() => {
                    console.log('[MonitoringStationCard] Delete button clicked for station:', station.id);
                    console.log('[MonitoringStationCard] Station source:', station.source);
                    console.log('[MonitoringStationCard] Is disabled (from props):', disabled);
                    console.log('[MonitoringStationCard] Is user selected (from props):', isUserSelected);
                    
                    // First check if this is explicitly marked as user-selected via props
                    // This is the most reliable indicator
                    if (isUserSelected) {
                      console.log('[MonitoringStationCard] This is a user-selected station (from props), calling onDeleteData');
                      if (onDeleteData) {
                        console.log('[MonitoringStationCard] Calling onDeleteData');
                        onDeleteData();
                      } else {
                        console.warn('[MonitoringStationCard] onDeleteData is not defined');
                      }
                    } 
                    // Only fall back to source check if isUserSelected is false
                    else if (station.source === 'user') {
                      console.log('[MonitoringStationCard] This is a user-selected station (from source), calling onDeleteData');
                      if (onDeleteData) {
                        console.log('[MonitoringStationCard] Calling onDeleteData');
                        onDeleteData();
                      } else {
                        console.warn('[MonitoringStationCard] onDeleteData is not defined');
                      }
                    }
                    // If neither isUserSelected nor source indicates this is a user-selected station
                    else {
                      console.log('[MonitoringStationCard] This is a system station, calling onToggleDisabled');
                      if (onToggleDisabled) {
                        console.log('[MonitoringStationCard] Calling onToggleDisabled');
                        onToggleDisabled();
                      } else {
                        console.warn('[MonitoringStationCard] onToggleDisabled is not defined');
                      }
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  ลบข้อมูล
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Properly define the memoized component with explicit type
export const MonitoringStationCard: React.FC<MonitoringStationCardProps> = React.memo(MonitoringStationCardComponent); 