import { Card } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import logo1 from "@/assets/logo1.png";
import logo2 from "@/assets/logo2.png";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bell, Settings } from "lucide-react";
import { useComplaintStore } from "@/stores/complaintStore";

// Custom header component for the ApprovalStep page
const ApprovalStepHeader = () => {
  const navigate = useNavigate();

  const handleSettingsClick = () => {
    navigate('/system-setting');
  };

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
            <div 
              className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer"
              onClick={handleSettingsClick}
            >
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

// ApprovalStep Component
const ApprovalStep = () => {
  const navigate = useNavigate();
  const complaintStore = useComplaintStore();
  
  const handleBack = () => {
    // Check if we have complaint data in the store before navigating back
    if (complaintStore.complaintData) {
      console.log("[ApprovalStep] Navigating back with complaint data in store");
      
      try {
        // Store essential data in sessionStorage
        const essentialData = {
          from: 'ApprovalStep',
          returnToDocumentPreparation: true,
          timestamp: new Date().getTime(),
          complaintData: complaintStore.complaintData
        };
        
        // Store the state in sessionStorage to retrieve it on the target page
        sessionStorage.setItem('documentPreparationState', JSON.stringify(essentialData));
        
        // Navigate to document preparation page
        navigate('/document-preparation');
      } catch (error) {
        console.error("[ApprovalStep] Error storing data in sessionStorage:", error);
        // Fallback navigation
        navigate('/document-preparation');
      }
    } else {
      console.log("[ApprovalStep] No complaint data in store, navigating to home");
      navigate('/');
    }
  };
  
  return (
    <div className="min-h-screen bg-[#F0F8FF]">
      <ApprovalStepHeader />
      
      {/* Page Title */}
      <div className="bg-[#EBF5FF]">
        <div className="container mx-auto px-12 pt-6 pb-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleBack}
              className="rounded-full hover:bg-blue-100"
            >
              <ArrowLeft className="h-5 w-5 text-blue-600" />
            </Button>
            <h1 className="text-2xl font-semibold text-[#17254D]">ขั้นตอนการอนุมัติ</h1>
          </div>
        </div>
      </div>
      
      <main className="container mx-auto px-12 pt-2 pb-20">
        {/* Main Content */}
        <div className="mb-6">
          <Card className="p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-[#17254D] mb-6">ขั้นตอนการอนุมัติเอกสาร</h2>
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-gray-500 mb-4">เอกสารได้ถูกส่งเข้าสู่กระบวนการอนุมัติแล้ว</p>
              <p className="text-gray-500">กรุณารอการตรวจสอบจากผู้มีอำนาจอนุมัติ</p>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ApprovalStep; 