import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "react-router-dom";

export const ComplaintInfo = () => {
  const location = useLocation();
  const data = location.state;

  const getCategoryDisplay = () => {
    const category = data?.category_name;
    const subCategory = data?.sub1_category_name;
    if (category && subCategory) {
      return `${category} - ${subCategory}`;
    }
    return category || subCategory || '';
  };

  return (
    <div className="space-y-4 mb-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>ประเด็นข้อร้องเรียน</Label>
          <Input 
            value={data?.text ?? ''} 
            placeholder="ยังไม่มีข้อมูล"
            readOnly 
          />
        </div>
        <div>
          <Label>ประเภทข้อร้องเรียน</Label>
          <Input 
            value={getCategoryDisplay()} 
            placeholder="ยังไม่มีข้อมูล"
            readOnly 
          />
        </div>
      </div>
      
      <div>
        <Label>ข้อมูลผู้ร้องเรียน</Label>
        <Input 
          className="h-24" 
          value={data?.profile_name ?? ''} 
          placeholder="ยังไม่มีข้อมูล"
          readOnly 
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>วันที่</Label>
          <Input 
            type="date" 
            value={data?.post_date?.split('T')[0] ?? ''} 
            placeholder="ยังไม่มีข้อมูล"
            readOnly 
          />
        </div>
        <div>
          <Label>Link</Label>
          <Input 
            value={data?.post_url ?? ''} 
            placeholder="ยังไม่มีข้อมูล"
            readOnly 
          />
        </div>
      </div>
    </div>
  );
};