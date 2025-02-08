import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { RainStation } from "@/types/rain-station";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface RainStationCardProps {
  station: RainStation;
}

export const RainStationCard = ({ station }: RainStationCardProps) => {
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{station.station_name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2">
            <Label>ปริมาณน้ำฝน ในรอบ 3 วัน</Label>
            <Input 
              value={station.rainfall_3d?.toFixed(2) ?? ''} 
              readOnly 
              className="max-w-[100px] h-8"
            />
            <span className="text-sm">มม.</span>
          </div>
          <div className="flex items-center gap-2">
            <Label>ปริมาณน้ำฝน ในรอบ 7 วัน</Label>
            <Input 
              value={station.rainfall_7d?.toFixed(2) ?? ''} 
              readOnly 
              className="max-w-[100px] h-8"
            />
            <span className="text-sm">มม.</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
