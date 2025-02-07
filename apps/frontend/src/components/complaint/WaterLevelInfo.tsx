import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Info } from "lucide-react";
import { MonitoringStationCard } from "@/components/monitoring/MonitoringStationCard";
import { useMonitoringStations } from "@/hooks/useMonitoringStations";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface WaterLevelInfoProps {
  amphure?: string;
  province?: string;
}

export const WaterLevelInfo = ({ amphure, province }: WaterLevelInfoProps) => {
  const { data: monitoringData, isLoading, error } = useMonitoringStations(amphure, province);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-lg">ข้อมูลสนับสนุน</h2>
        </div>
        {monitoringData && (
          <div className="text-sm text-muted-foreground">
            จำนวนสถานี: {monitoringData.total}
          </div>
        )}
      </div>
      
      <Card className="p-4">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>ประตูน้ำ</Label>
              <Input />
            </div>
            <div className="flex items-center gap-2">
              <Label>ระยะเปิดบาน</Label>
              <Input />
              <span>ซม.</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Label>อัตราการไหลน้ำ</Label>
            <Input />
            <span>ลบ.ม. / วินาที</span>
          </div>
        </div>
      </Card>

      {/* Monitoring Stations Section */}
      <div className="space-y-4">
        <h3 className="font-medium">
          สถานีเฝ้าระวัง {amphure && `ใน${amphure}`}
          {!amphure && province && `ใน${province}`}
        </h3>
        
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-[300px] w-full" />
            <Skeleton className="h-[300px] w-full" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              ไม่สามารถโหลดข้อมูลสถานีเฝ้าระวังได้
            </AlertDescription>
          </Alert>
        )}

        {monitoringData?.stations.length === 0 && (
          <Alert>
            <AlertDescription>
              ไม่พบสถานีเฝ้าระวังในพื้นที่นี้
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {monitoringData?.stations.map((station) => (
            <MonitoringStationCard 
              key={station.id} 
              station={station} 
            />
          ))}
        </div>
      </div>

      <Card className="p-4">
        <div className="space-y-4">
          <div>
            <Label>อ่างเก็บน้ำ</Label>
            <Input />
          </div>
          
          <div>
            <Label>ระดับน้ำในอ่าง</Label>
            <Input />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Label>ระดับน้ำต่ำสุด/สูงสุด</Label>
              <Input className="w-24" />
              <span>/</span>
              <Input className="w-24" />
            </div>
            <div className="flex items-center gap-2">
              <Label>อัตราการปล่อยน้ำ</Label>
              <Input />
              <span>ลบ.ม. / วินาที</span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="space-y-4">
          <div>
            <Label>สถานีวัดน้ำฝน</Label>
            <Input />
          </div>
          
          <div className="flex items-center gap-2">
            <Label>ปริมาณน้ำฝนในรอบ ... วัน</Label>
            <Input className="w-24" />
            <span>มม.</span>
          </div>
        </div>
      </Card>
    </div>
  );
};