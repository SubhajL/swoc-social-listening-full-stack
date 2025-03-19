import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProcessedPost } from "@/types/processed-post";
import { Complaint } from "@/types/complaint";
import { ErrorBoundary } from "@/components/error-boundary";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

// Extended interface to include additional properties used in this component
interface ExtendedComplaint extends Complaint {
  location?: string;
  amphure?: string | string[];
  tumbon?: string | string[];
}

interface LocationInfoProps {
  complaint: ProcessedPost | ExtendedComplaint | null;
}

const isProcessedPost = (data: any): data is ProcessedPost => {
  return data !== null && typeof data === 'object' && 'processed_post_id' in data;
};

const getArrayValue = (arr: string[] | undefined | null): string => {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return '';
  return String(arr[0]).trim();
};

const getLocation = (complaint: ProcessedPost | ExtendedComplaint | null): string => {
  if (!complaint) return '';
  if (isProcessedPost(complaint)) {
    return complaint.text || '';
  }
  return complaint.location || complaint.content || '';
};

const getProvince = (complaint: ProcessedPost | ExtendedComplaint | null): string => {
  if (!complaint) return '';
  if (isProcessedPost(complaint)) {
    return getArrayValue(complaint.province as string[]);
  }
  const provinceValue = complaint.province;
  return Array.isArray(provinceValue) ? getArrayValue(provinceValue) : (provinceValue || '');
};

const getDistrict = (complaint: ProcessedPost | ExtendedComplaint | null): string => {
  if (!complaint) return '';
  if (isProcessedPost(complaint)) {
    return getArrayValue(complaint.amphure as string[]);
  }
  const amphureValue = complaint.amphure;
  return Array.isArray(amphureValue) ? getArrayValue(amphureValue) : (amphureValue || '');
};

const getSubDistrict = (complaint: ProcessedPost | ExtendedComplaint | null): string => {
  if (!complaint) return '';
  if (isProcessedPost(complaint)) {
    return getArrayValue(complaint.tumbon as string[]);
  }
  const tumbonValue = complaint.tumbon;
  return Array.isArray(tumbonValue) ? getArrayValue(tumbonValue) : (tumbonValue || '');
};

export const LocationInfo = ({ complaint }: LocationInfoProps) => {
  if (!complaint) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          ไม่พบข้อมูลสถานที่
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <ErrorBoundary component="LocationInfo">
      <div className="space-y-4 mb-6">
        <h3 className="font-medium">ข้อมูลสถานที่</h3>
        <div>
          <Label>สถานที่</Label>
          <Input 
            value={getLocation(complaint)}
            placeholder="ยังไม่มีข้อมูล"
            readOnly 
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>จังหวัด</Label>
            <Input 
              value={getProvince(complaint)}
              placeholder="ยังไม่มีข้อมูล"
              readOnly 
            />
          </div>
          <div>
            <Label>อำเภอ</Label>
            <Input 
              value={getDistrict(complaint)}
              placeholder="ยังไม่มีข้อมูล"
              readOnly 
            />
          </div>
          <div>
            <Label>ตำบล</Label>
            <Input 
              value={getSubDistrict(complaint)}
              placeholder="ยังไม่มีข้อมูล"
              readOnly 
            />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default LocationInfo;