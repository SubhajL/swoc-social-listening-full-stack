import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "react-router-dom";

export const LocationInfo = () => {
  const location = useLocation();
  const data = location.state;

  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <div>
        <Label>พิกัด (ละติจูด)</Label>
        <Input 
          value={data?.latitude ?? ''}
          placeholder="ยังไม่มีข้อมูล"
          readOnly
        />
      </div>
      <div>
        <Label>พิกัด (ลองจิจูด)</Label>
        <Input 
          value={data?.longitude ?? ''}
          placeholder="ยังไม่มีข้อมูล"
          readOnly
        />
      </div>
      <div>
        <Label>ตำบล</Label>
        <Input 
          value={data?.tumbon ?? ''}
          placeholder="ยังไม่มีข้อมูล"
          readOnly
        />
      </div>
      <div>
        <Label>อำเภอ</Label>
        <Input 
          value={data?.amphure ?? ''}
          placeholder="ยังไม่มีข้อมูล"
          readOnly
        />
      </div>
      <div className="col-span-2">
        <Label>จังหวัด</Label>
        <Input 
          value={data?.province ?? ''}
          placeholder="ยังไม่มีข้อมูล"
          readOnly
        />
      </div>
    </div>
  );
};

export default LocationInfo;