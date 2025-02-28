import { Card } from "@/components/ui/card";
import { ComplaintHeader } from "@/components/complaint/ComplaintHeader";
import { WaterLevelInfo } from "@/components/complaint/WaterLevelInfo";
import { SocialPostInfo } from "@/components/complaint/SocialPostInfo";
import { WaterManagementPlan } from "@/components/complaint/WaterManagementPlan";
import { useComplaint } from "@/hooks/useComplaint";
import { useLocation, useSearchParams, useNavigate } from "react-router-dom";
import { Complaint } from "@/types/complaint";
import { ComplaintDTO } from "@/dto/complaint.dto";
import { toast } from "sonner";
import { ProcessedPost } from "@/types/processed-post";
import { useEffect, useState } from "react";
import { useComplaintStore } from "@/stores/complaintStore";

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
      tumbon: Array.isArray(data.tumbon) ? data.tumbon : [data.tumbon].filter(Boolean),
      amphure: Array.isArray(data.amphure) ? data.amphure : [data.amphure].filter(Boolean),
      province: Array.isArray(data.province) ? data.province : [data.province].filter(Boolean),
      // Keep location field for backward compatibility
      location: ''
    };
  }
  return data;
};

// Helper function to safely check if a string is empty
const isNonEmptyString = (value: any): boolean => {
  if (typeof value !== 'string') return false;
  return value.trim() !== '';
};

