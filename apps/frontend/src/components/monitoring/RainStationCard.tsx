import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { RainStation } from "@/types/rain-station";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useThaiWaterData } from "@/hooks/useThaiWaterData";
import { useMemo, useEffect } from "react";
import { StationCardButtons } from "./StationCardButtons";
import { toast } from "sonner";

interface RainStationCardProps {
  station: RainStation;
  showButtons?: boolean;
}

// Station ID mapping (our station_id -> ThaiWater tele_station_id)
const STATION_ID_MAP: Record<string, number> = {
  '7391': 1109570,  // สชป.1
  '7013': 494       // อุตุสนามบิน
};

export const RainStationCard = ({ station, showButtons = false }: RainStationCardProps) => {
  const { data: thaiWaterData, isLoading, error } = useThaiWaterData();

  // Common content box styles (matching WaterLevelInfo)
  const contentBoxStyle = "w-full border border-[#E2E8F0] rounded-md p-3 bg-white text-[#17254D] text-sm font-normal";
  const contentTextStyle = "px-4"; // Reduced horizontal padding for more compact layout
  const labelStyle = "text-[#64748B] font-medium text-base absolute -top-4 left-3 bg-white px-2 z-10";

  const handleAddData = () => {
    console.log('Adding data for rain station:', station.station_id);
    toast.success(`เพิ่มข้อมูลสำหรับสถานีวัดน้ำฝน ${station.station_name}`);
  };

  const handleDeleteData = () => {
    console.log('Deleting data for rain station:', station.station_id);
    toast.success(`ลบข้อมูลสำหรับสถานีวัดน้ำฝน ${station.station_name}`);
  };

  useEffect(() => {
    console.log('[RainStationCard] Station:', {
      stationId: station.station_id,
      mappedId: station.station_id ? STATION_ID_MAP[station.station_id] : undefined,
      stationName: station.station_name,
      code: station.code
    });

    console.log('[RainStationCard] ThaiWater Data:', {
      isLoading,
      hasData: !!thaiWaterData,
      success: thaiWaterData?.success,
      dataCount: thaiWaterData?.data?.length,
      error: error?.message
    });
  }, [station, thaiWaterData, isLoading, error]);

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
    <div className="flex flex-col relative mt-6 mx-auto max-w-full w-full px-2">
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
          <div className="space-y-3">
            <div className="text-[#17254D] text-sm font-normal mb-2">ปริมาณน้ำฝน</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center whitespace-nowrap overflow-hidden">
                <span className="text-[#17254D] text-sm font-normal mr-2 flex-shrink-0">วันนี้</span>
                <div className="flex items-center flex-shrink-0">
                  <Input 
                    value={station.rainfall_3d ?? ''} 
                    readOnly 
                    className="w-[70px] h-8 text-right"
                  />
                  <span className="text-sm whitespace-nowrap ml-1">มม.</span>
                </div>
              </div>
              <div className="flex items-center whitespace-nowrap overflow-hidden">
                <span className="text-[#17254D] text-sm font-normal mr-2 flex-shrink-0">เมื่อวาน</span>
                <div className="flex items-center flex-shrink-0">
                  <Input 
                    value={station.rainfall_7d ?? ''} 
                    readOnly 
                    className="w-[70px] h-8 text-right"
                  />
                  <span className="text-sm whitespace-nowrap ml-1">มม.</span>
                </div>
              </div>
            </div>
            
            {showButtons && (
              <StationCardButtons 
                onAdd={handleAddData}
                onDelete={handleDeleteData}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
