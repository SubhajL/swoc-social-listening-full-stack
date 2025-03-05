import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProcessedPost } from "@/types/processed-post";
import { Complaint, ComplaintWithOrganization } from "@/types/complaint";
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useComplaintData } from "@/atoms/hooks";
import { useCallback } from "react";

interface ComplaintInfoCardProps {
  complaint?: ProcessedPost | Complaint | ComplaintWithOrganization | null;
  title?: string;
  className?: string;
  editable?: boolean;
}

// Extended complaint type for form data
interface ExtendedComplaint extends Complaint {
  issue?: string;
  category?: string;
  reporter?: string;
  date?: string;
  link?: string;
}

const isProcessedPost = (data: any): data is ProcessedPost => {
  return data !== null && typeof data === 'object' && 'processed_post_id' in data;
};

const isComplaintWithOrganization = (data: any): data is ComplaintWithOrganization => {
  return data !== null && typeof data === 'object' && 'organizationId' in data && 'organizationName' in data;
};

const isExtendedComplaint = (data: any): data is ExtendedComplaint => {
  return data !== null && typeof data === 'object' && !isProcessedPost(data) && !isComplaintWithOrganization(data);
};

const getIssue = (complaint: ProcessedPost | Complaint | ComplaintWithOrganization | null): string => {
  if (!complaint) return '';
  if (isProcessedPost(complaint)) {
    return complaint.text || '';
  }
  if (isExtendedComplaint(complaint) && complaint.issue) {
    return complaint.issue;
  }
  return complaint.content || '';
};

export const ComplaintInfoCard = ({ 
  complaint: propComplaint, 
  title = "ข้อร้องเรียน", 
  className = "",
  editable = false
}: ComplaintInfoCardProps) => {
  // Get complaint data from Jotai
  const { 
    title: storeTitle, 
    description: storeDescription,
    processedPosts,
    selectedPostIds,
    updateTitle,
    updateDescription
  } = useComplaintData();
  
  // Use complaint from props if provided, otherwise try to get from Jotai store
  const complaint = propComplaint || (processedPosts.length > 0 && selectedPostIds.length > 0 
    ? processedPosts.find(post => selectedPostIds.includes(post.processed_post_id.toString()))
    : null);

  if (!complaint) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              ไม่พบข้อมูลข้อร้องเรียน
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const getCategoryDisplay = () => {
    if (isProcessedPost(complaint)) {
      return complaint.category_name || '';
    }
    if (isExtendedComplaint(complaint) && complaint.category) {
      return complaint.category;
    }
    return '';
  };

  const getReporter = () => {
    if (isProcessedPost(complaint)) {
      return complaint.profile_name || '';
    }
    if (isExtendedComplaint(complaint) && complaint.reporter) {
      return complaint.reporter;
    }
    return '';
  };

  const getDate = () => {
    if (isProcessedPost(complaint)) {
      return complaint.post_date instanceof Date 
        ? complaint.post_date.toISOString().split('T')[0] 
        : typeof complaint.post_date === 'string' 
          ? new Date(complaint.post_date).toISOString().split('T')[0]
          : '';
    }
    if (isExtendedComplaint(complaint) && complaint.date) {
      return complaint.date;
    }
    return '';
  };

  const getLink = () => {
    if (isProcessedPost(complaint)) {
      return complaint.post_url || '';
    }
    if (isExtendedComplaint(complaint) && complaint.link) {
      return complaint.link;
    }
    return '';
  };

  const handleInputChange = useCallback((field: string, value: string) => {
    if (!editable) return;
    
    switch (field) {
      case 'issue':
        updateTitle(value);
        break;
      case 'category':
        // Handle category update if needed
        break;
      case 'reporter':
        // Handle reporter update if needed
        break;
      case 'date':
        // Handle date update if needed
        break;
      case 'link':
        // Handle link update if needed
        break;
      case 'content':
        updateDescription(value);
        break;
      default:
        break;
    }
  }, [editable, updateTitle, updateDescription]);

  return (
    <ErrorBoundary component="ComplaintInfoCard">
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              {getIssue(complaint)}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>ประเด็นข้อร้องเรียน</Label>
                <Input 
                  value={storeTitle || getIssue(complaint)} 
                  placeholder="ยังไม่มีข้อมูล"
                  readOnly={!editable}
                  onChange={(e) => handleInputChange('issue', e.target.value)}
                />
              </div>
              <div>
                <Label>ประเภทข้อร้องเรียน</Label>
                <Input 
                  value={getCategoryDisplay()} 
                  placeholder="ยังไม่มีข้อมูล"
                  readOnly={!editable}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <Label>ข้อมูลผู้ร้องเรียน</Label>
              <Input 
                className="h-24" 
                value={getReporter()} 
                placeholder="ยังไม่มีข้อมูล"
                readOnly={!editable}
                onChange={(e) => handleInputChange('reporter', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>วันที่</Label>
                <Input 
                  type="date" 
                  value={getDate()} 
                  placeholder="ยังไม่มีข้อมูล"
                  readOnly={!editable}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                />
              </div>
              <div>
                <Label>Link</Label>
                <Input 
                  value={getLink()} 
                  placeholder="ยังไม่มีข้อมูล"
                  readOnly={!editable}
                  onChange={(e) => handleInputChange('link', e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </ErrorBoundary>
  );
};

export default ComplaintInfoCard; 