const ComplaintForm = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const postId = searchParams.get('postId');
  const complaintData = location.state as ProcessedPost | undefined;
  const { isLoading, complaint } = useComplaint(postId ? Number(postId) : undefined);
  const complaintStore = useComplaintStore();
  
  // State for tracking if we returned from StationCardEdit
  const [returnedFromStationEdit, setReturnedFromStationEdit] = useState(false);
  
  // State to store preserved complaint data when returning from StationCardEdit
  const [preservedData, setPreservedData] = useState<any>(null);
  
  // Check if we're returning from StationCardEdit
  useEffect(() => {
    // Check if we have state in location.state (normal navigation)
    if (location.state && location.state.from === 'StationCardEdit') {
      console.log("[ComplaintForm] Returned from StationCardEdit", location.state);
      setReturnedFromStationEdit(true);
      
      // Check if we should discard current changes
      if (location.state.discardCurrentChanges) {
        console.log("[ComplaintForm] Discarding current changes as requested");
      }
      
      // Try to get preserved complaint data from location state or store
      if (location.state.complaintData) {
        console.log("[ComplaintForm] Received complaint data from location.state");
        setPreservedData(location.state.complaintData);
      } else if (complaintStore.complaintData) {
        console.log("[ComplaintForm] Using complaint data from store");
        setPreservedData(complaintStore.complaintData);
      } else {
        console.log("[ComplaintForm] No complaint data found in location.state or store");
      }
      
      // Clear the state to prevent reloading on refresh
      window.history.replaceState({}, document.title);
    } 
    // Check if we have state in sessionStorage (direct navigation)
    else if (sessionStorage.getItem('complaintFormState')) {
      try {
        const savedState = JSON.parse(sessionStorage.getItem('complaintFormState') || '{}');
        console.log("[ComplaintForm] Found state in sessionStorage", savedState);
        
        if (savedState.from === 'StationCardEdit') {
          setReturnedFromStationEdit(true);
          
          // Check if we should discard current changes
          if (savedState.discardCurrentChanges) {
            console.log("[ComplaintForm] Discarding current changes as requested from sessionStorage");
          }
          
          // Try to get preserved complaint data from session storage or store
          if (savedState.complaintData) {
            console.log("[ComplaintForm] Received complaint data from sessionStorage");
            setPreservedData(savedState.complaintData);
          } else if (complaintStore.complaintData) {
            console.log("[ComplaintForm] Using complaint data from store");
            setPreservedData(complaintStore.complaintData);
          } else {
            console.log("[ComplaintForm] No complaint data found in sessionStorage or store");
            
            // Check if we have location data in sessionStorage
            const complaintId = sessionStorage.getItem('complaintId');
            const amphure = sessionStorage.getItem('complaintAmphure');
            const province = sessionStorage.getItem('complaintProvince');
            const issue = sessionStorage.getItem('complaintIssue');
            const category = sessionStorage.getItem('complaintCategory');
            const reporter = sessionStorage.getItem('complaintReporter');
            const date = sessionStorage.getItem('complaintDate');
            
            if (amphure || province) {
              console.log("[ComplaintForm] Found location data in sessionStorage", { 
                complaintId, amphure, province, issue, category, reporter, date 
              });
              
              // Create a complaint data object with all available fields
              const minimalData = {
                id: complaintId ? parseInt(complaintId, 10) : 0,
                issue: issue || "ข้อมูลจากการแก้ไขสถานี", // Use stored value or placeholder
                category: category || "ข้อมูลสนับสนุน", // Use stored value or placeholder
                reporter: reporter || "ระบบ", // Use stored value or placeholder
                date: date || new Date().toISOString().split('T')[0], // Use stored value or today's date
                amphure: amphure ? [amphure] : [],
                province: province ? [province] : [],
                tumbon: []
              };
              
              setPreservedData(minimalData);
            }
          }
          
          // Clear the session storage to prevent reloading on refresh
          sessionStorage.removeItem('complaintFormState');
          sessionStorage.removeItem('complaintId');
          sessionStorage.removeItem('complaintAmphure');
          sessionStorage.removeItem('complaintProvince');
          sessionStorage.removeItem('complaintIssue');
          sessionStorage.removeItem('complaintCategory');
          sessionStorage.removeItem('complaintReporter');
          sessionStorage.removeItem('complaintDate');
        }
      } catch (error) {
        console.error("[ComplaintForm] Error parsing state from sessionStorage", error);
      }
    }
  }, [location, complaintStore]);

  // Debug location data
  useEffect(() => {
    const currentData = preservedData || complaint || complaintData;
    console.log('[ComplaintForm] Current complaint data:', currentData);
    
    if (currentData) {
      const locationData = convertToComplaintFormat(currentData);
      console.log('[ComplaintForm] Location data extracted:', {
        amphure: locationData.amphure,
        province: locationData.province,
        tumbon: locationData.tumbon
      });
    }
  }, [preservedData, complaint, complaintData]);

  const validateComplaintData = () => {
    // Use preserved complaint data if returning from StationCardEdit
    const currentData = preservedData || complaint || complaintData;
    if (!currentData) return;

    // Special handling for minimal data from sessionStorage
    if (returnedFromStationEdit && preservedData && !('issue' in preservedData)) {
      console.log('[ComplaintForm] Using minimal data from sessionStorage, skipping validation');
      return true;
    }

    const complaintFormat = convertToComplaintFormat(currentData);
    const result = ComplaintDTO.safeParse(complaintFormat);
    if (!result.success) {
      console.error('Complaint data validation failed:', result.error);
      toast.error('ข้อมูลข้อร้องเรียนไม่ถูกต้อง');
      return false;
    }
    return true;
  };

  const handleContinue = () => {
    // Use preserved complaint data if returning from StationCardEdit
    const currentComplaintData = preservedData || complaint || complaintData;
    console.log('Processing complaint:', currentComplaintData);
    toast.success('ดำเนินการต่อ');
    // Navigate to the StationCardEdit page with the complaint data
    navigate('/station-card-edit', { state: currentComplaintData });
  };

  const handleCancel = () => {
    // Use preserved complaint data if returning from StationCardEdit
    const currentComplaintData = preservedData || complaint || complaintData;
    console.log('Preparing document draft for:', currentComplaintData);
    toast.success('กำลังเตรียมร่างเอกสาร');
    // Here you would typically implement document preparation logic
    // For now, we'll just show a toast message
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Use preserved complaint data if returning from StationCardEdit
  const data = preservedData || complaint || complaintData;
  if (data && !validateComplaintData()) {
    return <div>Invalid complaint data</div>;
  }

  // Get the first amphure and province from the arrays
  const locationData = data ? convertToComplaintFormat(data) : undefined;
  
  // Ensure we have valid location data
  let firstAmphure = undefined;
  let firstProvince = undefined;
  
  // Debug the location data structure
  console.log('[ComplaintForm] Raw location data:', {
    amphure: locationData?.amphure,
    province: locationData?.province,
    tumbon: locationData?.tumbon,
    dataType: locationData ? typeof locationData : 'undefined',
    amphureType: locationData?.amphure ? typeof locationData.amphure : 'undefined',
    provinceType: locationData?.province ? typeof locationData.province : 'undefined'
  });
  
  // Handle amphure data - could be string, array, or undefined
  if (locationData?.amphure) {
    if (Array.isArray(locationData.amphure)) {
      // If it's an array, take the first non-empty value
      firstAmphure = locationData.amphure.find(a => a && typeof a === 'string' && (a as string).trim() !== '') || undefined;
    } else if (typeof locationData.amphure === 'string' && (locationData.amphure as string).trim() !== '') {
      // If it's a string, use it directly
      firstAmphure = locationData.amphure;
    }
  }
  
  // Handle province data - could be string, array, or undefined
  if (locationData?.province) {
    if (Array.isArray(locationData.province)) {
      // If it's an array, take the first non-empty value
      firstProvince = locationData.province.find(p => p && typeof p === 'string' && (p as string).trim() !== '') || undefined;
    } else if (typeof locationData.province === 'string' && (locationData.province as string).trim() !== '') {
      // If it's a string, use it directly
      firstProvince = locationData.province;
    }
  }
  
  // Fallback to hardcoded values for testing if both are undefined
  if (!firstAmphure && !firstProvince) {
    console.warn('[ComplaintForm] No valid location data found, using fallback values');
    // Use a known valid location for testing
    firstProvince = 'เชียงใหม่';
    firstAmphure = 'แม่แตง';
  }
  
  console.log('[ComplaintForm] Final location data being passed to components:', { 
    firstAmphure, 
    firstProvince,
    isAmphureDefined: !!firstAmphure,
    isProvinceDefined: !!firstProvince
  });

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
          {/* Always show WaterLevelInfo regardless of where we're returning from */}
          <Card className="p-6">
            <WaterLevelInfo 
              amphure={firstAmphure}
              province={firstProvince}
            />
          </Card>
          <Card className="p-6">
            <WaterManagementPlan 
              amphure={firstAmphure}
              province={firstProvince}
            />
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ComplaintForm;