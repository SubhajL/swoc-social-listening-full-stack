import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { RainStation } from "@/types/rain-station";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useThaiWaterData } from "@/hooks/useThaiWaterData";
import { useMemo, useEffect } from "react";

interface RainStationCardProps {
  station: RainStation;
}

// Station ID mapping (our station_id -> ThaiWater tele_station_id)
const STATION_ID_MAP: Record<string, number> = {
  '7391': 1109570,  // สชป.1
  '7013': 494       // อุตุสนามบิน
};

export const RainStationCard = ({ station }: RainStationCardProps) => {
  const { data: thaiWaterData, isLoading, error } = useThaiWaterData();

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
    
    // Try to find the station by mapped ID
    const matchedData = thaiWaterData.data.find(d => 
      d.tele_station_id === mappedStationId
    );
    
    console.log('[RainStationCard] Matched Data:', {
      stationId: station.station_id,
      mappedId: mappedStationId,
      stationCode: station.code,
      matchedData
    });
    
    return matchedData;
  }, [thaiWaterData, station.station_id]);

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {station.station_name}
          {(station.station_id || station.code) && (
            <span className="text-sm text-gray-500 ml-2">
              ({station.station_id && `ID: ${station.station_id}`}
              {station.station_id && station.code && ', '}
              {!station.station_id && station.code && `Code: ${station.code}`}
              {station.station_id && station.code && `Code: ${station.code}`})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2">
            <Label>ปริมาณฝนสะสม 1 ชม</Label>
            <Input 
              value={stationData?.rainfall1h?.toFixed(2) ?? ''} 
              readOnly 
              className={`max-w-[100px] h-8 ${isLoading ? 'animate-pulse' : ''}`}
            />
            <span className="text-sm">มม.</span>
          </div>
          <div className="flex items-center gap-2">
            <Label>ปริมาณฝนสะสม 24 ชม</Label>
            <Input 
              value={stationData?.rainfall24h?.toFixed(2) ?? ''} 
              readOnly 
              className={`max-w-[100px] h-8 ${isLoading ? 'animate-pulse' : ''}`}
            />
            <span className="text-sm">มม.</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
