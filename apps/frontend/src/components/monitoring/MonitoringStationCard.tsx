import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MonitoringStation } from "@/types/monitoring-station";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface MonitoringStationCardProps {
  station: MonitoringStation;
}

export const MonitoringStationCard = ({ station }: MonitoringStationCardProps) => {
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
              value={station.water_level?.toFixed(2) ?? ''} 
              readOnly 
              className="max-w-[100px] h-8"
            />
            <span className="text-sm">ม.</span>
          </div>
          <div className="flex items-center gap-2">
            <Label>อัตราไหลน้ำ</Label>
            <Input 
              value={station.flow_rate?.toFixed(2) ?? ''} 
              readOnly 
              className="max-w-[100px] h-8"
            />
            <span className="text-sm">ลบ.ม./วิ</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 