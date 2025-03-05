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
import { useEffect, useState, useRef } from "react";
// Replace Zustand store with Jotai hooks
import { useComplaintData } from "@/atoms/hooks";
import { useStationData } from "@/atoms/hooks";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
// Import the reusable components
import { ComplaintInfoCard, WaterLevelInfoCard, WaterManagementPlanCard } from "@/components/shared";

// Declare the window property for TypeScript
declare global {
  interface Window {
    _stationDataUpdateIntentional?: boolean;
  }
}

// Create a FormComplaint type that extends Complaint with additional fields needed in the form
// but overrides some fields to match ComplaintDTO schema
interface FormComplaint extends Omit<Complaint, 'id' | 'province'> {
  id: number; // Override to match ComplaintDTO
  issue?: string;
  category?: string;
  reporter?: string;
  date?: string;
  coordinates?: { lat: number; lng: number };
  tumbon?: string[];
  amphure?: string[];
  province?: string[]; // Override to match ComplaintDTO
  location?: string;
}

// Update the ExtendedComplaintData interface to match the FormComplaint type
interface ExtendedComplaintData {
  id: string | number; // Allow both string and number to handle different sources
  content: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  type?: string;
  province?: string | string[]; // Allow both string and array to handle different sources
  postId?: string;
  link?: string;
  // Additional fields used in the form
  issue?: string;
  category?: string;
  reporter?: string;
  date?: string;
  coordinates?: { lat: number; lng: number };
  tumbon?: string[];
  amphure?: string[];
  location?: string;
}

// Add type guards to check data types
function isExtendedComplaintData(data: any): data is ExtendedComplaintData {
  return data && 
    (typeof data.id === 'string' || typeof data.id === 'number') && 
    typeof data.content === 'string' && 
    typeof data.createdAt === 'string' && 
    typeof data.updatedAt === 'string' && 
    typeof data.status === 'string';
}

function isComplaint(data: any): data is Complaint {
  return data && 
    typeof data.id === 'string' && 
    typeof data.content === 'string' && 
    typeof data.createdAt === 'string' &&
    typeof data.updatedAt === 'string' &&
    typeof data.status === 'string';
}

// Type guard to check if data is ProcessedPost
const isProcessedPost = (data: any): data is ProcessedPost => {
  return 'processed_post_id' in data && 'text' in data && 'category_name' in data;
};

