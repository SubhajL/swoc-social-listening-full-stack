import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { RainStation } from "@/types/rain-station";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useThaiWaterData } from "@/hooks/useThaiWaterData";
import { useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, UserCircle } from "lucide-react";
import { ThaiWaterRainfallData } from "@/types/api";

// Add the rainfall property to the RainStation interface
interface ExtendedRainStation extends RainStation {
  rainfall?: {
    daily?: number;
    hourly?: number;
    timestamp?: string;
  };
}

interface RainStationCardProps {
  station: ExtendedRainStation;
  showButtons?: boolean;
  disabled?: boolean;
  isUserSelected?: boolean;
  onAddData?: () => void;
  onDeleteData?: () => void;
  onToggleDisabled?: () => void;
}

// Station ID mapping (our station_id -> ThaiWater tele_station_id)
const STATION_ID_MAP: Record<string, number> = {
  '7391': 1109570,  // สชป.1
  '7013': 494,      // อุตุสนามบิน
  '20': 1109570,    // Adding mapping for station 20
  '22': 494         // Adding mapping for station 22
};

export const RainStationCard = ({ 
  station,
  showButtons = false,
  disabled = false,
  isUserSelected = false,
  onAddData,
  onDeleteData,
  onToggleDisabled
}: RainStationCardProps) => {
  const { data: thaiWaterData, isLoading, error } = useThaiWaterData();

  // Common content box styles (matching WaterLevelInfo)
  const contentBoxStyle = `w-full border border-[#E2E8F0] rounded-xl p-3 bg-white text-[#17254D] text-sm font-normal ${disabled ? 'opacity-60' : ''}`;
  const contentTextStyle = "px-3"; // Consistent horizontal padding for balanced layout
  const labelStyle = `text-[#64748B] font-medium text-base absolute -top-4 left-3 bg-white px-2 z-10 ${disabled ? 'opacity-60' : ''}`;

  useEffect(() => {
    console.log('[RainStationCard] Station:', {
      stationId: station.station_id,
      originalStationId: station.station_id, // The original station_id from the database
      mappedId: station.station_id ? STATION_ID_MAP[station.station_id] : undefined,
      stationName: station.station_name,
      code: station.code,
      disabled,
      isUserSelected
    });
  }, [station, disabled, isUserSelected]);

  // Get ThaiWater data for this station if available
  const stationData = useMemo(() => {
    if (!station.station_id || !thaiWaterData || !thaiWaterData.success) return null;
    
    // Get the ThaiWater station ID from our mapping
    const thaiWaterStationId = STATION_ID_MAP[station.station_id];
    if (!thaiWaterStationId) {
      console.warn('[RainStationCard] No mapping found for station:', station.station_id);
      // Return default data instead of null
      return {
        tele_station_id: Number(station.station_id),
        rainfall_24h: station.rainfall_3d || 0,
        rainfall_today: station.rainfall_7d || 0,
        rainfall_yesterday: 0,
        rainfall_7day: 0,
        rainfall_month: 0,
        rainfall_year: 0,
        station_name: station.station_name || '',
        station_lat: 0,
        station_long: 0,
        agency_id: 0,
        agency_name: '',
        province_code: '',
        province_name: '',
        amphoe_code: '',
        amphoe_name: '',
        tumbon_code: '',
        tumbon_name: '',
        data_date: new Date().toISOString(),
        data_time: new Date().toISOString()
      };
    }
    
    // Find the station data in the ThaiWater response
    const data = thaiWaterData.data?.find((item: ThaiWaterRainfallData) => 
      item.tele_station_id === thaiWaterStationId
    );
    
    console.log('[RainStationCard] ThaiWater Data:', {
      thaiWaterStationId,
      found: !!data,
      data
    });
    
    return data;
  }, [station.station_id, thaiWaterData]);

  // Get rainfall data from station or fallback to defaults
  const dailyRainfall = station.rainfall?.daily ?? 0;
  const hourlyRainfall = station.rainfall?.hourly ?? 0;
  const rainfallTimestamp = station.rainfall?.timestamp ?? new Date().toISOString();

  return (
    <div className="flex flex-col relative mt-6 mx-auto max-w-full w-full px-3">
      <Label className={labelStyle}>
        {isUserSelected && (
          <UserCircle className="inline-block h-5 w-5 mr-1 text-blue-500" />
        )}
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
                <div className="text-[#17254D] text-sm font-normal mb-2">ปริมาณน้ำฝน</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center whitespace-nowrap overflow-hidden">
                    <span className="text-[#17254D] text-sm font-normal mr-2 flex-shrink-0">วันนี้</span>
                    <div className="flex items-center flex-shrink-0">
                      <Input 
                        value={station.rainfall_3d !== undefined && station.rainfall_3d !== null ? station.rainfall_3d.toFixed(2) : ''} 
                        readOnly 
                        disabled={disabled}
                        className="w-[70px] h-8 text-right"
                      />
                      <span className="text-sm whitespace-nowrap ml-1">มม.</span>
                    </div>
                  </div>
                  <div className="flex items-center whitespace-nowrap overflow-hidden">
                    <span className="text-[#17254D] text-sm font-normal mr-2 flex-shrink-0">เมื่อวาน</span>
                    <div className="flex items-center flex-shrink-0">
                      <Input 
                        value={station.rainfall_7d !== undefined && station.rainfall_7d !== null ? station.rainfall_7d.toFixed(2) : ''} 
                        readOnly 
                        disabled={disabled}
                        className="w-[70px] h-8 text-right"
                      />
                      <span className="text-sm whitespace-nowrap ml-1">มม.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {showButtons && (
            <div className="flex space-x-2 ml-4">
              {disabled ? (
                <Button
                  className="bg-[#42A5F5] text-white hover:bg-[#1E88E5] h-10 px-4 text-base flex items-center justify-center rounded-xl"
                  onClick={onToggleDisabled}
                >
                  <Plus className="h-5 w-5 mr-2" />
                  เพิ่มข้อมูล
                </Button>
              ) : (
                <Button
                  className="bg-[#EF5350] text-white hover:bg-[#E53935] h-10 px-4 text-base flex items-center justify-center rounded-xl"
                  onClick={isUserSelected ? onDeleteData : onToggleDisabled}
                >
                  <Trash2 className="h-5 w-5 mr-2" />
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
