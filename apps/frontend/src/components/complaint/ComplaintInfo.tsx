import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "react-router-dom";

export const ComplaintInfo = () => {
  const location = useLocation();
  const data = location.state;

  console.log('ComplaintInfo data:', data);

  return (
    <div className="space-y-4 mb-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>ประเด็นข้อร้องเรียน</Label>
          <Input 
            value={data?.issue ?? ''} 
            placeholder="ยังไม่มีข้อมูล"
            readOnly 
          />
        </div>
        <div>
          <Label>ประเภทข้อร้องเรียน</Label>
          <Input 
            value={data?.category ?? ''} 
            placeholder="ยังไม่มีข้อมูล"
            readOnly 
          />
        </div>
      </div>
      
      <div>
        <Label>ข้อมูลผู้ร้องเรียน</Label>
        <Input 
          className="h-24" 
          value={data?.reporter ?? ''} 
          placeholder="ยังไม่มีข้อมูล"
          readOnly 
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>วันที่</Label>
          <Input 
            type="date" 
            value={data?.date ?? ''} 
            placeholder="ยังไม่มีข้อมูล"
            readOnly 
          />
        </div>
        <div>
          <Label>Link</Label>
          <Input 
            value={data?.link ?? ''} 
            placeholder="ยังไม่มีข้อมูล"
            readOnly 
          />
        </div>
      </div>
    </div>
  );
};