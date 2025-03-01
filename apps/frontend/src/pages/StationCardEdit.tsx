import { Card } from "@/components/ui/card";
import { useLocation, useNavigate, useBlocker } from "react-router-dom";
import { Complaint } from "@/types/complaint";
import { ProcessedPost } from "@/types/processed-post";
import { SocialPostInfo } from "@/components/complaint/SocialPostInfo";
import { StationCardEditInfo } from "@/components/complaint/StationCardEditInfo";
import { useStationData, useComplaintData } from "@/atoms/hooks";
import { useEffect, useRef, useState, useCallback } from "react";
import logo1 from "@/assets/logo1.png";
import logo2 from "@/assets/logo2.png";
import { Link } from "react-router-dom";
import { UnsavedChangesDialog } from "@/components/complaint/UnsavedChangesDialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { MonitoringStation } from "@/types/monitoring-station";
import { RainStation } from "@/types/rain-station";
import { Reservoir } from "@/types/reservoir";

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
  const { 
    monitoringStations,
    rainStations,
    reservoirs,
    userSelectedMonitoringStations,
    userSelectedRainStations,
    userSelectedReservoirs,
    disabledMonitoringStations,
    disabledRainStations,
    disabledReservoirs,
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
  } = useStationData();
  
  const {
    processedPosts,
    selectedPostIds,
    title,
    description,
    location: complaintLocation,
    coordinates
  } = useComplaintData();
  
  const getCurrentComplaintData = useCallback(() => {
    if (selectedPostIds.length > 0) {
      const selectedPostId = selectedPostIds[0];
      return processedPosts.find(post => post.processed_post_id === selectedPostId) || null;
    }
    return null;
  }, [processedPosts, selectedPostIds]);
  
  const currentComplaintData = getCurrentComplaintData();
  
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const unsavedDestination = useRef('');

  const [stationData, setStationData] = useState({
    monitoringStations: [] as MonitoringStation[],
    rainStations: [] as RainStation[],
    reservoirs: [] as Reservoir[],
    userSelectedMonitoringStations: [] as MonitoringStation[],
    userSelectedRainStations: [] as RainStation[],
    userSelectedReservoirs: [] as Reservoir[],
    disabledMonitoringStations: {} as Record<string, boolean>,
    disabledRainStations: {} as Record<string, boolean>,
    disabledReservoirs: {} as Record<string, boolean>,
  });

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
    setStationData(formatStationData());
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
    
    const stationDataCopy = {
      monitoringStations: [...monitoringStations],
      rainStations: [...rainStations],
      reservoirs: [...reservoirs],
      userSelectedMonitoringStations: [...userSelectedMonitoringStations],
      userSelectedRainStations: [...userSelectedRainStations],
      userSelectedReservoirs: [...userSelectedReservoirs],
      disabledMonitoringStations: {...disabledMonitoringStations},
      disabledRainStations: {...disabledRainStations},
      disabledReservoirs: {...disabledReservoirs}
    };
    
    console.log("🔍 [DEBUG] Created deep copy of station data:", stationDataCopy);
    
    setMonitoringStations(stationDataCopy.monitoringStations);
    setRainStations(stationDataCopy.rainStations);
    setReservoirs(stationDataCopy.reservoirs);
    setUserSelectedMonitoringStations(stationDataCopy.userSelectedMonitoringStations);
    setUserSelectedRainStations(stationDataCopy.userSelectedRainStations);
    setUserSelectedReservoirs(stationDataCopy.userSelectedReservoirs);
    setDisabledMonitoringStations(stationDataCopy.disabledMonitoringStations);
    setDisabledRainStations(stationDataCopy.disabledRainStations);
    setDisabledReservoirs(stationDataCopy.disabledReservoirs);
    
    console.log("🔍 [DEBUG] Updated Jotai atoms with station data");
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    toast.dismiss(loadingToast);
    
    toast.success("บันทึกข้อมูล", {
      description: "บันทึกข้อมูลเรียบร้อยแล้ว",
      duration: 3000,
    });
    
    const complaintData = currentComplaintData;
    
    setShowUnsavedDialog(false);
    
    setHasChanges(false);
    
    console.log("[StationCardEdit] Navigating back to complaint form with data:", complaintData);
    console.log("🔍 [DEBUG] Preparing for navigation");
    
    try {
      const essentialData = {
        from: 'StationCardEdit',
        returnFromStationEdit: true,
        timestamp: new Date().getTime(),
        complaintData: complaintData,
        stationDataSaved: true
      };
      
      console.log("🔍 [DEBUG] Storing essential data in sessionStorage:", essentialData);
      
      sessionStorage.setItem('complaintFormState', JSON.stringify(essentialData));
      
      if (complaintData) {
        if ('processed_post_id' in complaintData) {
          sessionStorage.setItem('complaintId', String(complaintData.processed_post_id));
        } else if ('id' in complaintData) {
          sessionStorage.setItem('complaintId', String(complaintData.id));
        }
        
        if (complaintData.amphure) {
          const amphure = Array.isArray(complaintData.amphure) 
            ? complaintData.amphure[0] 
            : complaintData.amphure;
          sessionStorage.setItem('complaintAmphure', amphure);
        }
        
        if (complaintData.province) {
          const province = Array.isArray(complaintData.province) 
            ? complaintData.province[0] 
            : complaintData.province;
          sessionStorage.setItem('complaintProvince', province);
        }
        
        if ('text' in complaintData) {
          sessionStorage.setItem('complaintIssue', complaintData.text);
        } else if ('issue' in complaintData) {
          sessionStorage.setItem('complaintIssue', complaintData.issue);
        }
        
        if ('category_name' in complaintData) {
          sessionStorage.setItem('complaintCategory', complaintData.category_name);
        } else if ('category' in complaintData) {
          sessionStorage.setItem('complaintCategory', complaintData.category);
        }
        
        if ('profile_name' in complaintData) {
          sessionStorage.setItem('complaintReporter', complaintData.profile_name);
        } else if ('reporter' in complaintData) {
          sessionStorage.setItem('complaintReporter', complaintData.reporter);
        }
        
        if ('post_date' in complaintData) {
          const dateStr = complaintData.post_date instanceof Date 
            ? complaintData.post_date.toISOString().split('T')[0]
            : new Date(complaintData.post_date).toISOString().split('T')[0];
          sessionStorage.setItem('complaintDate', dateStr);
        } else if ('date' in complaintData) {
          sessionStorage.setItem('complaintDate', complaintData.date);
        }
      }
      
      console.log("🔍 [DEBUG] Setting navigatingAfterSave flag in sessionStorage");
      sessionStorage.setItem('navigatingAfterSave', 'true');
      
      setNavigatingAfterSave(true);
      
      const flagVerification = sessionStorage.getItem('navigatingAfterSave');
      console.log("🔍 [DEBUG] Verified navigatingAfterSave flag in sessionStorage:", flagVerification);
      
      console.log("�� [DEBUG] All checks passed, proceeding with navigation");
      console.log("🔍 [DEBUG] Navigation timestamp:", new Date().toISOString());
      
      console.log("🔍 [DEBUG] Using window.location.href for navigation");
      window.location.href = '/complaint/create';
    } catch (error) {
      console.error("[StationCardEdit] Error during navigation:", error);
      console.log("🔍 [DEBUG] Navigation error:", error);
      toast.error("เกิดข้อผิดพลาดในการนำทาง", {
        description: "กรุณาลองใหม่อีกครั้ง",
        duration: 5000,
      });
      setIsSaving(false);
    }
  }, [
    isSaving, 
    monitoringStations, 
    rainStations, 
    reservoirs, 
    userSelectedMonitoringStations, 
    userSelectedRainStations, 
    userSelectedReservoirs, 
    disabledMonitoringStations, 
    disabledRainStations, 
    disabledReservoirs,
    currentComplaintData,
    navigate,
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

  useBlocker(
    ({ currentLocation, nextLocation }) => {
      if (
        hasChanges && 
        !isSaving && 
        nextLocation.pathname !== location.pathname
      ) {
        unsavedDestination.current = nextLocation.pathname;
        setShowUnsavedDialog(true);
        return true;
      }
      return false;
    }
  );

  const updateStationData = useCallback((newStationData: any) => {
    console.log("[StationCardEdit] Updating station data:", newStationData);
    setStationData(newStationData);
    setHasChanges(true);
  }, []);

  if (!currentComplaintData) {
    return <div>No data available</div>;
  }

  const firstAmphure = isProcessedPost(currentComplaintData) 
    ? currentComplaintData.amphure?.[0] 
    : currentComplaintData.amphure?.[0];
  
  const firstProvince = isProcessedPost(currentComplaintData) 
    ? currentComplaintData.province?.[0] 
    : currentComplaintData.province?.[0];

  return (
    <div className="min-h-screen bg-[#F7FAFC] flex flex-col">
      <StationCardEditHeader />
      
      <main className="flex-grow container mx-auto px-6 py-8">
        <div className="flex gap-8 items-start">
          <div className="w-[380px] flex-shrink-0">
            <Card className="shadow-lg overflow-hidden">
              {currentComplaintData && (
                <SocialPostInfo 
                  data={currentComplaintData} 
                  onSave={handleSaveFromInfo}
                  onDiscard={handleDiscardFromInfo}
                />
              )}
            </Card>
          </div>
          
          <div className="flex-grow">
            <Card className="shadow-lg">
              <div className="flex justify-between items-center p-4 border-b">
                <h2 className="text-xl font-semibold">เลือกสถานี</h2>
                <Button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-[#1976D2] hover:bg-[#1565C0]"
                >
                  <Save className="w-4 h-4 mr-2" />
                  บันทึก
                </Button>
              </div>
              
              <div className="p-4">
                <StationCardEditInfo 
                  stationData={stationData}
                  onStationDataChange={updateStationData}
                  complaintData={currentComplaintData}
                />
              </div>
            </Card>
          </div>
        </div>
      </main>
      
      <UnsavedChangesDialog 
        open={showUnsavedDialog} 
        onClose={() => setShowUnsavedDialog(false)}
        onDiscard={() => {
          setHasChanges(false);
          setShowUnsavedDialog(false);
          navigate(unsavedDestination.current);
        }}
        onSave={() => {
          handleSave();
        }}
      />
    </div>
  );
};

export default StationCardEdit; 