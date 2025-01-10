import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Info } from "lucide-react";

export const WaterLevelInfo = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Info className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-lg">ข้อมูลสนับสนุน</h2>
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

      <Card className="p-4">
        <div className="space-y-4">
          <div>
            <Label>สถานีเฝ้าระวัง</Label>
            <Input />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Label>ระดับน้ำ</Label>
              <Input />
              <span>ม.</span>
            </div>
            <div className="flex items-center gap-2">
              <Label>อัตราไหลน้ำ</Label>
              <Input />
              <span>ลบ.ม. / วินาที</span>
            </div>
          </div>
        </div>
      </Card>

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