import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MonitoringStation } from "@/types/monitoring-station";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Info, AlertCircle, Plus, Trash2, UserCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import React, { useMemo, useEffect } from "react";

// Extended MonitoringStation interface with additional properties
interface ExtendedMonitoringStation {
  id: string;
  station_id?: string;
  station_name?: string;
  name?: string;
  water_level?: number | null;
  flow_rate?: number | null;
  telemetry_data?: {
    water_level: number | null;
    flow_rate: number | null;
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

  // Calculate the displayed values - handle null/undefined cases properly
  const { waterLevel, flowRate, hasRealTimeData, lastUpdated } = useMemo(() => {
    // Default values
    let waterLevel: number | null = null;
    let flowRate: number | null = null;
    let lastUpdated: string | null = null;
    
    // First try to get data from telemetry_data object
    if (station.telemetry_data) {
      // Debug the telemetry data
      console.log(`[MonitoringStationCard] Telemetry data for station ${station.id}:`, {
        water_level: station.telemetry_data.water_level,
        flow_rate: station.telemetry_data.flow_rate,
        timestamp: station.telemetry_data.timestamp,
        raw: JSON.stringify(station.telemetry_data)
      });
      
      // Extract water level from telemetry_data if available and not null
      if (station.telemetry_data.water_level !== undefined && station.telemetry_data.water_level !== null) {
        // Convert to number if it's a string
        waterLevel = typeof station.telemetry_data.water_level === 'string' 
          ? parseFloat(station.telemetry_data.water_level) 
          : station.telemetry_data.water_level;
      }
      
      // Extract flow rate from telemetry_data if available and not null
      if (station.telemetry_data.flow_rate !== undefined && station.telemetry_data.flow_rate !== null) {
        // Convert to number if it's a string
        flowRate = typeof station.telemetry_data.flow_rate === 'string' 
          ? parseFloat(station.telemetry_data.flow_rate) 
          : station.telemetry_data.flow_rate;
      }
      
      lastUpdated = station.telemetry_data.timestamp || null;
    }
    
    // Fall back to direct properties if needed
    if (waterLevel === null && station.water_level !== undefined && station.water_level !== null) {
      // Handle both number and string values
      waterLevel = typeof station.water_level === 'string' 
        ? parseFloat(station.water_level) 
        : station.water_level;
      
      console.log(`[MonitoringStationCard] Using fallback water_level for station ${station.id}:`, waterLevel);
    }
    
    if (flowRate === null && station.flow_rate !== undefined && station.flow_rate !== null) {
      // Handle both number and string values
      flowRate = typeof station.flow_rate === 'string' 
        ? parseFloat(station.flow_rate) 
        : station.flow_rate;
      
      console.log(`[MonitoringStationCard] Using fallback flow_rate for station ${station.id}:`, flowRate);
    }
    
    // Determine if we actually have real-time data
    const hasRealTimeData = Boolean(
      (waterLevel !== null || flowRate !== null) && 
      lastUpdated
    );

    console.log('[MonitoringStationCard] Calculated display values:', {
      stationId: station.id,
      waterLevel,
      flowRate,
      hasRealTimeData,
      lastUpdated,
      source: hasRealTimeData ? 'telemetry' : 'fallback',
      timestamp: new Date().toISOString()
    });

    return { waterLevel, flowRate, hasRealTimeData, lastUpdated };
  }, [station]);

  // Debug logging for component updates
  useEffect(() => {
    console.log('[MonitoringStationCard] Component mounted/updated:', {
      stationId: station.id,
      stationName: station.station_name || station.name,
      amphure: (station as any).amphure,
      province: (station as any).province,
      isLoading,
      error: error?.message,
      disabled,
      isUserSelected,
      hasRealTimeData,
      waterLevel,
      flowRate,
      timestamp: new Date().toISOString(),
      props: JSON.stringify({
        showButtons,
        disabled,
        isUserSelected,
        useCompactLayout,
        hideUnitLabels
      })
    });
    
    return () => {
      console.log('[MonitoringStationCard] Component unmounted:', {
        stationId: station.id,
        stationName: station.station_name || station.name
      });
    };
  }, [station.id, station.station_name, station.name, isLoading, error, disabled, isUserSelected, hasRealTimeData, waterLevel, flowRate]);

  // Only show loading state if we're loading AND there's no error
  const showLoading = isLoading && !error;

  const renderTelemetryInfo = (type: 'water_level' | 'flow_rate') => {
    if (!hasRealTimeData || !station.telemetry_data?.timestamp) {
      return null;
    }

    console.log(`[MonitoringStationCard] Rendering telemetry info for ${type}:`, {
      stationId: station.id,
      value: type === 'water_level' ? waterLevel : flowRate,
      timestamp: station.telemetry_data.timestamp,
      notation: station.telemetry_data.notation
    });

    // Format the timestamp in a user-friendly way
    const formattedTimestamp = new Date(station.telemetry_data.timestamp).toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return (
      <HoverCard>
        <HoverCardTrigger className="cursor-help">
          <Info className="h-4 w-4 text-[#42A5F5] ml-1" />
        </HoverCardTrigger>
        <HoverCardContent>
          <div className="space-y-1">
            <div className="text-xs text-[#64748B]">
              <span className="font-medium">แหล่งข้อมูล:</span> API ตรวจวัดน้ำ
            </div>
            <div className="text-xs text-[#64748B]">
              <span className="font-medium">อัพเดทล่าสุด:</span> {formattedTimestamp}
            </div>
            {station.telemetry_data.notation && (
              <div className="text-xs text-[#64748B]">
                <span className="font-medium">หมายเหตุ:</span> {station.telemetry_data.notation}
              </div>
            )}
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  };

  if (showLoading) {
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
          {station.station_name || station.name || "สถานีตรวจวัด"}
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
                          value={waterLevel !== null ? waterLevel.toFixed(2) : '-'} 
                          readOnly 
                          disabled={disabled}
                          className="w-[70px] h-8 text-right"
                        />
                        {!hideUnitLabels && (
                          <span className="text-sm whitespace-nowrap ml-1">ม.รทก.</span>
                        )}
                        {renderTelemetryInfo('water_level')}
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
                          value={flowRate !== null ? flowRate.toFixed(2) : '-'} 
                          readOnly 
                          disabled={disabled}
                          className="w-[70px] h-8 text-right"
                        />
                        {!hideUnitLabels && (
                          <span className="text-sm whitespace-nowrap ml-1">ลบ.ม./วินาที</span>
                        )}
                        {renderTelemetryInfo('flow_rate')}
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