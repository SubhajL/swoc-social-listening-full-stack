import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "react-router-dom";

export const LocationInfo = () => {
  const location = useLocation();
  const data = location.state;

  console.log('LocationInfo data:', data);

  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <div>
        <Label>พิกัด</Label>
        <Input 
          value={data?.coordinates?.lat ?? ''}
          placeholder="ยังไม่มีข้อมูล"
          readOnly
        />
      </div>
      <div>
        <Label>ตำแหน่ง</Label>
        <Input 
          value={data?.coordinates?.lng ?? ''}
          placeholder="ยังไม่มีข้อมูล"
          readOnly
        />
      </div>
      <div className="col-span-2">
        <Label>ที่อยู่</Label>
        <Input 
          value={data?.location ?? ''}
          placeholder="ยังไม่มีข้อมูล"
          readOnly
        />
      </div>
    </div>
  );
};