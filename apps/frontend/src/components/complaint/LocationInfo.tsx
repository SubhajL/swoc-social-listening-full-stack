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
  console.log('LocationInfo mounting with complaint:', complaint);

  const getFullAddress = () => {
    try {
      console.log('Full complaint object:', JSON.stringify(complaint, null, 2));

      // If we have arrays, use them
      if (complaint.tumbon?.length || complaint.amphure?.length || complaint.province?.length) {
        const addressParts = [];
        if (complaint.tumbon?.[0]) {
          addressParts.push(`ตำบล${complaint.tumbon[0].trim()}`);
        }
        if (complaint.amphure?.[0]) {
          addressParts.push(`อำเภอ${complaint.amphure[0].trim()}`);
        }
        if (complaint.province?.[0]) {
          addressParts.push(`จังหวัด${complaint.province[0].trim()}`);
        }
        return addressParts.join(' ') || 'ยังไม่มีข้อมูล';
      }

      // If we have a location string, parse it
      if (!isProcessedPost(complaint) && complaint.location) {
        // Split and clean the location string
        const parts = complaint.location
          .replace(/^และ\s+/, '') // Remove leading "และ"
          .split(' ')
          .filter(Boolean)
          .map(part => part.trim());

        console.log('Location parts after cleaning:', parts);

        // For "ห้วย มหาสารคาม" -> ["ห้วย", "มหาสารคาม"] -> tumbon, province
        if (parts.length === 2) {
          // Check if second part is a known province name
          const isSecondPartProvince = isProvinceOrAmphur(parts[1]);
          if (isSecondPartProvince) {
            return `ตำบล${parts[0]} จังหวัด${parts[1]}`;
          } else {
            return `ตำบล${parts[0]} อำเภอ${parts[1]}`;
          }
        } else if (parts.length === 3) {
          return `ตำบล${parts[0]} อำเภอ${parts[1]} จังหวัด${parts[2]}`;
        } else if (parts.length === 1) {
          return `ตำบล${parts[0]}`;
        }
      }

      return 'ยังไม่มีข้อมูล';
    } catch (error) {
      console.error('Error in getFullAddress:', error);
      return 'ยังไม่มีข้อมูล';
    }
  };

  // Helper function to check if a string is likely a province name
  const isProvinceOrAmphur = (name: string): boolean => {
    // List of known province names that commonly appear in our data
    const commonProvinces = [
      'พะเยา',
      'กรุงเทพ',
      'เชียงใหม่',
      'ระยอง',
      'พังงา',
      'มหาสารคาม',
      'แพร่'
      // Add more as needed
    ];
    return commonProvinces.includes(name);
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