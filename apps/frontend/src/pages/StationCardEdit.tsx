import { Card } from "@/components/ui/card";
import { useLocation, useNavigate } from "react-router-dom";
import { Complaint } from "@/types/complaint";
import { ProcessedPost } from "@/types/processed-post";
import { SocialPostInfo } from "@/components/complaint/SocialPostInfo";
import { StationCardEditInfo } from "@/components/complaint/StationCardEditInfo";
import logo1 from "@/assets/logo1.png";
import logo2 from "@/assets/logo2.png";
import { Link } from "react-router-dom";
import { Bell, Settings } from "lucide-react";

// Type guard to check if data is ProcessedPost
const isProcessedPost = (data: any): data is ProcessedPost => {
  return 'processed_post_id' in data && 'text' in data && 'category_name' in data;
};

// Custom header component for the StationCardEdit page
const StationCardEditHeader = () => {
  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between pt-3">
          {/* Left section - Logos */}
          <div className="flex items-center gap-4">
            <img 
              src={logo1} 
              alt="Royal Irrigation Department Logo" 
              className="h-20 w-auto object-contain"
            />
            <img 
              src={logo2} 
              alt="SWOC Logo" 
              className="h-20 w-auto object-contain"
            />
          </div>

          {/* Right section - Icons */}
          <div className="flex items-center gap-1 pr-0">
            {/* Notification bell with indicator */}
            <div className="relative p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer">
              <Bell className="w-6 h-6 text-[#334155]" />
              <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></div>
            </div>
            
            {/* Settings */}
            <div className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer">
              <Settings className="w-6 h-6 text-[#334155]" />
            </div>
            
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center text-base font-medium text-[#0F172B] ml-1">
              CN
            </div>
          </div>
        </div>

        {/* Navigation tabs - aligned with map and pushed up */}
        <div className="px-6 -mt-6 pb-0">
          <div className="flex">
            {/* This space accounts for the filter panel width and gap */}
            <div className="w-[450px]"></div>
            {/* Navigation tabs aligned with the Map */}
            <nav className="flex items-center border-b border-[#E2E8F0] whitespace-nowrap">
              <Link 
                to="/" 
                className="px-4 py-1 text-[#6B7280] hover:text-[#17254D] text-base whitespace-nowrap"
              >
                ระบบจัดการข้อมูลสื่อสังคมออนไลน์
              </Link>
              <Link 
                to="/response" 
                className="px-4 py-1 text-[#17254D] border-b-2 border-[#42A5F5] font-medium text-base -mb-[0px] whitespace-nowrap"
              >
                ระบบตอบประเด็นข้อร้องเรียน
              </Link>
              <Link 
                to="/dashboard" 
                className="px-4 py-1 text-[#6B7280] hover:text-[#17254D] text-base whitespace-nowrap"
              >
                ระบบแสดงผลข้อมูลและสรุปผลผู้บริหาร
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
};

const StationCardEdit = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const complaintData = location.state as ProcessedPost | Complaint | undefined;

  if (!complaintData) {
    return <div>No data available</div>;
  }

  // Get the first amphure and province from the arrays
  const firstAmphure = isProcessedPost(complaintData) 
    ? complaintData.amphure?.[0] 
    : complaintData.amphure?.[0];
  
  const firstProvince = isProcessedPost(complaintData) 
    ? complaintData.province?.[0] 
    : complaintData.province?.[0];

  return (
    <div className="min-h-screen bg-[#F0F8FF] pb-32">
      <StationCardEditHeader />
      
      {/* Page Title */}
      <div className="bg-[#EBF5FF]">
        <div className="container mx-auto px-12 pt-6 pb-4">
          <h1 className="text-2xl font-semibold text-[#17254D] mb-4">เพิ่มเติม/แก้ไขข้อมูลสนับสนุน</h1>
        </div>
      </div>
      
      <main className="container mx-auto px-12 pt-2">
        <Card className="p-6 -mt-2">
          <SocialPostInfo complaint={complaintData} />
        </Card>
        
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mt-6">
          <Card className="p-6">
            <StationCardEditInfo 
              amphure={firstAmphure}
              province={firstProvince}
            />
          </Card>
        </div>
      </main>
    </div>
  );
};

export default StationCardEdit; 