import { Card } from "@/components/ui/card";
import { ComplaintHeader } from "@/components/complaint/ComplaintHeader";
import { WaterLevelInfo } from "@/components/complaint/WaterLevelInfo";
import { SocialPostInfo } from "@/components/complaint/SocialPostInfo";
import { WaterFlowPanel } from "@/components/complaint/WaterFlowPanel";
import { useComplaint } from "@/hooks/useComplaint";
import { useLocation, useSearchParams, useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
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

  const handleContinue = () => {
    console.log('Processing complaint:', complaint || complaintData);
    toast.success('ดำเนินการต่อ');
    // Here you would typically submit the form or navigate to the next step
  };

  const handleCancel = () => {
    navigate(-1); // Go back to the previous page
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
      
      {/* Page Title */}
      <div className="bg-[#EBF5FF]">
        <div className="container mx-auto px-12 pt-6 pb-4">
          <h1 className="text-2xl font-semibold text-[#17254D] mb-4">ระบบตอบประเด็นข้อร้องเรียน</h1>
          
          {/* Action Buttons */}
          <div className="flex items-center mb-2">
            <button 
              className="bg-[#4B9FE1] hover:bg-[#3D8FD1] text-white px-2 py-2 rounded-[6px] w-[150px] h-[42px] font-medium flex items-center justify-center transition-colors duration-200 text-base whitespace-nowrap"
              onClick={handleContinue}
            >
              เพิ่มเติม/แก้ไขข้อมูล
            </button>
            <div className="w-[10px]"></div>
            <button 
              className="bg-white hover:bg-[#f0f9ff] text-[#4B9FE1] border-[1.5px] border-[#4B9FE1] px-2 py-2 rounded-[6px] w-[140px] h-[42px] font-medium flex items-center justify-center transition-colors duration-200 text-base whitespace-nowrap"
              onClick={handleCancel}
            >
              เตรียมร่างเอกสาร
            </button>
          </div>
        </div>
      </div>
      
      <main className="container mx-auto px-12 pt-2">
        <Card className="p-6 -mt-2">
          <SocialPostInfo complaint={data!} />
        </Card>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <WaterLevelInfo 
            amphure={firstAmphure}
            province={firstProvince}
          />
          <WaterFlowPanel />
        </div>
      </main>
    </div>
  );
};

export default ComplaintForm;