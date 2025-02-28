import { Card } from "@/components/ui/card";
import { useLocation, useNavigate, useBlocker } from "react-router-dom";
import { Complaint } from "@/types/complaint";
import { ProcessedPost } from "@/types/processed-post";
import { SocialPostInfo } from "@/components/complaint/SocialPostInfo";
import { StationCardEditInfo } from "@/components/complaint/StationCardEditInfo";
import { useComplaintStore } from "@/stores/complaintStore";
import { useEffect, useRef, useState, useCallback } from "react";
import logo1 from "@/assets/logo1.png";
import logo2 from "@/assets/logo2.png";
import { Link } from "react-router-dom";
import { UnsavedChangesDialog } from "@/components/complaint/UnsavedChangesDialog";
import { toast } from "sonner";

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
  const complaintStore = useComplaintStore();
  const complaintData = location.state as ProcessedPost | Complaint | undefined;
  const hasSetComplaintData = useRef(false);
  
  // State for tracking unsaved changes and dialog visibility
  const [hasChanges, setHasChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [pendingNavigationState, setPendingNavigationState] = useState<any>(null);
  // Track if we're discarding changes (not saving current session)
  const [isDiscarding, setIsDiscarding] = useState(false);

  // Add a ref to track if navigation is intentional
  const intentionalNavigation = useRef(false);

  // Add a ref to track if this is the initial mount
  const isInitialMount = useRef(true);

  // Store the complaint data in the store when the component mounts
  useEffect(() => {
    if (complaintData && !hasSetComplaintData.current) {
      console.log("[StationCardEdit] Storing complaint data in store:", complaintData);
      complaintStore.setComplaintData(complaintData);
      hasSetComplaintData.current = true;
    }
    
    // Reset hasChanges on initial mount
    if (isInitialMount.current) {
      console.log("[StationCardEdit] Initial mount, resetting hasChanges");
      setHasChanges(false);
      
      // Set isInitialMount to false after the initial mount
      isInitialMount.current = false;
    }
  }, [complaintData, complaintStore.setComplaintData]);

  // Listen for changes in the station data, but don't set hasChanges on initial load
  useEffect(() => {
    // Skip this effect on initial mount - we've already set isInitialMount to false in the previous useEffect
    if (isInitialMount.current) return;
    
    // Only check for changes if we're not in the initial mount
    const currentStationData = complaintStore.stationData;
    if (currentStationData) {
      const hasUserSelectedStations = 
        currentStationData.userSelectedMonitoringStations.length > 0 ||
        currentStationData.userSelectedRainStations.length > 0 ||
        currentStationData.userSelectedReservoirs.length > 0;
        
      const hasDisabledStations =
        Object.keys(currentStationData.disabledMonitoringStations).length > 0 ||
        Object.keys(currentStationData.disabledRainStations).length > 0 ||
        Object.keys(currentStationData.disabledReservoirs).length > 0;
      
      console.log("[StationCardEdit] Checking for changes during current session:", { 
        hasUserSelectedStations, 
        hasDisabledStations
      });
      
      // We don't automatically set hasChanges here anymore
      // Changes will be tracked by the StationCardEditInfo component
      // This is just for debugging purposes
    }
  }, [complaintStore.stationData]);

  // Block navigation when there are unsaved changes
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => {
      // Don't block if there are no changes
      if (!hasChanges) return false;
      
      // Don't block if navigating to the same location
      if (currentLocation.pathname === nextLocation.pathname) return false;
      
      // Block navigation and show the dialog
      return true;
    }
  );

  // Handle the blocker state changes
  useEffect(() => {
    if (blocker.state === "blocked" && hasChanges) {
      // Store the pending navigation
      setPendingNavigation(blocker.location.pathname);
      setPendingNavigationState(blocker.location.state);
      // Show the dialog
      setShowUnsavedDialog(true);
    }
  }, [blocker, hasChanges]);

  // Handle navigation with confirmation for unsaved changes
  const handleNavigation = useCallback((path: string, state?: any) => {
    if (hasChanges) {
      setPendingNavigation(path);
      setPendingNavigationState(state);
      setShowUnsavedDialog(true);
    } else {
      navigate(path, { state });
    }
  }, [hasChanges, navigate]);

  // Handle save action from StationCardEditInfo
  const handleSaveFromInfo = () => {
    // If we're discarding changes, use the discard handler
    if (isDiscarding) {
      handleDiscard();
      // Reset the flag after handling
      setIsDiscarding(false);
      return;
    }
    
    // Otherwise, use the normal save handler
    handleSave();
  };

  // Handle discard action from StationCardEditInfo
  const handleDiscardFromInfo = () => {
    console.log("[StationCardEdit] Setting discard flag");
    // Set the flag to indicate we're discarding changes
    setIsDiscarding(true);
    // Call the save handler which will check the flag and use handleDiscard
    handleSaveFromInfo();
  };

  // Handle save action
  const handleSave = useCallback(() => {
    // Mark navigation as intentional
    intentionalNavigation.current = true;
    
    // Ensure we have the latest station data
    const currentStationData = complaintStore.stationData;
    
    // Log the data being saved
    console.log("[StationCardEdit] Saving station data:", {
      monitoringStations: currentStationData?.monitoringStations?.length || 0,
      rainStations: currentStationData?.rainStations?.length || 0,
      reservoirs: currentStationData?.reservoirs?.length || 0,
      userSelectedMonitoring: currentStationData?.userSelectedMonitoringStations?.length || 0,
      userSelectedRain: currentStationData?.userSelectedRainStations?.length || 0,
      userSelectedReservoirs: currentStationData?.userSelectedReservoirs?.length || 0,
    });
    
    toast.success("บันทึกข้อมูล", {
      description: "บันทึกข้อมูลเรียบร้อยแล้ว",
      duration: 3000,
    });
    
    // Get the current complaint data from the store
    const complaintData = complaintStore.complaintData;
    
    // Close the dialog if it's open
    setShowUnsavedDialog(false);
    
    // Reset the changes flag to disable the navigation blocker
    setHasChanges(false);
    
    console.log("[StationCardEdit] Navigating back to complaint form with data:", complaintData);
    
    try {
      // Store essential complaint data fields to ensure validation passes
      const essentialData = {
        from: 'StationCardEdit',
        returnFromStationEdit: true,
        timestamp: new Date().getTime(),
        complaintData: complaintData // Include the full complaint data
      };
      
      // Store the state in sessionStorage to retrieve it on the target page
      sessionStorage.setItem('complaintFormState', JSON.stringify(essentialData));
      
      // Store complaint ID separately if available
      if (complaintData) {
        // Store ID
        if ('processed_post_id' in complaintData) {
          sessionStorage.setItem('complaintId', String(complaintData.processed_post_id));
        } else if ('id' in complaintData) {
          sessionStorage.setItem('complaintId', String(complaintData.id));
        }
        
        // Store location data
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
        
        // Store essential fields for validation
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
      
      // Use a small timeout to ensure the hasChanges state update has been processed
      setTimeout(() => {
        // Use window.location.href to bypass React Router's navigation blocker
        window.location.href = '/complaint/create';
      }, 100);
    } catch (error) {
      console.error("[StationCardEdit] Error during navigation:", error);
      // Fallback navigation if serialization fails
      navigate('/complaint/create');
    }
  }, [complaintStore, setHasChanges, setShowUnsavedDialog, navigate]);

  // Handle discard action
  const handleDiscard = useCallback(() => {
    // Mark navigation as intentional
    intentionalNavigation.current = true;
    
    // We're intentionally NOT saving any changes made in the current session
    // Get the original station data from the store before any changes were made
    const originalStationData = complaintStore.stationData;
    console.log("[StationCardEdit] Discarding changes, original station data:", originalStationData);
    
    // Close the dialog
    setShowUnsavedDialog(false);
    
    // Reset the changes flag to disable the navigation blocker
    setHasChanges(false);
    
    // Get the current complaint data from the store
    const complaintData = complaintStore.complaintData;
    
    console.log("[StationCardEdit] Navigating back to complaint form without saving current session changes");
    
    try {
      // Store essential complaint data fields to ensure validation passes
      const essentialData = {
        from: 'StationCardEdit',
        returnFromStationEdit: true,
        discardCurrentChanges: true,
        timestamp: new Date().getTime(),
        complaintData: complaintData // Include the full complaint data
      };
      
      // Store the state in sessionStorage to retrieve it on the target page
      sessionStorage.setItem('complaintFormState', JSON.stringify(essentialData));
      
      // Store complaint ID separately if available
      if (complaintData) {
        // Store ID
        if ('processed_post_id' in complaintData) {
          sessionStorage.setItem('complaintId', String(complaintData.processed_post_id));
        } else if ('id' in complaintData) {
          sessionStorage.setItem('complaintId', String(complaintData.id));
        }
        
        // Store location data
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
        
        // Store essential fields for validation
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
      
      // Use a small timeout to ensure the hasChanges state update has been processed
      setTimeout(() => {
        // Use window.location.href to bypass React Router's navigation blocker
        window.location.href = '/complaint/create';
      }, 100);
    } catch (error) {
      console.error("[StationCardEdit] Error during navigation:", error);
      // Fallback navigation if serialization fails
      navigate('/complaint/create');
    }
  }, [complaintStore, setHasChanges, setShowUnsavedDialog, navigate]);

  // Handle cancel action
  const handleCancel = useCallback(() => {
    // Close the dialog
    setShowUnsavedDialog(false);
    setPendingNavigation(null);
    setPendingNavigationState(null);
    
    // If there's a blocker, reset it
    if (blocker.state === "blocked") {
      blocker.reset();
    }
  }, [blocker]);

  // Override the default back button behavior
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only prevent navigation if there are unsaved changes and navigation is not intentional
      if (hasChanges && !intentionalNavigation.current) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasChanges]);

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
              onChangesMade={() => setHasChanges(true)}
              onSave={handleSaveFromInfo}
              onDiscard={handleDiscardFromInfo}
            />
          </Card>
        </div>
      </main>

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onOpenChange={setShowUnsavedDialog}
        onSave={handleSave}
        onDiscard={handleDiscard}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default StationCardEdit; 