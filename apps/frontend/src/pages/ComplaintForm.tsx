import { Card } from "@/components/ui/card";
import { ComplaintHeader } from "@/components/complaint/ComplaintHeader";
import { ComplaintFooter } from "@/components/complaint/ComplaintFooter";
import { WaterLevelInfo } from "@/components/complaint/WaterLevelInfo";
import { ComplaintInfo } from "@/components/complaint/ComplaintInfo";
import { LocationInfo } from "@/components/complaint/LocationInfo";
import { WaterFlowPanel } from "@/components/complaint/WaterFlowPanel";
import { ComplaintNavigation } from "@/components/complaint/ComplaintNavigation";
import { useComplaint } from "@/hooks/useComplaint";
import { useLocation, useSearchParams } from "react-router-dom";
import { Complaint } from "@/types/complaint";
import { ComplaintDTO } from "@/dto/complaint.dto";
import { toast } from "sonner";
import { ProcessedPost } from "@/types/processed-post";

// Type guard to check if data is ProcessedPost
const isProcessedPost = (data: any): data is ProcessedPost => {
  return 'processed_post_id' in data && 'text' in data && 'category_name' in data;
};

// Convert ProcessedPost to ComplaintDTO format while preserving location data
const convertToComplaintFormat = (data: ProcessedPost | Complaint) => {
  if (isProcessedPost(data)) {
    return {
      id: data.processed_post_id,
      issue: data.text,
      category: data.category_name,
      reporter: data.profile_name,
      date: data.post_date instanceof Date 
        ? data.post_date.toISOString().split('T')[0] 
        : new Date(data.post_date).toISOString().split('T')[0],
      link: data.post_url,
      coordinates: {
        lat: data.latitude,
        lng: data.longitude
      },
      // Preserve original location data structure
      tumbon: data.tumbon,
      amphure: data.amphure,
      province: data.province,
      // Keep location field for backward compatibility
      location: ''
    };
  }
  return data;
};

const ComplaintForm = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const postId = searchParams.get('postId');
  const complaintData = location.state as ProcessedPost | undefined;
  const { isLoading, complaint } = useComplaint(postId ? Number(postId) : undefined);

  const validateComplaintData = () => {
    const data = complaint || complaintData;
    if (!data) return;

    const complaintFormat = convertToComplaintFormat(data);
    const result = ComplaintDTO.safeParse(complaintFormat);
    if (!result.success) {
      console.error('Complaint data validation failed:', result.error);
      toast.error('ข้อมูลข้อร้องเรียนไม่ถูกต้อง');
      return false;
    }
    return true;
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const data = complaint || complaintData;
  if (data && !validateComplaintData()) {
    return <div>Invalid complaint data</div>;
  }

  // Get the first amphure and province from the arrays
  const locationData = data ? convertToComplaintFormat(data) : undefined;
  const firstAmphure = locationData?.amphure?.[0];
  const firstProvince = locationData?.province?.[0];

  return (
    <div className="min-h-screen bg-[#F0F8FF] pb-32">
      <ComplaintHeader />
      
      <main className="container mx-auto p-4 space-y-6">
        <Card className="p-6">
          <ComplaintInfo complaint={data!} />
          <LocationInfo complaint={data!} />
        </Card>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WaterLevelInfo 
            amphure={firstAmphure}
            province={firstProvince}
          />
          <WaterFlowPanel />
        </div>
      </main>

      <ComplaintFooter />
      <ComplaintNavigation />
    </div>
  );
};

export default ComplaintForm;