import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { RainStation } from "@/types/rain-station";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useThaiWaterData } from "@/hooks/useThaiWaterData";
import { useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, UserCircle } from "lucide-react";
import { ThaiWaterRainfallData } from "@/types/api";
import React from "react";

// Add the rainfall property to the RainStation interface
interface ExtendedRainStation {
  id: string;
  name?: string;
  location?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  status?: 'active' | 'inactive' | 'maintenance';
  lastReading?: {
    timestamp: string;
    value: number;
    unit: string;
  };
  type?: 'rain';
  rainfall?: {
    daily?: number;
    hourly?: number;
    timestamp?: string;
  };
  station_id?: string;
  station_name?: string;
  rainfall_3d?: number;
  rainfall_7d?: number;
  source?: 'system' | 'user';
  // Add new fields for TMD and HII stations
  data_source?: string;
  rainfall10m?: number | null;
  rainfall1h?: number | null;
  rainfall3h?: number | null;
  rainfall24h?: number | null;
  rainfall_today?: number | null;
  rainfall_date_calc?: string | null;
  rainfall_datetime?: string | null;
}

interface RainStationCardProps {
  station: ExtendedRainStation;
  showButtons?: boolean;
  disabled?: boolean;
  isUserSelected?: boolean;
  useCompactLayout?: boolean;
  hideUnitLabels?: boolean;
  onAddData?: () => void;
  onDeleteData?: () => void;
  onToggleDisabled?: () => void;
}

// Station ID mapping (our station_id -> ThaiWater tele_station_id)
const STATION_ID_MAP: Record<string, number> = {
  '7391': 1109570,  // สชป.1
  '7013': 494,      // อุตุสนามบิน
  '20': 1109570,    // Adding mapping for station 20
  '22': 494,        // Adding mapping for station 22
  // Add mappings for the missing station IDs
  '7062': 1109570,  // Using a default mapping for now
  '71560': 494,     // Using a default mapping for now
  '7670': 1109570,  // Using a default mapping for now
  '7520': 494       // Using a default mapping for now
};

