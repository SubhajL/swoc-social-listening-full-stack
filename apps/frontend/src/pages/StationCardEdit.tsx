import { Card } from "@/components/ui/card";
import { ComplaintHeader } from "@/components/complaint/ComplaintHeader";
import { SocialPostInfo } from "@/components/complaint/SocialPostInfo";
import { StationCardEditInfo } from "@/components/complaint/StationCardEditInfo";
import { UnsavedChangesDialog } from "@/components/complaint/UnsavedChangesDialog";
import { useLocation, useNavigate, useBlocker } from "react-router-dom";
import { ProcessedPost } from "@/types/processed-post";
import { Complaint } from "@/types/complaint";
import { toast } from "sonner";
import { useEffect, useState, useCallback, useMemo } from "react";
// Import Jotai hooks
import { useStationData, useComplaintData } from "@/atoms/hooks";

// Type guard to check if data is a ProcessedPost
const isProcessedPost = (data: any): data is ProcessedPost => {
  return data !== null && typeof data === 'object' && 'processed_post_id' in data;
};

// Custom header component for StationCardEdit
const StationCardEditHeader = () => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-center p-4 md:p-6 bg-white border-b">
      {/* Logo and title section */}
      <div className="flex items-center gap-3 mb-4 md:mb-0">
        <img 
          src="/assets/logo.png" 
          alt="Logo" 
          className="h-12 w-auto"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = '/assets/fallback-logo.png';
          }}
        />
        <div>
          <h1 className="text-xl font-bold text-[#17254D]">ระบบติดตามข้อร้องเรียน</h1>
          <p className="text-[#64748B] text-sm">สำนักงานชลประทานที่ 11</p>
        </div>
      </div>
      
      {/* Navigation links */}
      <div className="flex items-center gap-4">
        <a 
          href="#"
          className="text-[#64748B] hover:text-[#42A5F5] text-sm font-medium"
        >
          หน้าหลัก
        </a>
        <a 
          href="#"
          className="text-[#42A5F5] text-sm font-medium"
        >
          ข้อร้องเรียน
        </a>
        <a 
          href="#"
          className="text-[#64748B] hover:text-[#42A5F5] text-sm font-medium"
        >
          รายงาน
        </a>
        <a 
          href="#"
          className="text-[#64748B] hover:text-[#42A5F5] text-sm font-medium"
        >
          เอกสาร
        </a>
      </div>
    </div>
  );
};