// Update the convertToComplaintFormat function to handle ExtendedComplaintData
const convertToComplaintFormat = (data: ProcessedPost | Complaint | ExtendedComplaintData): FormComplaint => {
  // If it's already a Complaint, add form fields
  if (isComplaint(data)) {
    return {
      ...data,
      // Convert id to number for validation
      id: typeof data.id === 'string' ? parseInt(data.id, 10) || 0 : data.id,
      issue: data.content,
      category: data.type || '',
      coordinates: { lat: 0, lng: 0 }, // Default coordinates
      tumbon: [],
      // Convert province to array for validation
      province: typeof data.province === 'string' ? [data.province] : 
               (Array.isArray(data.province) ? 
                (data.province as string[]) : []),
      amphure: [],
      location: data.province || ''
    };
  }
  
  // If it's an ExtendedComplaintData, convert it to FormComplaint
  if (isExtendedComplaintData(data)) {
    return {
      // Convert id to number for validation
      id: typeof data.id === 'string' ? parseInt(data.id, 10) || 0 : 
         (typeof data.id === 'number' ? data.id : 0),
      content: data.content,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      status: data.status,
      type: data.type,
      // Convert province to array for validation
      province: typeof data.province === 'string' ? [data.province] : 
               (Array.isArray(data.province) ? 
                (data.province as string[]) : []),
      postId: data.postId,
      link: data.link,
      // Form fields
      issue: data.issue || data.content,
      category: data.category || data.type || '',
      reporter: data.reporter || '',
      date: data.date || '',
      coordinates: data.coordinates || { lat: 0, lng: 0 },
      tumbon: data.tumbon || [],
      amphure: data.amphure || [],
      location: data.location || (typeof data.province === 'string' ? data.province : '')
    };
  }
  
  // Otherwise, it's a ProcessedPost, convert it to FormComplaint
  return {
    // Convert id to number for validation
    id: typeof data.processed_post_id === 'string' ? 
      parseInt(data.processed_post_id, 10) || 0 : 
      (typeof data.processed_post_id === 'number' ? data.processed_post_id : 0),
    content: data.text || '',
    createdAt: data.created_at || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: data.status || 'pending',
    type: data.category_name || '',
    // Convert province to array for validation
    province: Array.isArray(data.province) ? 
              (data.province as string[]) : 
              (typeof data.province === 'string' ? [data.province] : []),
    postId: String(data.processed_post_id),
    link: data.post_url || '',
    // Form fields
    issue: data.text || '',
    category: data.category_name || '',
    reporter: data.profile_name || '',
    date: data.post_date instanceof Date 
      ? data.post_date.toISOString().split('T')[0] 
      : (typeof data.post_date === 'string' 
        ? new Date(data.post_date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]),
    coordinates: { lat: data.latitude || 0, lng: data.longitude || 0 },
    tumbon: Array.isArray(data.tumbon) ? data.tumbon : 
            (data.tumbon ? [data.tumbon].filter(Boolean) : []),
    amphure: Array.isArray(data.amphure) ? data.amphure : 
             (data.amphure ? [data.amphure].filter(Boolean) : []),
    location: [
      ...(Array.isArray(data.tumbon) ? data.tumbon : (data.tumbon ? [data.tumbon] : [])).filter(Boolean),
      ...(Array.isArray(data.amphure) ? data.amphure : (data.amphure ? [data.amphure] : [])).filter(Boolean),
      ...(Array.isArray(data.province) ? data.province : (data.province ? [data.province] : [])).filter(Boolean)
    ].join(', ')
  };
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
  const complaintDataFromLocation = location.state as ProcessedPost | undefined;
  const { isLoading, complaint } = useComplaint(postId ? Number(postId) : undefined);
  
  // Get complaint data from Jotai store
  const { 
    title, 
    description, 
    updateTitle,
    updateDescription,
    updateLocation,
    updateCoordinates,
    updateProcessedPosts,
    togglePostSelection
  } = useComplaintData();
  
  // Get station data from Jotai store
  const stationData = useStationData();
  
  // State to track if we're returning from StationCardEdit
  const [returnedFromStationEdit, setReturnedFromStationEdit] = useState(false);
  
  // State for preserving data when returning from StationCardEdit
  const [preservedData, setPreservedData] = useState<Complaint | ExtendedComplaintData | ProcessedPost | null>(null);
  
  // Ref to track if initial state restoration has been done
  const initialStateRestored = useRef(false);
  
  // Check if we're returning from StationCardEdit
  useEffect(() => {
    if (location.state?.returnedFromStationEdit) {
      console.log('[ComplaintForm] Detected return from StationCardEdit');
      setReturnedFromStationEdit(true);
      
      // Set preserved data if available
      if (location.state.preserveState && complaintDataFromLocation) {
        setPreservedData(complaintDataFromLocation as any);
        
        // If we have complaint data in location state, update the Jotai store
        const { updateTitle, updateDescription } = useComplaintData();
        
        // Use type assertion to safely access properties
        const data = complaintDataFromLocation as any;
        if (data.text) {
          updateTitle(data.text);
        }
        if (data.content) {
          updateDescription(data.content);
        }
      }

      // No need to get station data from sessionStorage as it's already in Jotai store
      // The StationCardEdit component should have updated the Jotai store before navigation
      console.log('[ComplaintForm] Using station data from Jotai store');
    }
  }, [
    location.state, 
    complaintDataFromLocation
  ]);

  // Debug location data
  useEffect(() => {
    const currentData = preservedData || complaint || complaintDataFromLocation;
    console.log('[ComplaintForm] Current complaint data:', currentData);
    
    if (currentData) {
      const locationData = convertToComplaintFormat(currentData);
      console.log('[ComplaintForm] Location data extracted:', {
        amphure: locationData.amphure,
        province: locationData.province,
        tumbon: locationData.tumbon
      });
    }
  }, [preservedData, complaint, complaintDataFromLocation]);

  const validateComplaintData = () => {
    // Use preserved complaint data if returning from StationCardEdit
    const currentData = preservedData || complaint || complaintDataFromLocation;
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
    // Validate the complaint data
    if (!validateComplaintData()) {
      return;
    }
    
    // Save the current state using the useStationData hook
    if (stationData.saveStationDataForNavigation) {
      stationData.saveStationDataForNavigation('handleContinue');
    }
    
    // Navigate to the station card edit page
    navigate('/station-card-edit', { 
      state: { 
        complaintData: complaint || preservedData || complaintDataFromLocation
      } 
    });
  };

  const handlePrepareDocument = () => {
    // Validate the complaint data
    if (!validateComplaintData()) {
      return;
    }
    
    // Save the current state using the useStationData hook
    if (stationData.saveStationDataForNavigation) {
      stationData.saveStationDataForNavigation('handlePrepareDocument');
    }
    
    // Get the current complaint data
    const currentComplaintData = preservedData || complaint || complaintDataFromLocation;
    
    // Navigate to the document preparation page
    navigate('/document-preparation', { 
      state: { 
        fromComplaintForm: true,
        complaintData: currentComplaintData
      } 
    });
  };

  // Add a function to handle returning to the dashboard
  const handleReturnToDashboard = () => {
    // Save the current state if needed
    if (complaint || complaintDataFromLocation) {
      // Update the title and description in the store
      const contentText = complaint?.content || (complaintDataFromLocation as any)?.issue || '';
      updateTitle(contentText);
      updateDescription(contentText);
    }
    
    // Navigate back to the dashboard
    navigate('/dashboard');
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Use preserved complaint data if returning from StationCardEdit
  const data = preservedData || complaint || complaintDataFromLocation;
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
    provinceType: locationData?.province ? typeof locationData.province : 'undefined',
    timestamp: new Date().toISOString()
  });
  
  // Handle amphure data - could be string, array, or undefined
  if (locationData?.amphure) {
    if (Array.isArray(locationData.amphure)) {
      // If it's an array, take the first non-empty value
      firstAmphure = locationData.amphure.find(a => isNonEmptyString(a)) || undefined;
      console.log('[ComplaintForm] Extracted amphure from array:', firstAmphure);
    } else if (isNonEmptyString(locationData.amphure)) {
      // If it's a string, use it directly
      firstAmphure = locationData.amphure;
      console.log('[ComplaintForm] Using amphure string directly:', firstAmphure);
    }
  }
  
  // Handle province data - could be string, array, or undefined
  if (locationData?.province) {
    if (Array.isArray(locationData.province)) {
      // If it's an array, take the first non-empty value
      firstProvince = locationData.province.find(p => isNonEmptyString(p)) || undefined;
      console.log('[ComplaintForm] Extracted province from array:', firstProvince);
    } else if (isNonEmptyString(locationData.province)) {
      // If it's a string, use it directly
      firstProvince = locationData.province;
      console.log('[ComplaintForm] Using province string directly:', firstProvince);
    }
  }
  
  // No more fallback to hardcoded values - if we don't have location data, we'll show appropriate UI
  if (!firstAmphure && !firstProvince) {
    console.warn('[ComplaintForm] No valid location data found in complaint data');
  }
  
  console.log('[ComplaintForm] Final location data being passed to components:', { 
    firstAmphure, 
    firstProvince,
    isAmphureDefined: !!firstAmphure,
    isProvinceDefined: !!firstProvince,
    timestamp: new Date().toISOString()
  });

  // Helper function to convert ExtendedComplaintData to Complaint
  const convertToComplaintType = (data: Complaint | ExtendedComplaintData | ProcessedPost | null): Complaint | ProcessedPost | null => {
    if (!data) return null;
    
    if (isExtendedComplaintData(data)) {
      // Convert ExtendedComplaintData to Complaint
      return {
        id: typeof data.id === 'number' ? String(data.id) : data.id as string,
        content: data.content,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        status: data.status,
        type: data.type,
        province: typeof data.province === 'string' ? data.province : 
                 (Array.isArray(data.province) && data.province.length > 0 ? data.province[0] : ''),
        postId: data.postId,
        link: data.link
      };
    }
    
    return data;
  };

  return (
    <div className="min-h-screen bg-[#F0F8FF] pb-32">
      <ComplaintHeader />
      
      {/* Page Title */}
      <div className="bg-[#EBF5FF]">
        <div className="container mx-auto px-12 pt-6 pb-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-[#17254D]">ระบบตอบประเด็นข้อร้องเรียน</h1>
            <div className="flex gap-2">
              <Button 
                onClick={handleReturnToDashboard}
                variant="outline"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                กลับไปยังหน้าหลัก
              </Button>
              {returnedFromStationEdit && (
                <Button 
                  onClick={handleContinue}
                  className="flex items-center gap-2"
                >
                  ดำเนินการต่อ
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center mb-2">
            <button 
              className="bg-[#4B9FE1] hover:bg-[#3D8FD1] text-white px-2 py-2 rounded-xl w-[150px] h-[42px] font-medium flex items-center justify-center transition-colors duration-200 text-base whitespace-nowrap"
              onClick={handleContinue}
            >
              เพิ่มเติม/แก้ไขข้อมูล
            </button>
            <div className="w-[10px]"></div>
            <button 
              className="bg-white hover:bg-[#f0f9ff] text-[#4B9FE1] border-[1.5px] border-[#4B9FE1] px-2 py-2 rounded-xl w-[140px] h-[42px] font-medium flex items-center justify-center transition-colors duration-200 text-base whitespace-nowrap"
              onClick={handlePrepareDocument}
            >
              เตรียมร่างเอกสาร
            </button>
          </div>
        </div>
      </div>
      
      <main className="container mx-auto px-12 pt-2">
        {/* Complaint Data Section */}
        <div className="mb-6">
          <Card className="p-6 shadow-sm">
            <SocialPostInfo complaint={convertToComplaintType(data || null)} />
          </Card>
        </div>
        
        {/* Supporting Data Section */}
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 shadow-sm">
              <WaterLevelInfo 
                amphure={firstAmphure}
                province={firstProvince}
                returnedFromStationEdit={returnedFromStationEdit}
              />
            </Card>
            <Card className="p-6 shadow-sm">
              <WaterManagementPlan 
                amphure={firstAmphure}
                province={firstProvince}
              />
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ComplaintForm;