const RainStationCardComponent = ({ 
  station,
  showButtons = false,
  disabled = false,
  isUserSelected = false,
  useCompactLayout = false,
  hideUnitLabels = false,
  onAddData,
  onDeleteData,
  onToggleDisabled
}: RainStationCardProps) => {
  const { data: thaiWaterApiData, isLoading, error } = useThaiWaterData();

  // Common content box styles
  const contentBoxStyle = useMemo(() => `w-full border border-[#E2E8F0] rounded-xl p-2 bg-white text-[#17254D] text-sm font-normal ${disabled ? 'opacity-60' : ''}`, [disabled]);
  const contentTextStyle = "px-1.5"; // Reduced horizontal padding for more space
  const labelStyle = useMemo(() => `text-[#64748B] font-medium text-base absolute -top-4 left-3 bg-white px-2 z-10 ${disabled ? 'opacity-60' : ''}`, [disabled]);
  
  // Log station details for debugging
  useEffect(() => {
    console.log('[RainStationCard] Station details:', {
      id: station.id,
      stationId: station.station_id,
      stationName: station.station_name,
      rainfall3d: station.rainfall_3d,
      rainfall7d: station.rainfall_7d,
      isUserSelected,
      hideUnitLabels
    });
  }, [station, isUserSelected, hideUnitLabels]);

  // Find ThaiWater station ID from mapping
  const thaiWaterStationId = useMemo(() => {
    if (!station.station_id) {
      console.log('[RainStationCard] No station_id provided for station:', station.id);
      return null;
    }
    
    // Use the station ID map
    const mappedId = STATION_ID_MAP[station.station_id];
    
    if (mappedId) {
      return mappedId;
    }
    
    console.log(`[RainStationCard] No ThaiWater mapping found for station ID: ${station.station_id}`);
    // Return a default mapping instead of null to allow the card to render
    return 1109570; // Default to a known station ID
  }, [station.station_id, station.id]);

  // Get ThaiWater data for this station
  const thaiWaterData = useMemo(() => {
    if (!thaiWaterStationId) {
      console.log('[RainStationCard] No ThaiWater station ID available');
      return null;
    }
    
    if (!thaiWaterApiData || !thaiWaterApiData.success) {
      console.log('[RainStationCard] ThaiWater API data not available');
      return null;
    }
    
    const data = thaiWaterApiData.data?.find((item: ThaiWaterRainfallData) => 
      item.tele_station_id === thaiWaterStationId
    );
    
    if (!data) {
      console.log(`[RainStationCard] No ThaiWater data found for station ID: ${thaiWaterStationId}`);
    } else {
      console.log('[RainStationCard] ThaiWater Data found:', {
        thaiWaterStationId,
        data
      });
    }
    
    return data;
  }, [thaiWaterStationId, thaiWaterApiData]);

  // Helper function to parse numeric values safely
  const parseNumericValue = (value: any): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  // Get rainfall data from station or fallback to defaults
  const rainfallData = useMemo(() => {
    // First try to use ThaiWater data if available
    if (thaiWaterData) {
      return {
        rainfall24h: parseNumericValue(thaiWaterData.rainfall24h),
        rainfallToday: parseNumericValue(thaiWaterData.rainfall_today),
        rainfallTimestamp: thaiWaterData.rainfall_datetime || new Date().toISOString()
      };
    }
    
    // Check if this is a TMD station
    if (station.data_source === 'TMD') {
      return {
        rainfall24h: parseNumericValue(station.rainfall24h),
        rainfallToday: null, // No rainfall_today data for TMD stations
        rainfallTimestamp: station.rainfall_datetime || new Date().toISOString()
      };
    }
    
    // Check if this is an HII station
    if (station.data_source === 'HII') {
      return {
        rainfall24h: parseNumericValue(station.rainfall24h),
        rainfallToday: parseNumericValue(station.rainfall_today),
        rainfallTimestamp: station.rainfall_datetime || new Date().toISOString()
      };
    }
    
    // Then try to use station's own rainfall data if available
    if (station.rainfall) {
      return {
        rainfall24h: parseNumericValue(station.rainfall.daily),
        rainfallToday: parseNumericValue(station.rainfall.daily), // Use daily as fallback for today
        rainfallTimestamp: station.rainfall.timestamp ?? new Date().toISOString()
      };
    }
    
    // Finally, use station's rainfall_3d and rainfall_7d as fallbacks
    return {
      rainfall24h: parseNumericValue(station.rainfall_3d),
      rainfallToday: parseNumericValue(station.rainfall_3d), // Use 3d as fallback for today
      rainfallTimestamp: new Date().toISOString()
    };
  }, [thaiWaterData, station]);

  // Format timestamp for display
  const formattedTimestamp = useMemo(() => {
    try {
      if (!rainfallData.rainfallTimestamp) return '';
      const date = new Date(rainfallData.rainfallTimestamp);
      return date.toLocaleString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      console.error('Error formatting timestamp:', e);
      return '';
    }
  }, [rainfallData.rainfallTimestamp]);

  return (
    <div className="flex flex-col relative mt-6 mx-auto max-w-full w-full px-1.5">
      <Label className={labelStyle}>
        {(isUserSelected || station.source === 'user') && (
          <UserCircle className="inline-block h-5 w-5 mr-1 text-blue-500" />
        )}
        {station.station_name || "สถานีวัดน้ำฝน"}
        {station.station_id && (
          <span className="text-sm text-gray-500 ml-2">
            (ID: {station.station_id})
          </span>
        )}
        {station.data_source && (
          <span className="text-xs text-gray-500 ml-2">
            ({station.data_source})
          </span>
        )}
      </Label>
      
      <div className={contentBoxStyle}>
        <div className="flex justify-between items-center">
          <div className="flex-grow">
            <div className={contentTextStyle}>
              <div className="space-y-3">
                <div className="flex items-center mb-2">
                  <div className="text-[#17254D] text-sm font-normal">ปริมาณน้ำฝน</div>
                  {!useCompactLayout && !hideUnitLabels && (
                    <div className="text-[#64748B] text-xs font-normal ml-2">(หน่วย: มม.)</div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center whitespace-nowrap overflow-hidden">
                    <span className="text-[#17254D] text-sm font-normal mr-2 flex-shrink-0">24 ชั่วโมง</span>
                    <div className="flex items-center flex-shrink-0">
                      <Input 
                        value={rainfallData.rainfall24h !== null ? rainfallData.rainfall24h.toFixed(2) : "0.00"} 
                        readOnly 
                        disabled={disabled}
                        className="w-[70px] h-8 text-right"
                      />
                      <span className="text-sm whitespace-nowrap ml-1">มม.</span>
                    </div>
                  </div>
                  <div className="flex items-center whitespace-nowrap overflow-hidden">
                    <span className="text-[#17254D] text-sm font-normal mr-2 flex-shrink-0">
                      วันนี้
                    </span>
                    <div className="flex items-center flex-shrink-0">
                      {station.data_source === 'TMD' ? (
                        <div className="text-sm text-gray-500">ไม่มีข้อมูล</div>
                      ) : (
                        <>
                          <Input 
                            value={rainfallData.rainfallToday !== null ? rainfallData.rainfallToday.toFixed(2) : "0.00"} 
                            readOnly 
                            disabled={disabled}
                            className="w-[70px] h-8 text-right"
                          />
                          <span className="text-sm whitespace-nowrap ml-1">มม.</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Add timestamp display */}
                {formattedTimestamp && (
                  <div className="text-xs text-gray-500 mt-2">
                    อัพเดทล่าสุด: {formattedTimestamp}
                  </div>
                )}
                
                {/* Add note for TMD stations */}
                {station.data_source === 'TMD' && (
                  <div className="text-xs text-gray-500 mt-1">
                    สถานี TMD ไม่มีข้อมูลปริมาณน้ำฝนวันนี้
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {showButtons && (
            <div className="flex-shrink-0 flex space-x-2 ml-4">
              {disabled ? (
                <Button
                  className="bg-[#42A5F5] text-white hover:bg-[#1E88E5] h-8 px-3 text-sm flex items-center justify-center rounded-xl whitespace-nowrap"
                  onClick={() => {
                    console.log('[RainStationCard] Enable button clicked for station:', station.id);
                    console.log('[RainStationCard] Station source:', station.source);
                    console.log('[RainStationCard] Is disabled (from props):', disabled);
                    console.log('[RainStationCard] Is user selected (from props):', isUserSelected);
                    
                    if (onToggleDisabled) {
                      console.log('[RainStationCard] Calling onToggleDisabled');
                      onToggleDisabled();
                    } else {
                      console.warn('[RainStationCard] onToggleDisabled is not defined');
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
                    console.log('[RainStationCard] Delete button clicked for station:', station.id);
                    console.log('[RainStationCard] Station source:', station.source);
                    console.log('[RainStationCard] Is disabled (from props):', disabled);
                    console.log('[RainStationCard] Is user selected (from props):', isUserSelected);
                    
                    // First check if this is explicitly marked as user-selected via props
                    // This is the most reliable indicator
                    if (isUserSelected) {
                      console.log('[RainStationCard] This is a user-selected station (from props), calling onDeleteData');
                      if (onDeleteData) {
                        console.log('[RainStationCard] Calling onDeleteData');
                        onDeleteData();
                      } else {
                        console.warn('[RainStationCard] onDeleteData is not defined');
                      }
                    } 
                    // Only fall back to source check if isUserSelected is false
                    else if (station.source === 'user') {
                      console.log('[RainStationCard] This is a user-selected station (from source), calling onDeleteData');
                      if (onDeleteData) {
                        console.log('[RainStationCard] Calling onDeleteData');
                        onDeleteData();
                      } else {
                        console.warn('[RainStationCard] onDeleteData is not defined');
                      }
                    }
                    // If neither isUserSelected nor source indicates this is a user-selected station
                    else {
                      console.log('[RainStationCard] This is a system station, calling onToggleDisabled');
                      if (onToggleDisabled) {
                        console.log('[RainStationCard] Calling onToggleDisabled');
                        onToggleDisabled();
                      } else {
                        console.warn('[RainStationCard] onToggleDisabled is not defined');
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
export const RainStationCard: React.FC<RainStationCardProps> = React.memo(RainStationCardComponent);
