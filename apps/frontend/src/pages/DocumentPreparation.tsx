import { Card } from "@/components/ui/card";
import { useLocation, useNavigate } from "react-router-dom";
import { Complaint } from "@/types/complaint";
import { ProcessedPost } from "@/types/processed-post";
import { SocialPostInfo } from "@/components/complaint/SocialPostInfo";
import { useComplaintStore } from "@/stores/complaintStore";
import { useDocumentPreparationStore } from "@/stores/documentPreparationStore";
import { useEffect, useRef, useState } from "react";
import logo1 from "@/assets/logo1.png";
import logo2 from "@/assets/logo2.png";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { WaterLevelInfo } from "@/components/complaint/WaterLevelInfo";
import { WaterManagementPlan } from "@/components/complaint/WaterManagementPlan";
import { Save, Check, Send, ChevronDown, X, Bell, Settings } from "lucide-react";
// Import SVG icons
import CalendarIcon from "@/assets/icon/Calendar.svg";
import ClipboardIcon from "@/assets/icon/Clipboard.svg";
import ShareIcon from "@/assets/icon/share-2.svg";
import PrinterIcon from "@/assets/icon/printer.svg";
import { cleanLocationString, formatLocationForDisplay, isEmptyLocation } from "@/lib/location-utils";

// Type guard to check if data is ProcessedPost
const isProcessedPost = (data: any): data is ProcessedPost => {
  return 'processed_post_id' in data && 'text' in data && 'category_name' in data;
};

// Success Popup Component
interface SuccessPopupProps {
  title: string;
  timestamp: string;
  onClose: () => void;
}

const SuccessPopup = ({ title, timestamp, onClose }: SuccessPopupProps) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white rounded-xl p-6 shadow-lg max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-gray-600">{timestamp}</p>
      </div>
    </div>
  );
};

