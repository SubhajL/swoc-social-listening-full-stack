import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { RainStation } from "@/types/rain-station";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useThaiWaterData } from "@/hooks/useThaiWaterData";
import { useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, UserCircle } from "lucide-react";

interface RainStationCardProps {
  station: RainStation;
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
  '7013': 494       // อุตุสนามบิน
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
      mappedId: station.station_id ? STATION_ID_MAP[station.station_id] : undefined,
      stationName: station.station_name,
      code: station.code,
      disabled,
      isUserSelected
    });

    console.log('[RainStationCard] ThaiWater Data:', {
      isLoading,
      hasData: !!thaiWaterData,
      success: thaiWaterData?.success,
      dataCount: thaiWaterData?.data?.length,
      error: error?.message
    });
  }, [station, thaiWaterData, isLoading, error, disabled, isUserSelected]);

  const stationData = useMemo(() => {
    if (!thaiWaterData?.success || !station.station_id) return null;
    
    // Get the mapped tele_station_id for our station
    const mappedStationId = STATION_ID_MAP[station.station_id];
    if (!mappedStationId) {
      console.warn('[RainStationCard] No mapping found for station:', station.station_id);
      return null;
    }
    
    // Find the station data in the ThaiWater response
    return thaiWaterData.data?.find(item => 
      item.tele_station_id === mappedStationId
    );
  }, [thaiWaterData, station.station_id]);

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
