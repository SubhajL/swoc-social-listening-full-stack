import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProcessedPost } from "@/types/processed-post";
import { Complaint } from "@/types/complaint";

interface ComplaintInfoProps {
  complaint: ProcessedPost | Complaint;
}

// Type guard to check if data is ProcessedPost
const isProcessedPost = (data: any): data is ProcessedPost => {
  return 'processed_post_id' in data && 'text' in data && 'category_name' in data;
};

export const ComplaintInfo = ({ complaint }: ComplaintInfoProps) => {
  const getCategoryDisplay = () => {
    if (isProcessedPost(complaint)) {
      const category = complaint.category_name;
      const subCategory = complaint.sub1_category_name;
      if (category && subCategory) {
        return `${category} - ${subCategory}`;
      }
      return category || subCategory || '';
    }
    return complaint.category || '';
  };

  const getIssue = () => {
    if (isProcessedPost(complaint)) {
      return complaint.text;
    }
    return complaint.issue;
  };

  const getReporter = () => {
    if (isProcessedPost(complaint)) {
      return complaint.profile_name;
    }
    return complaint.reporter;
  };

  const getDate = () => {
    if (isProcessedPost(complaint)) {
      return complaint.post_date instanceof Date 
        ? complaint.post_date.toISOString().split('T')[0] 
        : new Date(complaint.post_date).toISOString().split('T')[0];
    }
    return complaint.date;
  };

  const getLink = () => {
    if (isProcessedPost(complaint)) {
      return complaint.post_url;
    }
    return complaint.link || '';
  };

  return (
    <div className="space-y-4 mb-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>ประเด็นข้อร้องเรียน</Label>
          <Input 
            value={getIssue()} 
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
  );
};

export default ComplaintInfo;