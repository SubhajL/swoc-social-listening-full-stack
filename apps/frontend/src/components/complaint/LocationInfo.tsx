import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProcessedPost } from "@/types/processed-post";
import { Complaint } from "@/types/complaint";

interface LocationInfoProps {
  complaint: ProcessedPost | Complaint;
}

// Type guard to check if data is ProcessedPost
const isProcessedPost = (data: any): data is ProcessedPost => {
  return 'processed_post_id' in data && 'text' in data && 'category_name' in data;
};

export const LocationInfo = ({ complaint }: LocationInfoProps) => {
  const getFullAddress = () => {
    if (isProcessedPost(complaint)) {
      const parts = [];
      if (complaint.tumbon?.[0]) parts.push(`ตำบล${complaint.tumbon[0]}`);
      if (complaint.amphure?.[0]) parts.push(`อำเภอ${complaint.amphure[0]}`);
      if (complaint.province?.[0]) parts.push(`จังหวัด${complaint.province[0]}`);
      return parts.join(' ') || '';
    }
    return complaint.location || '';
  };

  const getLatitude = () => {
    if (isProcessedPost(complaint)) {
      return complaint.latitude;
    }
    return complaint.coordinates?.lat;
  };

  const getLongitude = () => {
    if (isProcessedPost(complaint)) {
      return complaint.longitude;
    }
    return complaint.coordinates?.lng;
  };

  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <div>
        <Label>พิกัด (ละติจูด)</Label>
        <Input 
          value={getLatitude() ?? ''}
          placeholder="ยังไม่มีข้อมูล"
          readOnly
        />
      </div>
      <div>
        <Label>พิกัด (ลองจิจูด)</Label>
        <Input 
          value={getLongitude() ?? ''}
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