const StationCardEdit = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get Jotai state and actions
  const { 
    monitoringStations, setMonitoringStations,
    rainStations, setRainStations,
    reservoirs, setReservoirs,
    userSelectedMonitoringStations, setUserSelectedMonitoringStations,
    userSelectedRainStations, setUserSelectedRainStations,
    userSelectedReservoirs, setUserSelectedReservoirs,
    disabledMonitoringStations, setDisabledMonitoringStations,
    disabledRainStations, setDisabledRainStations,
    disabledReservoirs, setDisabledReservoirs,
    navigatingAfterSave, setNavigatingAfterSave
  } = useStationData();
  
  const {
    processedPosts,
    selectedPostIds
  } = useComplaintData();
  
  // Local state
  const [hasChanges, setHasChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Local state for station data management
  const [stationData, setStationData] = useState({
    monitoringStations: [] as any[],
    rainStations: [] as any[],
    reservoirs: [] as any[],
    userSelectedMonitoringStations: [] as any[],
    userSelectedRainStations: [] as any[],
    userSelectedReservoirs: [] as any[],
    disabledMonitoringStations: {} as Record<string, boolean>,
    disabledRainStations: {} as Record<string, boolean>,
    disabledReservoirs: {} as Record<string, boolean>
  });
  
  // Get the current complaint data from processed posts
  const currentComplaintData = useMemo(() => {
    if (selectedPostIds.length > 0) {
      const selectedPostId = selectedPostIds[0];
      // Convert to string for comparison if needed
      return processedPosts.find(post => String(post.processed_post_id) === String(selectedPostId)) || null;
    }
    return null;
  }, [processedPosts, selectedPostIds]);

  // Extract amphure and province for components
  const firstAmphure = currentComplaintData && isProcessedPost(currentComplaintData) 
    ? currentComplaintData.amphure?.[0] 
    : (currentComplaintData as any)?.amphure?.[0];
  
  const firstProvince = currentComplaintData && isProcessedPost(currentComplaintData) 
    ? currentComplaintData.province?.[0] 
    : (currentComplaintData as any)?.province?.[0];
  
  // Format station data from Jotai atoms for local state
  const formatStationData = useCallback(() => {
    return {
      monitoringStations,
      rainStations,
      reservoirs,
      userSelectedMonitoringStations,
      userSelectedRainStations,
      userSelectedReservoirs,
      disabledMonitoringStations,
      disabledRainStations,
      disabledReservoirs
    };
  }, [
    monitoringStations, 
    rainStations, 
    reservoirs,
    userSelectedMonitoringStations,
    userSelectedRainStations,
    userSelectedReservoirs,
    disabledMonitoringStations,
    disabledRainStations,
    disabledReservoirs
  ]);
  
  useEffect(() => {
    // Type assertion to avoid type mismatch
    setStationData(formatStationData() as any);
    console.log("[StationCardEdit] Current data loaded from Jotai atoms:", formatStationData());
  }, [formatStationData]);
  
  const handleSaveFromInfo = () => {
    console.log("[StationCardEdit] Save action triggered from info panel");
    toast.info("กำลังบันทึกข้อมูล", {
      description: "โปรดรอสักครู่...",
      duration: 2000,
    });
    
    handleSave();
  };
  
  const handleDiscardFromInfo = () => {
    console.log("[StationCardEdit] Discard action triggered from info panel");
    setHasChanges(false);
    
    navigate('/complaint/create');
  };
  
  const handleSave = useCallback(async () => {
    if (isSaving) {
      console.log("[StationCardEdit] Save already in progress, ignoring duplicate request");
      return;
    }
    
    setIsSaving(true);
    
    console.log("[StationCardEdit] Starting save operation");
    
    const loadingToast = toast.loading("กำลังบันทึกข้อมูล", {
      description: "โปรดรอสักครู่...",
    });
    
    console.log("[StationCardEdit] Current station data:", {
      monitoringStations: monitoringStations.length,
      rainStations: rainStations.length,
      reservoirs: reservoirs.length,
      userSelectedMonitoring: userSelectedMonitoringStations.length,
      userSelectedRain: userSelectedRainStations.length,
      userSelectedReservoirs: userSelectedReservoirs.length,
    });
    
    try {
      // Save to Jotai atoms
      setMonitoringStations(stationData.monitoringStations);
      setRainStations(stationData.rainStations);
      setReservoirs(stationData.reservoirs);
      setUserSelectedMonitoringStations(stationData.userSelectedMonitoringStations);
      setUserSelectedRainStations(stationData.userSelectedRainStations);
      setUserSelectedReservoirs(stationData.userSelectedReservoirs);
      setDisabledMonitoringStations(stationData.disabledMonitoringStations);
      setDisabledRainStations(stationData.disabledRainStations);
      setDisabledReservoirs(stationData.disabledReservoirs);
      
      // Set flags for navigating after save
      window._stationDataUpdateIntentional = true;
      sessionStorage.setItem('navigatingAfterSave', 'true');
      
      // Update Jotai atom for navigation state
      setNavigatingAfterSave(true);
      
      // Save current complaint data to sessionStorage for the complaint form
      const complaintData = currentComplaintData;
      
      if (complaintData) {
        console.log("[StationCardEdit] Saving complaint data to session storage:", complaintData);
        
        if (isProcessedPost(complaintData)) {
          sessionStorage.setItem('complaintId', String(complaintData.processed_post_id));
        } else if ('id' in complaintData) {
          sessionStorage.setItem('complaintId', String((complaintData as any).id));
        }
        
        if (complaintData.amphure) {
          // Ensure amphure is stored as a string
          const amphureStr = Array.isArray(complaintData.amphure) 
            ? complaintData.amphure[0] 
            : String(complaintData.amphure);
          
          sessionStorage.setItem('complaintAmphure', amphureStr);
        }
        
        if (complaintData.province) {
          // Ensure province is stored as a string
          const provinceStr = Array.isArray(complaintData.province) 
            ? complaintData.province[0] 
            : String(complaintData.province);
          
          sessionStorage.setItem('complaintProvince', provinceStr);
        }
        
        if (isProcessedPost(complaintData) && complaintData.text) {
          sessionStorage.setItem('complaintIssue', complaintData.text);
        } else if ('issue' in complaintData) {
          sessionStorage.setItem('complaintIssue', (complaintData as any).issue);
        }
        
        if ('category_name' in complaintData) {
          sessionStorage.setItem('complaintCategory', complaintData.category_name);
        } else if ('category' in complaintData) {
          sessionStorage.setItem('complaintCategory', (complaintData as any).category);
        }
        
        if ('profile_name' in complaintData) {
          sessionStorage.setItem('complaintReporter', complaintData.profile_name);
        } else if ('reporter' in complaintData) {
          sessionStorage.setItem('complaintReporter', (complaintData as any).reporter);
        }
        
        if ('post_date' in complaintData) {
          const date = new Date(complaintData.post_date);
          const dateStr = date.toISOString().split('T')[0];
          sessionStorage.setItem('complaintDate', dateStr);
        } else if ('date' in complaintData) {
          sessionStorage.setItem('complaintDate', (complaintData as any).date);
        }
      }
      
      // Mark as saved
      setHasChanges(false);
      setShowUnsavedDialog(false);
      
      // Navigate back to the complaint form
      navigate('/complaint/create');
        
      toast.success("บันทึกข้อมูลสำเร็จ", {
        description: "บันทึกข้อมูลเรียบร้อยแล้ว",
        duration: 3000,
      });
    } catch (error) {
      console.error("[StationCardEdit] Error during save operation:", error);
      
      toast.error("เกิดข้อผิดพลาด", {
        description: "ไม่สามารถบันทึกข้อมูลได้ โปรดลองอีกครั้ง",
        duration: 5000,
      });
    } finally {
      toast.dismiss(loadingToast);
      setIsSaving(false);
    }
  }, [
    isSaving, 
    stationData, 
    navigate, 
    currentComplaintData,
    monitoringStations,
    rainStations,
    reservoirs,
    userSelectedMonitoringStations,
    userSelectedRainStations,
    userSelectedReservoirs,
    setMonitoringStations,
    setRainStations,
    setReservoirs,
    setUserSelectedMonitoringStations,
    setUserSelectedRainStations,
    setUserSelectedReservoirs,
    setDisabledMonitoringStations,
    setDisabledRainStations,
    setDisabledReservoirs,
    setNavigatingAfterSave
  ]);
  
  // Update station data in local state
  const updateStationData = useCallback((updatedData: any) => {
    console.log("[StationCardEdit] Received updated station data:", updatedData);
    setStationData(updatedData);
    setHasChanges(true);
  }, []);
  
  // Handle navigation blocking
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => 
      hasChanges && 
      !nextLocation.pathname.includes('/station-card-edit') &&
      currentLocation.pathname !== nextLocation.pathname
  );
  
  useEffect(() => {
    if (blocker.state === 'blocked') {
      setShowUnsavedDialog(true);
    }
  }, [blocker]);

  return (
    <div className="min-h-screen bg-[#F7FAFC] flex flex-col">
      <StationCardEditHeader />
      
      <div className="flex-1 p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Left column - Social post info */}
          <div className="lg:col-span-1">
            <Card className="overflow-hidden h-full">
              <div className="p-4">
                {currentComplaintData && (
                  <SocialPostInfo 
                    complaint={currentComplaintData as ProcessedPost | Complaint} 
                    onSave={handleSaveFromInfo}
                    onDiscard={handleDiscardFromInfo}
                  />
                )}
                {!currentComplaintData && (
                  <div className="flex flex-col items-center justify-center h-64">
                    <p className="text-gray-500">No complaint data available</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
          
          {/* Right column - Station card edit info */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden h-full">
              <div className="p-4">
                <StationCardEditInfo 
                  amphure={firstAmphure}
                  province={firstProvince}
                  onChangesMade={() => setHasChanges(true)}
                  onSave={handleSaveFromInfo}
                  onDiscard={handleDiscardFromInfo}
                />
              </div>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Unsaved changes dialog */}
      <UnsavedChangesDialog 
        open={showUnsavedDialog} 
        onOpenChange={setShowUnsavedDialog}
        onSave={handleSave}
        onDiscard={() => {
          setHasChanges(false);
          setShowUnsavedDialog(false);
          blocker.proceed?.();
        }}
        onCancel={() => {
          setShowUnsavedDialog(false);
          blocker.reset?.();
        }}
      />
    </div>
  );
};

export default StationCardEdit; 