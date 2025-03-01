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
// Replace Zustand store with Jotai hooks
import { useComplaintData } from "@/atoms/hooks";
import { useStationData } from "@/atoms/hooks";

// Declare the window property for TypeScript
declare global {
  interface Window {
    _stationDataUpdateIntentional?: boolean;
  }
}

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
  
  // Replace Zustand store with Jotai hooks
  const {
    updateTitle,
    updateDescription,
    updateLocation,
    updateCoordinates,
    updateProcessedPosts,
    togglePostSelection,
    startSubmission,
    completeSubmission,
    goToStep,
    resetComplaintData
  } = useComplaintData();
  
  // Get station data from Jotai
  const {
    stationDataUpdateIntentional,
    setStationDataUpdateIntentional,
    updateMonitoringStations,
    updateRainStations,
    updateReservoirs,
    setUserSelectedMonitoringStations,
    setUserSelectedRainStations,
    setUserSelectedReservoirs,
    setDisabledMonitoringStations,
    setDisabledRainStations,
    setDisabledReservoirs
  } = useStationData();
  
  // State for tracking if we returned from StationCardEdit
  const [returnedFromStationEdit, setReturnedFromStationEdit] = useState(false);
  
  // State to store preserved complaint data when returning from StationCardEdit
  const [preservedData, setPreservedData] = useState<any>(null);
  
  // Check if we're returning from StationCardEdit
  useEffect(() => {
    console.log("🔍 [DEBUG-ComplaintForm] useEffect for StationCardEdit return check running");
    console.log("🔍 [DEBUG-ComplaintForm] Current timestamp:", new Date().toISOString());
    
    // Log all sessionStorage keys for debugging
    const sessionStorageKeys = Object.keys(sessionStorage);
    console.log("🔍 [DEBUG-ComplaintForm] All sessionStorage keys:", sessionStorageKeys);
    
    // Check if we have a flag indicating we're navigating after a successful save
    const navigatingAfterSave = sessionStorage.getItem('navigatingAfterSave');
    console.log("🔍 [DEBUG-ComplaintForm] navigatingAfterSave flag value:", navigatingAfterSave);
    
    if (navigatingAfterSave === 'true') {
      console.log("[ComplaintForm] Detected navigation after successful save");
      console.log("🔍 [DEBUG-ComplaintForm] Found navigatingAfterSave flag in sessionStorage");
      
      // Remove the flag immediately to prevent duplicate processing
      sessionStorage.removeItem('navigatingAfterSave');
      console.log("🔍 [DEBUG-ComplaintForm] Removed navigatingAfterSave flag from sessionStorage");
      
      // Force reload data from localStorage
      const savedStoreData = localStorage.getItem('monitoringStations');
      const savedRainStations = localStorage.getItem('rainStations');
      const savedReservoirs = localStorage.getItem('reservoirs');
      const savedUserSelectedMonitoring = localStorage.getItem('userSelectedMonitoringStations');
      const savedUserSelectedRain = localStorage.getItem('userSelectedRainStations');
      const savedUserSelectedReservoirs = localStorage.getItem('userSelectedReservoirs');
      const savedDisabledMonitoring = localStorage.getItem('disabledMonitoringStations');
      const savedDisabledRain = localStorage.getItem('disabledRainStations');
      const savedDisabledReservoirs = localStorage.getItem('disabledReservoirsStations');
      
      console.log("🔍 [DEBUG-ComplaintForm] localStorage data exists:", {
        monitoringStations: !!savedStoreData,
        rainStations: !!savedRainStations,
        reservoirs: !!savedReservoirs,
        userSelectedMonitoring: !!savedUserSelectedMonitoring,
        userSelectedRain: !!savedUserSelectedRain,
        userSelectedReservoirs: !!savedUserSelectedReservoirs,
        disabledMonitoring: !!savedDisabledMonitoring,
        disabledRain: !!savedDisabledRain,
        disabledReservoirs: !!savedDisabledReservoirs
      });
      
      // Set the update flag to prevent navigation warnings
      setStationDataUpdateIntentional(true);
      
      try {
        // Parse and update each piece of data if it exists
        if (savedStoreData) {
          const monitoringStations = JSON.parse(savedStoreData);
          updateMonitoringStations(monitoringStations);
        }
        
        if (savedRainStations) {
          const rainStations = JSON.parse(savedRainStations);
          updateRainStations(rainStations);
        }
        
        if (savedReservoirs) {
          const reservoirs = JSON.parse(savedReservoirs);
          updateReservoirs(reservoirs);
        }
        
        if (savedUserSelectedMonitoring) {
          const userSelectedMonitoring = JSON.parse(savedUserSelectedMonitoring);
          setUserSelectedMonitoringStations(userSelectedMonitoring);
        }
        
        if (savedUserSelectedRain) {
          const userSelectedRain = JSON.parse(savedUserSelectedRain);
          setUserSelectedRainStations(userSelectedRain);
        }
        
        if (savedUserSelectedReservoirs) {
          const userSelectedReservoirs = JSON.parse(savedUserSelectedReservoirs);
          setUserSelectedReservoirs(userSelectedReservoirs);
        }
        
        if (savedDisabledMonitoring) {
          const disabledMonitoring = JSON.parse(savedDisabledMonitoring);
          setDisabledMonitoringStations(disabledMonitoring);
        }
        
        if (savedDisabledRain) {
          const disabledRain = JSON.parse(savedDisabledRain);
          setDisabledRainStations(disabledRain);
        }
        
        if (savedDisabledReservoirs) {
          const disabledReservoirs = JSON.parse(savedDisabledReservoirs);
          setDisabledReservoirs(disabledReservoirs);
        }
        
        console.log("[ComplaintForm] Successfully loaded station data from localStorage");
      } catch (error) {
        console.error("[ComplaintForm] Error parsing localStorage data after save:", error);
        console.log("🔍 [DEBUG-ComplaintForm] Error details:", error);
      } finally {
        // Reset the update flag
        setStationDataUpdateIntentional(false);
      }
    } else {
      console.log("🔍 [DEBUG-ComplaintForm] No navigatingAfterSave flag found");
    }
    
    // Check for temp station data from StationCardEdit
    const tempStationData = localStorage.getItem('tempStationData');
    if (tempStationData) {
      console.log("[ComplaintForm] Found temp station data from StationCardEdit");
      
      try {
        // Mark the update as intentional to prevent triggering side effects
        setStationDataUpdateIntentional(true);
        
        const parsedData = JSON.parse(tempStationData);
        
        // Update all station data with the temp data
        if (parsedData.monitoringStations) {
          updateMonitoringStations(parsedData.monitoringStations);
        }
        
        if (parsedData.rainStations) {
          updateRainStations(parsedData.rainStations);
        }
        
        if (parsedData.reservoirs) {
          updateReservoirs(parsedData.reservoirs);
        }
        
        if (parsedData.userSelectedMonitoringStations) {
          setUserSelectedMonitoringStations(parsedData.userSelectedMonitoringStations);
        }
        
        if (parsedData.userSelectedRainStations) {
          setUserSelectedRainStations(parsedData.userSelectedRainStations);
        }
        
        if (parsedData.userSelectedReservoirs) {
          setUserSelectedReservoirs(parsedData.userSelectedReservoirs);
        }
        
        if (parsedData.disabledMonitoringStations) {
          setDisabledMonitoringStations(parsedData.disabledMonitoringStations);
        }
        
        if (parsedData.disabledRainStations) {
          setDisabledRainStations(parsedData.disabledRainStations);
        }
        
        if (parsedData.disabledReservoirs) {
          setDisabledReservoirs(parsedData.disabledReservoirs);
        }
        
        console.log("[ComplaintForm] Successfully loaded temp station data");
        
        // Remove the temp data to avoid reloading it on refresh
        localStorage.removeItem('tempStationData');
      } catch (error) {
        console.error("[ComplaintForm] Error parsing temp station data:", error);
      } finally {
        // Reset the update flag
        setStationDataUpdateIntentional(false);
      }
    }
    
    // Check if we have state in location.state (normal navigation)
    if (location.state && location.state.from === 'StationCardEdit') {
      console.log("[ComplaintForm] Returned from StationCardEdit", location.state);
      console.log("🔍 [DEBUG-ComplaintForm] Found location.state with from=StationCardEdit");
      setReturnedFromStationEdit(true);
      
      // Check if we should discard current changes
      if (location.state.discardCurrentChanges) {
        console.log("[ComplaintForm] Discarding current changes as requested");
        console.log("🔍 [DEBUG-ComplaintForm] discardCurrentChanges flag is true");
      }
      
      // Try to get preserved complaint data from location state
      if (location.state.complaintData) {
        console.log("[ComplaintForm] Received complaint data from location.state");
        console.log("🔍 [DEBUG-ComplaintForm] Using complaint data from location.state");
        setPreservedData(location.state.complaintData);
      } else {
        console.log("[ComplaintForm] No complaint data found in location.state");
        console.log("🔍 [DEBUG-ComplaintForm] No complaint data available");
      }
      
      // Clear the state to prevent reloading on refresh
      window.history.replaceState({}, document.title);
      console.log("🔍 [DEBUG-ComplaintForm] Cleared history state");
    } 
    // Check if we have state in sessionStorage (direct navigation)
    else if (sessionStorage.getItem('complaintFormState')) {
      try {
        const savedState = JSON.parse(sessionStorage.getItem('complaintFormState') || '{}');
        console.log("[ComplaintForm] Found state in sessionStorage", savedState);
        console.log("🔍 [DEBUG-ComplaintForm] Parsed complaintFormState from sessionStorage");
        
        if (savedState.from === 'StationCardEdit') {
          setReturnedFromStationEdit(true);
          console.log("🔍 [DEBUG-ComplaintForm] Setting returnedFromStationEdit to true");
          
          // Check if we should discard current changes
          if (savedState.discardCurrentChanges) {
            console.log("[ComplaintForm] Discarding current changes as requested from sessionStorage");
            console.log("🔍 [DEBUG-ComplaintForm] discardCurrentChanges flag is true in sessionStorage");
          } else if (savedState.stationDataSaved) {
            console.log("[ComplaintForm] Station data was saved in StationCardEdit, verifying it's loaded");
            console.log("🔍 [DEBUG-ComplaintForm] stationDataSaved flag is true in sessionStorage");
            
            // Set the update flag to prevent navigation warnings
            setStationDataUpdateIntentional(true);
            
            try {
              // Force reload data from localStorage
              const savedStoreData = localStorage.getItem('monitoringStations');
              const savedRainStations = localStorage.getItem('rainStations');
              const savedReservoirs = localStorage.getItem('reservoirs');
              const savedUserSelectedMonitoring = localStorage.getItem('userSelectedMonitoringStations');
              const savedUserSelectedRain = localStorage.getItem('userSelectedRainStations');
              const savedUserSelectedReservoirs = localStorage.getItem('userSelectedReservoirs');
              const savedDisabledMonitoring = localStorage.getItem('disabledMonitoringStations');
              const savedDisabledRain = localStorage.getItem('disabledRainStations');
              const savedDisabledReservoirs = localStorage.getItem('disabledReservoirsStations');
              
              // Parse and update each piece of data if it exists
              if (savedStoreData) {
                const monitoringStations = JSON.parse(savedStoreData);
                updateMonitoringStations(monitoringStations);
              }
              
              if (savedRainStations) {
                const rainStations = JSON.parse(savedRainStations);
                updateRainStations(rainStations);
              }
              
              if (savedReservoirs) {
                const reservoirs = JSON.parse(savedReservoirs);
                updateReservoirs(reservoirs);
              }
              
              if (savedUserSelectedMonitoring) {
                const userSelectedMonitoring = JSON.parse(savedUserSelectedMonitoring);
                setUserSelectedMonitoringStations(userSelectedMonitoring);
              }
              
              if (savedUserSelectedRain) {
                const userSelectedRain = JSON.parse(savedUserSelectedRain);
                setUserSelectedRainStations(userSelectedRain);
              }
              
              if (savedUserSelectedReservoirs) {
                const userSelectedReservoirs = JSON.parse(savedUserSelectedReservoirs);
                setUserSelectedReservoirs(userSelectedReservoirs);
              }
              
              if (savedDisabledMonitoring) {
                const disabledMonitoring = JSON.parse(savedDisabledMonitoring);
                setDisabledMonitoringStations(disabledMonitoring);
              }
              
              if (savedDisabledRain) {
                const disabledRain = JSON.parse(savedDisabledRain);
                setDisabledRainStations(disabledRain);
              }
              
              if (savedDisabledReservoirs) {
                const disabledReservoirs = JSON.parse(savedDisabledReservoirs);
                setDisabledReservoirs(disabledReservoirs);
              }
              
              console.log("[ComplaintForm] Successfully loaded station data from localStorage");
            } catch (error) {
              console.error("[ComplaintForm] Error parsing localStorage data:", error);
              console.log("🔍 [DEBUG-ComplaintForm] Error parsing localStorage:", error);
            } finally {
              // Reset the update flag
              setStationDataUpdateIntentional(false);
            }
          }
          
          // Try to get preserved complaint data from session storage
          if (savedState.complaintData) {
            console.log("[ComplaintForm] Received complaint data from sessionStorage");
            console.log("🔍 [DEBUG-ComplaintForm] Using complaint data from sessionStorage");
            setPreservedData(savedState.complaintData);
          } else {
            console.log("[ComplaintForm] No complaint data found in sessionStorage");
            console.log("🔍 [DEBUG-ComplaintForm] No complaint data available in sessionStorage");
            
            // Check if we have location data in sessionStorage
            const complaintId = sessionStorage.getItem('complaintId');
            const amphure = sessionStorage.getItem('complaintAmphure');
            const province = sessionStorage.getItem('complaintProvince');
            const issue = sessionStorage.getItem('complaintIssue');
            const category = sessionStorage.getItem('complaintCategory');
            const reporter = sessionStorage.getItem('complaintReporter');
            const date = sessionStorage.getItem('complaintDate');
            
            console.log("🔍 [DEBUG-ComplaintForm] Checking for individual complaint fields in sessionStorage:", {
              complaintId: !!complaintId,
              amphure: !!amphure,
              province: !!province,
              issue: !!issue,
              category: !!category,
              reporter: !!reporter,
              date: !!date
            });
            
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
              
              console.log("🔍 [DEBUG-ComplaintForm] Created minimal data object:", minimalData);
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
          console.log("🔍 [DEBUG-ComplaintForm] Cleared all sessionStorage items");
        }
      } catch (error) {
        console.error("[ComplaintForm] Error parsing state from sessionStorage", error);
        console.log("🔍 [DEBUG-ComplaintForm] Error parsing complaintFormState:", error);
      }
    } else {
      console.log("🔍 [DEBUG-ComplaintForm] No complaintFormState in sessionStorage");
    }
  }, [location, setStationDataUpdateIntentional, updateMonitoringStations, updateRainStations, updateReservoirs, setUserSelectedMonitoringStations, setUserSelectedRainStations, setUserSelectedReservoirs, setDisabledMonitoringStations, setDisabledRainStations, setDisabledReservoirs]);

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
    
    // Update complaint data in Jotai store
    if (currentComplaintData) {
      const formattedData = convertToComplaintFormat(currentComplaintData);
      updateTitle(formattedData.issue || '');
      updateDescription(formattedData.issue || '');
      updateLocation(formattedData.location || '');
      updateCoordinates(
        formattedData.coordinates?.lat || null, 
        formattedData.coordinates?.lng || null
      );
      
      // If we have processed posts, update them
      if (isProcessedPost(currentComplaintData)) {
        // Use type assertion to tell TypeScript that this is a valid ProcessedPost
        const processedPost = currentComplaintData as unknown as ProcessedPost;
        updateProcessedPosts([processedPost]);
        // Select this post
        togglePostSelection(processedPost.processed_post_id.toString());
      }
    }
    
    // Navigate to the StationCardEdit page with the complaint data
    navigate('/station-card-edit', { state: currentComplaintData });
  };

  // Renamed from handleCancel to handlePrepareDocument to better reflect its purpose
  const handlePrepareDocument = () => {
    // Use preserved complaint data if returning from StationCardEdit
    const currentComplaintData = preservedData || complaint || complaintData;
    
    if (!currentComplaintData) {
      console.error('[ComplaintForm] No complaint data available for document preparation');
      toast.error('ไม่พบข้อมูลข้อร้องเรียน กรุณาเลือกข้อร้องเรียนใหม่');
      return;
    }
    
    console.log('[ComplaintForm] Preparing document draft for:', currentComplaintData);
    
    // Update complaint data in Jotai store
    if (currentComplaintData) {
      const formattedData = convertToComplaintFormat(currentComplaintData);
      updateTitle(formattedData.issue || '');
      updateDescription(formattedData.issue || '');
      updateLocation(formattedData.location || '');
      updateCoordinates(
        formattedData.coordinates?.lat || null, 
        formattedData.coordinates?.lng || null
      );
      
      // If we have processed posts, update them
      if (isProcessedPost(currentComplaintData)) {
        // Use type assertion to tell TypeScript that this is a valid ProcessedPost
        const processedPost = currentComplaintData as unknown as ProcessedPost;
        updateProcessedPosts([processedPost]);
        // Select this post
        togglePostSelection(processedPost.processed_post_id.toString());
      }
    }
    
    toast.success('กำลังเตรียมร่างเอกสาร');
    
    // Navigate to the document preparation page with the complaint data
    navigate('/document-preparation', { state: currentComplaintData });
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

  return (
    <div className="min-h-screen bg-[#F0F8FF] pb-32">
      <ComplaintHeader />
      
      {/* Page Title */}
      <div className="bg-[#EBF5FF]">
        <div className="container mx-auto px-12 pt-6 pb-4">
          <h1 className="text-xl font-semibold text-[#17254D] mb-4">ระบบตอบประเด็นข้อร้องเรียน</h1>
          
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
            <SocialPostInfo complaint={data!} />
          </Card>
        </div>
        
        {/* Supporting Data Section */}
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 shadow-sm">
              <WaterLevelInfo 
                amphure={firstAmphure}
                province={firstProvince}
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