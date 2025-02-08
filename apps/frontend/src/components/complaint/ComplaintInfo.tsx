import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProcessedPost } from "@/types/processed-post";
import { Complaint } from "@/types/complaint";
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { logger } from "@/lib/logger";

interface ComplaintInfoProps {
  complaint: ProcessedPost | Complaint | null;
}

const isProcessedPost = (data: any): data is ProcessedPost => {
  return data !== null && typeof data === 'object' && 'processed_post_id' in data;
};

const getIssue = (complaint: ProcessedPost | Complaint | null): string => {
  if (!complaint) return '';
  if (isProcessedPost(complaint)) {
    return complaint.text || '';
  }
  return complaint.issue || '';
};

export const ComplaintInfo = ({ complaint }: ComplaintInfoProps) => {
  if (!complaint) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          ไม่พบข้อมูลข้อร้องเรียน
        </AlertDescription>
      </Alert>
    );
  }

  const getCategoryDisplay = () => {
    if (isProcessedPost(complaint)) {
      return complaint.category_name || '';
    }
    return complaint.category || '';
  };

  const getReporter = () => {
    if (isProcessedPost(complaint)) {
      return complaint.profile_name || '';
    }
    return complaint.reporter || '';
  };

  const getDate = () => {
    if (isProcessedPost(complaint)) {
      return complaint.post_date instanceof Date 
        ? complaint.post_date.toISOString().split('T')[0] 
        : new Date(complaint.post_date).toISOString().split('T')[0];
    }
    return complaint.date || '';
  };

  const getLink = () => {
    if (isProcessedPost(complaint)) {
      return complaint.post_url || '';
    }
    return complaint.link || '';
  };

  return (
    <ErrorBoundary component="ComplaintInfo">
      <div className="space-y-4 mb-6">
        <h3 className="font-medium">ข้อร้องเรียน</h3>
        <p className="text-sm text-gray-500">
          {getIssue(complaint)}
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>ประเด็นข้อร้องเรียน</Label>
            <Input 
              value={getIssue(complaint)} 
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
            value={getReporter()} 
            placeholder="ยังไม่มีข้อมูล"
            readOnly 
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>วันที่</Label>
            <Input 
              type="date" 
              value={getDate()} 
              placeholder="ยังไม่มีข้อมูล"
              readOnly 
            />
          </div>
          <div>
            <Label>Link</Label>
            <Input 
              value={getLink()} 
              placeholder="ยังไม่มีข้อมูล"
              readOnly 
            />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default ComplaintInfo;