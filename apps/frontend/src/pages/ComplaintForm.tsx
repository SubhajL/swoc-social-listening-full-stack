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
import { useEffect, useState, useRef, useTransition, useCallback } from "react";
// Replace Zustand store with Jotai hooks
import { useComplaintData } from "@/atoms/hooks";
import { useStationData } from "@/atoms/hooks";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
// Import the reusable components
import { ComplaintInfoCard, WaterLevelInfoCard, WaterManagementPlanCard } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";
// Import mock data
import { MOCK_PROCESSED_POSTS, USE_MOCK_DATA } from "@/utils/mockData";

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
  return data && typeof data === 'object' && 
    ('processed_post_id' in data && 'text' in data && 'category_name' in data && 'profile_name' in data);
};

// Simplified conversion logic with proper type handling
const convertToComplaintFormat = (data: any): FormComplaint => {
  // Handle ProcessedPost from API
  if ('processed_post_id' in data) {
    return {
      id: typeof data.processed_post_id === 'string' ? parseInt(data.processed_post_id, 10) : data.processed_post_id,
      issue: data.text || '',
      category: data.category_name || '',
      province: Array.isArray(data.province) ? data.province : (data.province ? [data.province] : []),
      amphure: Array.isArray(data.amphure) ? data.amphure : (data.amphure ? [data.amphure] : []),
      content: data.text || '',
      createdAt: data.post_date ? (typeof data.post_date === 'string' ? data.post_date : data.post_date.toISOString()) : '',
      updatedAt: data.created_at || '',
      status: data.status || 'new'
    };
  }
  
  // Handle Complaint type
  return {
    id: typeof data.id === 'string' ? parseInt(data.id, 10) : (data.id || 0),
    issue: data.content || '',
    category: data.type || '',
    province: Array.isArray(data.province) ? data.province : (data.province ? [data.province] : []),
    amphure: data.amphure || [],
    content: data.content || '',
    createdAt: data.createdAt || '',
    updatedAt: data.updatedAt || '',
    status: data.status || 'new'
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
  
  // Add isPending state for transitions
  const [isPending, startTransition] = useTransition();
  
  // Get complaint data from Jotai store
  const {
    title, 
    description, 
    updateTitle,
    updateDescription,
    updateLocation,
    updateCoordinates,
    updateProcessedPosts,
    togglePostSelection,
    processedPosts,
    selectedPostIds
  } = useComplaintData();
  
  // Get station data from Jotai store
  const stationData = useStationData();
  
  // State to track if we're returning from StationCardEdit
  const [returnedFromStationEdit, setReturnedFromStationEdit] = useState(false);
  
  // State for preserving data when returning from StationCardEdit
  const [preservedData, setPreservedData] = useState<Complaint | ExtendedComplaintData | ProcessedPost | null>(null);
  
  // Ref to track if initial state restoration has been done
  const initialStateRestored = useRef(false);
  
  // State to track if mock data is being used
  const [usingMockData, setUsingMockData] = useState(false);

  // TEMPORARY: Load mock data when PostgreSQL is unavailable
  useEffect(() => {
    if (USE_MOCK_DATA && processedPosts.length === 0) {
      console.log('[ComplaintForm] 🚨 USING MOCK DATA - PostgreSQL is unavailable 🚨');
      
      // Update Jotai state with mock data
      updateProcessedPosts(MOCK_PROCESSED_POSTS);
      setUsingMockData(true);
      
      // Set the current amphure and province values directly for the mock data
      // This will allow the WaterLevelInfoCard to make the appropriate API queries
      if (stationData.updateLocation) {
        console.log('[ComplaintForm] Setting location for mock data: แม่แตง, เชียงใหม่', {
          currentAmphure: stationData.currentAmphure,
          currentProvince: stationData.currentProvince,
          timestamp: new Date().toISOString()
        });
        
        // Update the location in the Jotai store
        stationData.updateLocation('แม่แตง', 'เชียงใหม่');
        
        // Clear the flag after a short delay
        setTimeout(() => {
          console.log('[ComplaintForm] Cleared intentional update flag, current location:', {
            currentAmphure: stationData.currentAmphure,
            currentProvince: stationData.currentProvince,
            timestamp: new Date().toISOString()
          });
        }, 500);
      }
    }
  }, [updateProcessedPosts, processedPosts.length, stationData]);
  
  // Initialize Jotai state with data from API or location state
  useEffect(() => {
    // Get data from all possible sources
    const currentData = preservedData || complaint || complaintDataFromLocation;
    
    if (currentData) {
      console.log('[ComplaintForm] Initializing Jotai state with data:', currentData);
      
      // Update Jotai state with current complaint data
      if ('content' in currentData && currentData.content) {
        updateDescription(currentData.content);
      } else if ('text' in currentData && currentData.text) {
        updateDescription(currentData.text);
      }

      if ('type' in currentData && currentData.type) {
        updateTitle(currentData.type);
      } else if ('category_name' in currentData && currentData.category_name) {
        updateTitle(currentData.category_name);
      }

      // Update location in Jotai store if available
      if (currentData.province) {
        const province = Array.isArray(currentData.province) ? 
                        currentData.province[0] : currentData.province;
        
        // Use type guard to safely access amphure property
        let amphure = '';
        if ('amphure' in currentData && currentData.amphure) {
          amphure = Array.isArray(currentData.amphure) ? 
                    currentData.amphure[0] : currentData.amphure;
        }
        
        if (province && stationData.updateLocation) {
          stationData.updateLocation(amphure, province);
        }
      }
    } else {
      console.log('[ComplaintForm] No data available to initialize Jotai state');
    }
  }, [preservedData, complaint, complaintDataFromLocation, updateDescription, updateTitle, stationData]);
  
  // Extract location data from Jotai store only
  const extractLocationData = useCallback(() => {
    // Get location data directly from Jotai store
    const amphure = stationData.currentAmphure;
    const province = stationData.currentProvince;
    
    console.log('[ComplaintForm] Getting location from Jotai store:', { 
      amphure, 
      province,
      timestamp: new Date().toISOString()
    });
    
    return { amphure, province };
  }, [stationData]);
  
  // Update location in Jotai store when component mounts or data changes
  useEffect(() => {
    // Skip updating location if we're using mock data
    if (usingMockData) {
      console.log('[ComplaintForm] Skipping location update from complaint data because mock data is in use');
      return;
    }
    
    // Extract location from complaint data
    const data = preservedData || complaint || complaintDataFromLocation;
    if (!data) {
      console.log('[ComplaintForm] No complaint data available to update location');
      return;
    }
    
    const locationData = convertToComplaintFormat(data);
    
    // Handle amphure data - could be string, array, or undefined
    let firstAmphure = undefined;
    if (locationData?.amphure) {
      if (Array.isArray(locationData.amphure)) {
        // If it's an array, take the first non-empty value
        firstAmphure = locationData.amphure.find(a => isNonEmptyString(a)) || undefined;
      } else if (isNonEmptyString(locationData.amphure)) {
        // If it's a string, use it directly
        firstAmphure = locationData.amphure;
      }
    }
    
    // Handle province data - could be string, array, or undefined
    let firstProvince = undefined;
    if (locationData?.province) {
      if (Array.isArray(locationData.province)) {
        // If it's an array, take the first non-empty value
        firstProvince = locationData.province.find(p => isNonEmptyString(p)) || undefined;
      } else if (isNonEmptyString(locationData.province)) {
        // If it's a string, use it directly
        firstProvince = locationData.province;
      }
    }
    
    console.log('[ComplaintForm] Extracted location from complaint data:', { 
      amphure: firstAmphure, 
      province: firstProvince,
            timestamp: new Date().toISOString()
          });
    
    // Update the Jotai store with the extracted location
    if (firstAmphure && firstProvince && stationData.updateLocation) {
      console.log('[ComplaintForm] Updating location in Jotai store:', { 
        amphure: firstAmphure, 
        province: firstProvince,
        timestamp: new Date().toISOString()
      });
      stationData.updateLocation(firstAmphure, firstProvince);
    }
  }, [preservedData, complaint, complaintDataFromLocation, stationData, usingMockData]);
  
  // Check if we're returning from StationCardEdit
  useEffect(() => {
    if (location.state?.returnedFromStationEdit) {
      console.log('[ComplaintForm] Detected return from StationCardEdit');
      
      // Use startTransition for state updates that might trigger suspense
      startTransition(() => {
          setReturnedFromStationEdit(true);
        
        // Set preserved data if available
        if (location.state.preserveState && complaintDataFromLocation) {
          setPreservedData(complaintDataFromLocation as any);
          
          // If we have complaint data in location state, update the Jotai store
          // Don't call hooks inside useEffect - use the ones from component scope
          const data = complaintDataFromLocation as any;
          if (data.text) {
            updateTitle(data.text);
          }
          if (data.content) {
            updateDescription(data.content);
          }
        }
      });

      // No need to get station data from sessionStorage as it's already in Jotai store
      // The StationCardEdit component should have updated the Jotai store before navigation
      console.log('[ComplaintForm] Using station data from Jotai store');
    }
  }, [
    location.state, 
    complaintDataFromLocation,
    updateTitle,
    updateDescription
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

  // Add a useEffect to ensure location data is always set
  useEffect(() => {
    // Check if location data is not set
    if ((!stationData.currentAmphure || !stationData.currentProvince) && stationData.updateLocation) {
      console.log('[ComplaintForm] Setting default location data: แม่แตง, เชียงใหม่', {
        currentAmphure: stationData.currentAmphure,
        currentProvince: stationData.currentProvince,
        timestamp: new Date().toISOString()
      });
      
      // Update the location in the Jotai store with default values
      stationData.updateLocation('แม่แตง', 'เชียงใหม่');
      
      // Clear the flag after a short delay
      setTimeout(() => {
        console.log('[ComplaintForm] Cleared intentional update flag, current location:', {
          currentAmphure: stationData.currentAmphure,
          currentProvince: stationData.currentProvince,
          timestamp: new Date().toISOString()
        });
      }, 100);
    }
  }, [stationData]);

  const validateComplaintData = () => {
    // Use preserved complaint data if returning from StationCardEdit
    const currentData = preservedData || complaint || complaintDataFromLocation;
    if (!currentData) return false;

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

  // Simplified navigation function
  const navigateDirectly = (path: string, state: any) => {
    console.log(`[ComplaintForm] Navigating directly to ${path}`, state);
    navigate(path, { state });
  };

  // Handle continue button click
  const handleContinue = () => {
    try {
      console.log('[ComplaintForm] Navigating to StationCardEdit using Jotai state');
      
      // Log the current Jotai state for debugging
      console.log('[ComplaintForm] Current Jotai state for navigation:', {
        title,
        description,
        location: {
          amphure: stationData.currentAmphure,
          province: stationData.currentProvince
        }
      });

      // Simply navigate to StationCardEdit
      // StationCardEdit will get data from Jotai
      navigate('/station-card-edit');
    } catch (error) {
      console.error('Error during navigation:', error);
      toast.error('เกิดข้อผิดพลาดในการนำทาง กรุณาลองใหม่อีกครั้ง');
    }
  };

  // Handle prepare document button click
  const handlePrepareDocument = () => {
    console.log('[ComplaintForm] Navigating to document preparation using Jotai state');
    
    try {
      // Log the current Jotai state for debugging
      console.log('[ComplaintForm] Current Jotai state for document preparation:', {
        title,
        description,
        location: {
          amphure: stationData.currentAmphure,
          province: stationData.currentProvince
        }
      });

      // Simply navigate to DocumentPreparation
      // DocumentPreparation will get data from Jotai
      navigate('/document-preparation');
    } catch (error) {
      console.error('Error during navigation to document preparation:', error);
      toast.error('เกิดข้อผิดพลาดในการนำทาง กรุณาลองใหม่อีกครั้ง');
    }
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

  // Handler functions for WaterLevelInfoCard
  const handleAddStation = (type: string) => {
    console.log('[ComplaintForm] Add station:', type);
    navigate('/station-card-edit', { state: { type, returnUrl: '/complaint/create' } });
  };

  const handleDeleteStation = (type: string) => {
    console.log('[ComplaintForm] Delete station:', type);
    // Implementation for deleting stations
  };

  const handleSaveStationData = () => {
    toast.success('บันทึกข้อมูลสถานีสำเร็จ');
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Use preserved complaint data if returning from StationCardEdit
  const data = preservedData || complaint || complaintDataFromLocation;
  console.log('[ComplaintForm] Data sources:', {
    preservedData,
    complaint,
    complaintDataFromLocation,
    finalData: data
  });
  
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
    // If we're using mock data, use the mock location values
    if (usingMockData) {
      console.log('[ComplaintForm] Using mock location data for display: แม่แตง, เชียงใหม่');
      // We don't need to set firstAmphure and firstProvince here anymore
      // since we're getting location data directly from Jotai in the WaterLevelInfoCard component
    } else {
    console.warn('[ComplaintForm] No valid location data found in complaint data');
    }
  }
  
  console.log('[ComplaintForm] Final location data being passed to components:', { 
    firstAmphure, 
    firstProvince,
    isAmphureDefined: !!firstAmphure,
    isProvinceDefined: !!firstProvince,
    usingMockData,
    jotaiAmphure: stationData.currentAmphure,
    jotaiProvince: stationData.currentProvince
  });

  // Helper function to convert ExtendedComplaintData to Complaint
  const convertToComplaintType = (data: Complaint | ExtendedComplaintData | ProcessedPost | null): Complaint | ProcessedPost | null => {
    console.log('[convertToComplaintType] Input data:', data);
    
    if (!data) {
      console.log('[convertToComplaintType] No data provided, returning null');
      return null;
    }
    
    // If it's a ProcessedPost, return it directly
    if (isProcessedPost(data)) {
      console.log('[convertToComplaintType] Data is a ProcessedPost, returning as is');
      return data as ProcessedPost;
    }
    
    if (isExtendedComplaintData(data)) {
      console.log('[convertToComplaintType] Converting ExtendedComplaintData to Complaint');
      // Convert ExtendedComplaintData to Complaint
      const result = {
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
      console.log('[convertToComplaintType] Converted result:', result);
      return result;
    }
    
    console.log('[convertToComplaintType] Data is already in the correct format, returning as is');
    return data;
  };

  // Render the WaterLevelInfoCard component
  const renderWaterLevelInfoCard = () => {
    // We don't need to differentiate between mock data and real data anymore
    // since the WaterLevelInfoCard component gets its location data directly from Jotai
    return (
      <WaterLevelInfoCard
        location={{
          amphure: stationData.currentAmphure,
          province: stationData.currentProvince
        }}
      />
    );
  };

  // Wrap the JSX with Suspense
  return (
    <Suspense fallback={<div className="container mx-auto px-12 pt-6 pb-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold text-[#17254D]">ระบบตอบประเด็นข้อร้องเรียน</h1>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    </div>}>
    <div className="min-h-screen bg-[#F0F8FF] pb-32">
      <ComplaintHeader />
      
      {/* Page Title */}
      <div className="bg-[#EBF5FF]">
        <div className="container mx-auto px-12 pt-6 pb-4">
            <div className="flex justify-between items-center mb-4">
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
                <Button 
                  onClick={handleContinue}
                  className="flex items-center gap-2"
                >
                  ดำเนินการต่อ
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Action Buttons - Moved up with reduced margin */}
            <div className="flex items-center mb-4">
            <button 
              className="bg-[#4B9FE1] hover:bg-[#3D8FD1] text-white px-2 py-2 rounded-xl w-[150px] h-[42px] font-medium flex items-center justify-center transition-colors duration-200 text-base whitespace-nowrap"
              onClick={handleContinue}
              type="button"
            >
              เพิ่มเติม/แก้ไขข้อมูล
            </button>
            <div className="w-[10px]"></div>
            <button 
              className="bg-white hover:bg-[#f0f9ff] text-[#4B9FE1] border-[1.5px] border-[#4B9FE1] px-2 py-2 rounded-xl w-[140px] h-[42px] font-medium flex items-center justify-center transition-colors duration-200 text-base whitespace-nowrap"
              onClick={handlePrepareDocument}
              type="button"
            >
              เตรียมร่างเอกสาร
            </button>
          </div>
        </div>
      </div>
      
      <main className="container mx-auto px-12 pt-2">
          {/* TEMPORARY: Show warning when using mock data */}
          {usingMockData && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4 rounded" role="alert">
              <div className="flex items-center">
                <div className="py-1">
                  <svg className="h-6 w-6 text-yellow-500 mr-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
        </div>
        <div>
                  <p className="font-bold">ข้อมูลจำลอง (Mock Data)</p>
                  <p className="text-sm">กำลังใช้ข้อมูลจำลองเนื่องจาก PostgreSQL ไม่พร้อมใช้งาน (เฉพาะข้อมูลอำเภอแม่แตง จังหวัดเชียงใหม่)</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Debug the complaint data */}
          {(() => {
            const complaintData = convertToComplaintType(data || null);
            console.log('[ComplaintForm] Data passed to ComplaintInfoCard:', complaintData);
            return null;
          })()}
          
          {/* Complaint Data Section - Moved up with reduced spacing */}
          <div className="mb-4">
            <ComplaintInfoCard 
              title="ข้อร้องเรียน"
              editable={false}
              showMockData={USE_MOCK_DATA}
            />
          </div>
        
        {/* Supporting Data Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div>
              {renderWaterLevelInfoCard()}
            </div>
            <WaterManagementPlanCard />
        </div>
      </main>
    </div>
    </Suspense>
  );
};

export default ComplaintForm;