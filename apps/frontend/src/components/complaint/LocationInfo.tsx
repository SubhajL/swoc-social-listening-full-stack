import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "react-router-dom";

export const LocationInfo = () => {
  const location = useLocation();
  const data = location.state;

  const getFullAddress = () => {
    const parts = [];
    if (data?.tumbon) parts.push(`ตำบล${data.tumbon}`);
    if (data?.amphure) parts.push(`อำเภอ${data.amphure}`);
    if (data?.province) parts.push(`จังหวัด${data.province}`);
    return parts.join(' ') || '';
  };

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
      <div className="col-span-2">
        <Label>ที่อยู่</Label>
        <Input 
          value={getFullAddress()}
          placeholder="ยังไม่มีข้อมูล"
          readOnly
        />
      </div>
    </div>
  );
};

export default LocationInfo;