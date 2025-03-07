import { Card } from "@/components/ui/card";
import { useLocation, useNavigate, useBlocker } from "react-router-dom";
import { Complaint } from "@/types/complaint";
import { ProcessedPost } from "@/types/processed-post";
import { SocialPostInfo } from "@/components/complaint/SocialPostInfo";
import { StationCardEditInfo } from "@/components/complaint/StationCardEditInfo";
import { useEffect, useRef, useState, useCallback } from "react";
import logo1 from "@/assets/logo1.png";
import logo2 from "@/assets/logo2.png";
import { Link } from "react-router-dom";
import { UnsavedChangesDialog } from "@/components/complaint/UnsavedChangesDialog";
import { toast } from "sonner";
// Import Jotai hooks instead of Zustand
import { useComplaintData, useStationData } from "@/atoms/hooks";
import { Bell, Settings, ArrowLeft, ArrowRight, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
// Import reusable components
import { ComplaintInfoCard, WaterLevelInfoCard } from "@/components/shared";

// Type guard to check if data is ProcessedPost
const isProcessedPost = (data: any): data is ProcessedPost => {
  return 'processed_post_id' in data && 'text' in data && 'category_name' in data;
};

// Add a type guard for Complaint
const isComplaint = (data: any): data is Complaint => {
  return data && 
    typeof data.id === 'string' && 
    typeof data.content === 'string' && 
    typeof data.createdAt === 'string' &&
    typeof data.updatedAt === 'string' &&
    typeof data.status === 'string';
};

// Extract location data safely
const extractLocationData = (data: any) => {
  if (!data) return { province: [], amphure: [], tumbon: [] };
  
  // Handle different data structures
  if (isComplaint(data)) {
    // For Complaint type, extract from province field
    return {
      province: data.province ? [data.province] : [],
      amphure: [],
      tumbon: []
    };
  }
  
  // For other types that might have location arrays
  return {
    province: Array.isArray(data.province) ? data.province : 
              (data.province ? [data.province] : []),
    amphure: Array.isArray(data.amphure) ? data.amphure : 
             (data.amphure ? [data.amphure] : []),
    tumbon: Array.isArray(data.tumbon) ? data.tumbon : 
            (data.tumbon ? [data.tumbon] : [])
  };
};

// Custom header component for the StationCardEdit page
const StationCardEditHeader = () => {
  const navigate = useNavigate();

  const handleSettingsClick = () => {
    navigate('/system-setting');
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-12">
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

const StationCardEdit = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const complaintData = location.state;
  const { toast } = useToast();
  
  // Get station data from Jotai with the correct types
  const stationData = useStationData();
  
  const isInitialMount = useRef(true);
  
  // Extract location data from the complaint
  const locationData = extractLocationData(complaintData);
  
  // Store the complaint data when the component mounts
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      console.log('StationCardEdit mounted with complaint data:', complaintData);
      
      // Set the flag to indicate intentional update
      if (stationData.setStationDataUpdateIntentional) {
        stationData.setStationDataUpdateIntentional(true);
      }
    }
  }, [complaintData, stationData]);
  
  // Save data and navigate to the next page
  const saveAndNavigate = async () => {
    try {
      // Save the current state
      if (stationData.saveStationDataForNavigation) {
        await stationData.saveStationDataForNavigation('saveAndNavigate');
      }
      
      // Set flag to indicate intentional navigation
      if (stationData.setNavigatingAfterSave) {
        stationData.setNavigatingAfterSave(true);
      }
      
      // Navigate to the next page
      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving data before navigation:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง",
        variant: "destructive"
      });
    }
  };
  
  // Add a saveAndReturn function
  const saveAndReturn = async () => {
    try {
      // Save the current state
      if (stationData.saveStationDataForNavigation) {
        await stationData.saveStationDataForNavigation('saveAndReturn');
      }
      
      // Set flag to indicate intentional navigation
      if (stationData.setNavigatingAfterSave) {
        stationData.setNavigatingAfterSave(true);
      }
      
      // Navigate back to the complaint form
      navigate('/complaint/create', { 
        state: { 
          returnedFromStationEdit: true,
          preserveState: true,
          complaintData: complaintData
        } 
      });
    } catch (error) {
      console.error('Error saving data before return:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="min-h-screen bg-[#F0F8FF] pb-32">
      <StationCardEditHeader />
      
      {/* Page Title */}
      <div className="bg-[#EBF5FF]">
        <div className="container mx-auto px-12 pt-6 pb-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-[#17254D]">ระบบตอบประเด็นข้อร้องเรียน</h1>
            <div className="flex gap-2">
              <Button 
                onClick={saveAndReturn}
                variant="outline"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                บันทึกและกลับ
              </Button>
              <Button 
                onClick={saveAndNavigate}
                className="flex items-center gap-2"
              >
                บันทึกและดำเนินการต่อ
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <main className="container mx-auto px-12 pt-6">
        {/* Complaint Data Section */}
        <div className="mb-6">
          <ComplaintInfoCard 
            title="ข้อร้องเรียน"
            editable={false}
          />
        </div>
        
        {/* Supporting Data Section */}
        <div className="mb-6">
          <StationCardEditInfo 
            amphure={locationData.amphure[0]}
            province={locationData.province[0]}
            onChangesMade={() => console.log("Changes made")}
            onSave={saveAndNavigate}
            onDiscard={saveAndReturn}
          />
        </div>
      </main>
    </div>
  );
};

export default StationCardEdit; 