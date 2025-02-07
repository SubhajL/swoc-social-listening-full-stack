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
      <CardHeader>
        <CardTitle className="text-lg">{station.station_name}</CardTitle>
        <div className="text-sm text-muted-foreground">
          รหัส: {station.station_id} ({station.code})
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-muted-foreground">สำนักงานชลประทาน</Label>
            <p>{station.irrigation_office}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">ลุ่มน้ำ</Label>
            <p>{station.river_basin}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-muted-foreground">แม่น้ำ</Label>
            <p>{station.river_name}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">พื้นที่</Label>
            <p>{station.amphure}, {station.province}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Label>ระดับน้ำ</Label>
            <Input 
              value={station.water_level?.toString() ?? ''} 
              readOnly 
              className="max-w-[120px]"
            />
            <span>ม.</span>
          </div>
          <div className="flex items-center gap-2">
            <Label>อัตราไหลน้ำ</Label>
            <Input 
              value={station.flow_rate?.toString() ?? ''} 
              readOnly 
              className="max-w-[120px]"
            />
            <span>ลบ.ม. / วินาที</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-muted-foreground">ระดับตลิ่ง</Label>
            <p>{station.bank_level_meters} เมตร</p>
          </div>
          <div>
            <Label className="text-muted-foreground">ความจุ</Label>
            <p>{station.capacity_cms} ลบ.ม./วินาที</p>
          </div>
        </div>

        <div>
          <Label className="text-muted-foreground">ศูนย์เสาระดับ</Label>
          <p>{station.pole_center_msl} ม.รทก.</p>
        </div>
      </CardContent>
    </Card>
  );
}; 