// Custom header component for the DocumentPreparation page
const DocumentPreparationHeader = () => {
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

// Document Preparation Component
const DocumentPreparation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const complaintStore = useComplaintStore();
  const complaintData = location.state as ProcessedPost | Complaint | undefined;
  const hasSetComplaintData = useRef(false);
  
  // Get document preparation state from store
  const {
    documentContent,
    isSaved,
    isApproved,
    saveTimestamp,
    approverInfo,
    setDocumentContent,
    setSaved,
    setApproved
  } = useDocumentPreparationStore();
  
  // Local state for UI
  const [hasContentChanged, setHasContentChanged] = useState<boolean>(false);
  const [showSavePopup, setShowSavePopup] = useState<boolean>(false);
  const [showApprovePopup, setShowApprovePopup] = useState<boolean>(false);
  const [popupTimestamp, setPopupTimestamp] = useState<string>("");
  
  // State to store preserved complaint data when returning from ApprovalDashboard or ApprovalStep
  const [preservedData, setPreservedData] = useState<ProcessedPost | Complaint | null>(null);
  
  // Check if we're returning from ApprovalDashboard or ApprovalStep
  useEffect(() => {
    console.log("[DocumentPreparation] Component mounted with location state:", location.state);
    
    // Check if we have state in location.state (normal navigation)
    if (location.state && (location.state.from === 'ApprovalDashboard' || location.state.from === 'ApprovalStep')) {
      console.log("[DocumentPreparation] Returned from approval page", location.state);
      
      // Try to get preserved complaint data from location state
      if (location.state.complaintData) {
        console.log("[DocumentPreparation] Received complaint data from location.state");
        setPreservedData(location.state.complaintData);
      }
      
      // Clear the state to prevent reloading on refresh
      window.history.replaceState({}, document.title);
    } 
    // Check if we have state in sessionStorage (direct navigation)
    else if (sessionStorage.getItem('documentPreparationState')) {
      try {
        const savedState = JSON.parse(sessionStorage.getItem('documentPreparationState') || '{}');
        console.log("[DocumentPreparation] Found state in sessionStorage", savedState);
        
        if (savedState.from === 'ApprovalDashboard' || savedState.from === 'ApprovalStep') {
          // Try to get preserved complaint data from session storage
          if (savedState.complaintData) {
            console.log("[DocumentPreparation] Received complaint data from sessionStorage");
            setPreservedData(savedState.complaintData);
          }
          
          // Clear sessionStorage to prevent reloading on refresh
          sessionStorage.removeItem('documentPreparationState');
        }
      } catch (error) {
        console.error("[DocumentPreparation] Error parsing sessionStorage data:", error);
        toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      }
    } else if (location.state) {
      // Direct navigation from ComplaintForm with data
      console.log("[DocumentPreparation] Direct navigation with complaint data:", location.state);
    }
  }, [location]);

  // Store the complaint data in the store when the component mounts
  useEffect(() => {
    // If we have preserved data from returning from approval pages, use it
    if (preservedData && !hasSetComplaintData.current) {
      console.log("[DocumentPreparation] Using preserved data from approval page return:", preservedData);
      complaintStore.setComplaintData(preservedData);
      hasSetComplaintData.current = true;
    }
    // If we have complaint data from navigation state, use it
    else if (complaintData && !hasSetComplaintData.current) {
      console.log("[DocumentPreparation] Storing complaint data from navigation state:", complaintData);
      complaintStore.setComplaintData(complaintData);
      hasSetComplaintData.current = true;
    } 
    // If we don't have complaint data from navigation but we have it in the store, keep using it
    else if (!complaintData && !preservedData && complaintStore.complaintData && !hasSetComplaintData.current) {
      console.log("[DocumentPreparation] Using existing complaint data from store:", complaintStore.complaintData);
      hasSetComplaintData.current = true;
    }
    // If we have neither, we might want to redirect or show an error
    else if (!complaintData && !preservedData && !complaintStore.complaintData && !hasSetComplaintData.current) {
      console.error("[DocumentPreparation] No complaint data available from any source");
      toast.error("ไม่พบข้อมูลข้อร้องเรียน กรุณาเลือกข้อร้องเรียนใหม่");
      
      // Navigate back to complaint selection page after a short delay
      const timer = setTimeout(() => {
        navigate('/complaint/create');
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [complaintData, preservedData, complaintStore, navigate]);

  // Validate complaint data to ensure it has required fields
  useEffect(() => {
    const validateComplaintData = () => {
      const data = preservedData || complaintData || complaintStore.complaintData;
      
      if (!data) {
        return false;
      }
      
      // Check for essential fields
      const hasEssentialFields = Boolean(
        (isProcessedPost(data) && data.processed_post_id && data.text) || 
        (!isProcessedPost(data) && data.id)
      );
      
      if (!hasEssentialFields) {
        console.error("[DocumentPreparation] Complaint data is missing essential fields:", data);
        toast.error("ข้อมูลข้อร้องเรียนไม่ครบถ้วน");
        return false;
      }
      
      return true;
    };
    
    if (hasSetComplaintData.current) {
      validateComplaintData();
    }
  }, [complaintData, preservedData, complaintStore.complaintData]);

  // Check if content has changed - now we just check if there's any content
  useEffect(() => {
    // Enable save button if there's any text in the textarea
    setHasContentChanged(documentContent.trim().length > 0);
  }, [documentContent]);

  // Format current date and time for timestamp
  const formatTimestamp = (): string => {
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth() + 1;
    const year = now.getFullYear() + 543; // Convert to Buddhist Era
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    
    return `วันที่ ${day} ${getThaiMonth(month)} ${year} เวลา ${hours}:${minutes} น.`;
  };

  // Get Thai month name
  const getThaiMonth = (month: number): string => {
    const thaiMonths = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];
    return thaiMonths[month - 1];
  };

  // Handle save action
  const handleSave = () => {
    const timestamp = formatTimestamp();
    setPopupTimestamp(timestamp);
    setSaved(timestamp); // Save to store
    setShowSavePopup(true);
    
    // Hide popup after 2 seconds
    setTimeout(() => {
      setShowSavePopup(false);
    }, 2000);
    
    // Get the current complaint data from the store
    const currentComplaintData = complaintStore.complaintData;
    
    console.log("[DocumentPreparation] Saving document with timestamp:", timestamp);
  };

  // Handle approve action
  const handleApprove = () => {
    const timestamp = formatTimestamp();
    setPopupTimestamp(timestamp);
    setApproved(); // Update store
    setShowApprovePopup(true);
    
    // Hide popup and navigate after 2 seconds
    setTimeout(() => {
      setShowApprovePopup(false);
      // Navigate to ApprovalDashboard
      navigate('/approval-dashboard');
    }, 2000);
  };

  // Handle submit for approval action
  const handleSubmitForApproval = () => {
    // Navigate to ApprovalStep
    navigate('/approval-step');
  };

  // Handle cancel action
  const handleCancel = () => {
    navigate(-1);
  };

  // Extract supporting information from complaint data
  const getSupportingInfo = () => {
    if (!complaintData) return null;
    
    if (isProcessedPost(complaintData)) {
      // For ProcessedPost type - access any property that might contain supporting info
      return (complaintData as any).supporting_info || null;
    } else {
      // For Complaint type - access any property that might contain supporting info
      return (complaintData as any).supportingInfo || null;
    }
  };

  // Helper function to safely check if a value is a non-empty string
  const isNonEmptyString = (value: any): boolean => {
    return typeof value === 'string' && value.trim() !== '';
  };

  // Get location data from complaint data
  const getLocationData = (complaintData: Complaint | ProcessedPost | null | undefined) => {
    console.log('[DocumentPreparation] Getting location data from:', complaintData);
    
    // Check if we have location data in the store
    const storeLocationData = useComplaintStore.getState().getLocationData();
    if (storeLocationData && storeLocationData.amphure && storeLocationData.province) {
      console.log('[DocumentPreparation] Found location data in store:', storeLocationData);
      return {
        amphure: cleanLocationString(storeLocationData.amphure),
        province: cleanLocationString(storeLocationData.province)
      };
    }
    
    // If we have complaint data, extract location from it
    if (complaintData) {
      let amphure, province;
      
      if (isProcessedPost(complaintData)) {
        // For ProcessedPost type
        console.log('[DocumentPreparation] Extracting location from ProcessedPost:', {
          amphure: complaintData.amphure,
          province: complaintData.province
        });
        
        // Handle amphure - could be array, string, or undefined
        if (Array.isArray(complaintData.amphure)) {
          // Find first non-empty string in array
          const foundAmphure = complaintData.amphure.find(a => isNonEmptyString(a));
          amphure = foundAmphure ? cleanLocationString(foundAmphure) : undefined;
          console.log('[DocumentPreparation] Extracted amphure from array:', amphure);
        } else if (isNonEmptyString(complaintData.amphure)) {
          amphure = cleanLocationString(complaintData.amphure);
          console.log('[DocumentPreparation] Extracted amphure from string:', amphure);
        }
        
        // Handle province - could be array, string, or undefined
        if (Array.isArray(complaintData.province)) {
          // Find first non-empty string in array
          const foundProvince = complaintData.province.find(p => isNonEmptyString(p));
          province = foundProvince ? cleanLocationString(foundProvince) : undefined;
          console.log('[DocumentPreparation] Extracted province from array:', province);
        } else if (isNonEmptyString(complaintData.province)) {
          province = cleanLocationString(complaintData.province);
          console.log('[DocumentPreparation] Extracted province from string:', province);
        }
      } else {
        // For Complaint type
        console.log('[DocumentPreparation] Extracting location from Complaint:', {
          amphure: (complaintData as any).amphure,
          province: (complaintData as any).province
        });
        
        // Handle amphure - could be array, string, or undefined
        if (Array.isArray((complaintData as any).amphure)) {
          // Find first non-empty string in array
          const foundAmphure = (complaintData as any).amphure.find((a: any) => isNonEmptyString(a));
          amphure = foundAmphure ? cleanLocationString(foundAmphure) : undefined;
          console.log('[DocumentPreparation] Extracted amphure from array:', amphure);
        } else if (isNonEmptyString((complaintData as any).amphure)) {
          amphure = cleanLocationString((complaintData as any).amphure);
          console.log('[DocumentPreparation] Extracted amphure from string:', amphure);
        }
        
        // Handle province - could be array, string, or undefined
        if (Array.isArray((complaintData as any).province)) {
          // Find first non-empty string in array
          const foundProvince = (complaintData as any).province.find((p: any) => isNonEmptyString(p));
          province = foundProvince ? cleanLocationString(foundProvince) : undefined;
          console.log('[DocumentPreparation] Extracted province from array:', province);
        } else if (isNonEmptyString((complaintData as any).province)) {
          province = cleanLocationString((complaintData as any).province);
          console.log('[DocumentPreparation] Extracted province from string:', province);
        }
      }
      
      if (amphure || province) {
        console.log('[DocumentPreparation] Final extracted location:', { amphure, province });
        return { amphure, province };
      } else {
        console.warn('[DocumentPreparation] No valid location data found in complaint data');
      }
    } else {
      console.warn('[DocumentPreparation] No complaint data available to extract location from');
    }
    
    // If we couldn't extract location data, return undefined
    return { amphure: undefined, province: undefined };
  };

  const { amphure, province } = getLocationData(complaintData);

  // When displaying location in the UI
  const displayAmphure = amphure ? formatLocationForDisplay(amphure, 'amphure') : undefined;
  const displayProvince = province ? formatLocationForDisplay(province, 'province') : undefined;

  return (
    <div className="min-h-screen bg-[#F0F8FF]">
      <DocumentPreparationHeader />
      
      {/* Page Title */}
      <div className="bg-[#EBF5FF]">
        <div className="container mx-auto px-12 pt-6 pb-4">
          <h1 className="text-2xl font-semibold text-[#17254D] mb-4">ระบบตอบประเด็นข้อร้องเรียน</h1>
        </div>
      </div>
      
      <main className="container mx-auto px-12 pt-2 pb-20">
        {/* Complaint Data Section */}
        <div className="mb-6">
          <Card className="p-8 shadow-sm">
            {complaintData && (
              <SocialPostInfo complaint={complaintData} />
            )}
          </Card>
        </div>
        
        {/* Supporting Data Section - Using the same grid layout as ComplaintForm */}
        <div className="grid grid-cols-1 gap-6 mt-6">
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">ข้อมูลสนับสนุน</h3>
            <div className="grid grid-cols-1 gap-6">
              <Card className="p-8 shadow-sm">
                <WaterLevelInfo 
                  amphure={amphure}
                  province={province}
                />
              </Card>
              <Card className="p-8 shadow-sm">
                <WaterManagementPlan 
                  amphure={amphure}
                  province={province}
                />
              </Card>
            </div>
          </div>
        </div>
        
        {/* ร่างเอกสารตอบ Frameset */}
        <div className="mb-6">
          <Card className="p-8 shadow-sm">
            {/* Frame Header */}
            <h2 className="text-2xl font-semibold text-[#17254D] mb-6">ร่างเอกสารตอบ</h2>
            
            {/* Top line with dropdown and icons */}
            <div className="flex justify-between items-center mb-6">
              <div className="relative">
                <button className="flex items-center gap-2 bg-white border border-gray-300 rounded-xl px-4 py-2 text-base text-gray-700">
                  <span>สื่อสังคมออนไลน์</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-4">
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <img src={ShareIcon} alt="Share" className="w-5 h-5" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <img src={PrinterIcon} alt="Print" className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* ลำดับการร่างเอกสาร section */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <img src={CalendarIcon} alt="Calendar" className="w-8 h-8" />
                <h3 className="text-xl font-semibold text-[#17254D]">ลำดับการร่างเอกสาร</h3>
              </div>
              
              {/* Timeline with dotted line */}
              <div className="relative">
                {/* Dotted vertical line */}
                <div className="absolute left-4 top-[24px] bottom-[24px] w-[1px] border-l border-dashed border-gray-400"></div>
                
                {/* ร่างเอกสารตอบ section */}
                <div className="mb-6 relative mt-8 pl-4">
                  <div className="flex items-center gap-2 mb-3 relative z-10 bg-white">
                    <img src={ClipboardIcon} alt="Clipboard" className="w-8 h-8" />
                    <h4 className="text-lg font-medium text-[#17254D]">ร่างเอกสารตอบ</h4>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-4 ml-8">
                    <p className="text-base text-gray-700">
                      ในช่วงหน้าฝนทาง สชป.๑ จะมีแนวทางให้แต่ละพื้นที่บริหารจัดการน้ำโดยใช้น้ำฝนก่อนเป็นอันดับแรก ถ้าหากเกิดฝนทิ้งช่วงจะจัดสรรน้ำ
                      ช่วยเหลือ ตามความต้องการใช้น้ำจริง ๆ ในพื้นที่ และตามเกณฑ์ บริหารจัดการน้ำของอ่างเก็บน้ำต่าง ๆ ซึ่ง สชป.๑ ได้สำรองน้ำในส่วนนี้ไว้แหล่งกักเก็บน้ำแล้ว
                      อย่างเพียงพอ ทั้งนี้ สชป.๑ จะพยายามรักษาปริมาณน้ำในอ่างเก็บน้ำและเก็บกักน้ำไว้ให้ได้มากที่สุด เมื่อสิ้นสุดฤดูฝน สำหรับใช้ในฤดูแล้ง ๒๕๖๗/๖๘
                    </p>
                  </div>
                </div>
                
                {/* สร้างร่างเอกสารตอบ section */}
                <div className="mb-6 relative pl-4">
                  <div className="flex items-center gap-2 mb-3 relative z-10 bg-white">
                    <img src={ClipboardIcon} alt="Clipboard" className="w-8 h-8" />
                    <h4 className="text-lg font-medium text-[#17254D]">สร้างร่างเอกสารตอบ</h4>
                  </div>
                  
                  {/* Show timestamp and approver info after save */}
                  {isSaved && (
                    <div className="ml-8 mb-3 text-sm text-gray-500">
                      {saveTimestamp} สร้างโดย {approverInfo}
                    </div>
                  )}
                  
                  <div className="ml-8">
                    <textarea
                      value={documentContent}
                      onChange={(e) => setDocumentContent(e.target.value)}
                      className="w-full h-64 p-5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                      placeholder="พิมพ์ร่างเอกสารตอบที่นี่..."
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Action Buttons moved inside the frame */}
            <div className="pt-6 mt-6">
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleSave}
                  disabled={!hasContentChanged}
                  className={`flex items-center justify-center gap-2 ${
                    hasContentChanged 
                      ? "bg-[#4B9FE1] hover:bg-[#3D8FD1] text-white" 
                      : "bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed"
                  } px-6 py-3 rounded-xl transition-colors duration-200`}
                >
                  <Save className="w-5 h-5" />
                  <span>บันทึก</span>
                </button>
                
                <button
                  onClick={handleApprove}
                  disabled={!isSaved}
                  className={`flex items-center justify-center gap-2 ${
                    isSaved 
                      ? "bg-[#4B9FE1] hover:bg-[#3D8FD1] text-white" 
                      : "bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed"
                  } px-6 py-3 rounded-xl transition-colors duration-200`}
                >
                  <Check className="w-5 h-5" />
                  <span>เห็นชอบ</span>
                </button>
                
                <button
                  onClick={handleSubmitForApproval}
                  disabled={!isApproved}
                  className={`flex items-center justify-center gap-2 ${
                    isApproved 
                      ? "bg-[#4B9FE1] hover:bg-[#3D8FD1] text-white" 
                      : "bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed"
                  } px-6 py-3 rounded-xl transition-colors duration-200`}
                >
                  <Send className="w-5 h-5" />
                  <span>ส่งเข้ากระบวนการเห็นชอบ</span>
                </button>
              </div>
            </div>
          </Card>
        </div>
      </main>
      
      {/* Success Popups */}
      {showSavePopup && (
        <SuccessPopup 
          title="บันทึกสำเร็จ" 
          timestamp={popupTimestamp}
          onClose={() => setShowSavePopup(false)}
        />
      )}
      
      {showApprovePopup && (
        <SuccessPopup 
          title="เห็นชอบสำเร็จ" 
          timestamp={popupTimestamp}
          onClose={() => setShowApprovePopup(false)}
        />
      )}
    </div>
  );
};

export default DocumentPreparation; 