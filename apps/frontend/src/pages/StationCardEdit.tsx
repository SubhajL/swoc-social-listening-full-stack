import { Card } from "@/components/ui/card";
import { useLocation, useNavigate, useBlocker } from "react-router-dom";
import { Complaint } from "@/types/complaint";
import { ProcessedPost } from "@/types/processed-post";
import { useEffect, useRef, useState, useCallback } from "react";
import logo1 from "@/assets/logo1.png";
import logo2 from "@/assets/logo2.png";
import { Link } from "react-router-dom";
import { UnsavedChangesDialog } from "@/components/complaint/UnsavedChangesDialog";
import { toast } from "sonner";
// Import Jotai hooks instead of Zustand
import { useComplaintData, useStationData } from "@/atoms/hooks";
import { Bell, Settings, ArrowLeft, ArrowRight, Save, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
// Import reusable components
import { ComplaintInfoCard, WaterLevelInfoCard, WaterManagementPlanCard } from "@/components/shared";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StationCardEditInfo } from "@/components/complaint/StationCardEditInfo";
import { useAtom } from "jotai";
import { currentAmphureAtom, currentProvinceAtom } from "@/atoms/stationData";

// Type guards
const isProcessedPost = (data: any): data is ProcessedPost => {
  return data && typeof data === 'object' && 'processed_post_id' in data;
};

const isComplaint = (data: any): data is Complaint => {
  return data && typeof data === 'object' && 'complaint_id' in data;
};

// Helper function to extract location data from different data structures
// This is only used for display purposes, not for updating Jotai state
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

// Header component with settings button
const StationCardEditHeader = () => {
  const navigate = useNavigate();
  
  const handleSettingsClick = () => {
    navigate('/settings');
  };
  
  return (
    <div className="flex justify-between items-center w-full p-4 bg-white border-b border-gray-200">
      <div className="flex items-center space-x-2">
        <img src={logo1} alt="Logo 1" className="h-10" />
        <img src={logo2} alt="Logo 2" className="h-10" />
      </div>
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={handleSettingsClick}>
          <Settings className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
        <Link to="/profile" className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 font-medium">
          U
        </Link>
      </div>
    </div>
  );
};

// Main component
const StationCardEdit = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Add state for error handling with more detailed error types
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Get complaint data from Jotai store
  const complaintData = useComplaintData();
  
  // Get station data from Jotai with the correct types
  const stationData = useStationData();
  
  // Get setters for location atoms
  const [currentAmphure, setCurrentAmphure] = useAtom(currentAmphureAtom);
  const [currentProvince, setCurrentProvince] = useAtom(currentProvinceAtom);
  
  // State for tracking unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  
  // Initialize Jotai state on component mount
  useEffect(() => {
    console.log('[StationCardEdit] Initializing component with Jotai state');
    
    // Log the current Jotai state
    console.log('[StationCardEdit] Current Jotai state:', {
      title: complaintData.title,
      description: complaintData.description,
      location: complaintData.location,
      amphure: stationData.currentAmphure,
      province: stationData.currentProvince
    });
    
    // Set location data from complaintData if not already set
    if ((!currentAmphure || !currentProvince) && complaintData.location) {
      console.log('[StationCardEdit] Setting location data from complaintData:', complaintData.location);
      
      // In the ComplaintData interface, location is a string
      // We need to extract province and amphure from this string
      const locationString = complaintData.location;
      
      // Try to extract province and amphure from the location string
      // Format could be "จังหวัดXXX อำเภอYYY" or just "จังหวัดXXX"
      const provinceMatch = locationString.match(/จังหวัด([^\s]+)/);
      const amphureMatch = locationString.match(/อำเภอ([^\s]+)/);
      
      if (provinceMatch && provinceMatch[1] && !currentProvince) {
        const province = provinceMatch[1];
        console.log('[StationCardEdit] Extracted province:', province);
        setCurrentProvince(province);
      }
      
      if (amphureMatch && amphureMatch[1] && !currentAmphure) {
        const amphure = amphureMatch[1];
        console.log('[StationCardEdit] Extracted amphure:', amphure);
        setCurrentAmphure(amphure);
      }
      
      // If we couldn't extract province or amphure, use the whole location string as province
      if (!provinceMatch && !amphureMatch && !currentProvince) {
        console.log('[StationCardEdit] Using full location as province:', locationString);
        setCurrentProvince(locationString);
      }
    }
    
    // IMPORTANT: Only use data from Jotai, never update from API or location.state
    // We're only logging the data here, not updating it
    
    // Initialize station data queries if needed
    if (stationData.currentAmphure && stationData.currentProvince) {
      console.log('[StationCardEdit] Using location data from Jotai for queries:', {
        amphure: stationData.currentAmphure,
        province: stationData.currentProvince
      });
      
      // This will trigger the queries in the Jotai atoms
      // The actual data fetching is handled by the atoms
    } else {
      console.warn('[StationCardEdit] No location data available in Jotai store');
      setLoadError('ไม่พบข้อมูลตำแหน่งที่ตั้ง กรุณากลับไปที่หน้าแบบฟอร์มและลองอีกครั้ง');
    }
    
    // Set loading to false after initialization
    setIsLoading(false);
  }, [complaintData, stationData, currentAmphure, currentProvince, setCurrentAmphure, setCurrentProvince]);
  
  const isInitialMount = useRef(true);
  
  // Store the complaint data when the component mounts
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      console.log('[StationCardEdit] Component mounted with Jotai data:', {
        title: complaintData.title,
        description: complaintData.description,
        location: complaintData.location,
        amphure: stationData.currentAmphure,
        province: stationData.currentProvince
      });
    }
  }, [complaintData, stationData]);
  
  // Handle changes in the form
  const handleChangesMade = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);
  
  // Save and navigate to document preparation
  const saveAndNavigate = async () => {
    try {
      console.log('[StationCardEdit] Saving and navigating to document preparation');
      
      // Log the current Jotai state before navigation
      console.log('[StationCardEdit] Current Jotai state before navigation:', {
        title: complaintData.title,
        description: complaintData.description,
        location: complaintData.location,
        amphure: stationData.currentAmphure,
        province: stationData.currentProvince,
        monitoringStations: stationData.userSelectedMonitoringStations.length,
        rainStations: stationData.userSelectedRainStations.length,
        reservoirs: stationData.userSelectedReservoirs.length
      });
      
      // Navigate to document preparation
      // We don't need to pass location.state as we're using Jotai for state management
      navigate('/document-preparation');
      
      // Reset unsaved changes flag
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('[StationCardEdit] Error saving data:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองอีกครั้ง",
        variant: "destructive"
      });
    }
  };
  
  // Save and return to complaint form
  const saveAndReturn = async () => {
    try {
      console.log('[StationCardEdit] Saving and returning to complaint form');
      
      // Log the current Jotai state before navigation
      console.log('[StationCardEdit] Current Jotai state before returning:', {
        title: complaintData.title,
        description: complaintData.description,
        location: complaintData.location,
        amphure: stationData.currentAmphure,
        province: stationData.currentProvince,
        monitoringStations: stationData.userSelectedMonitoringStations.length,
        rainStations: stationData.userSelectedRainStations.length,
        reservoirs: stationData.userSelectedReservoirs.length
      });
      
      // Navigate back to complaint form
      // We don't need to pass location.state as we're using Jotai for state management
      navigate('/complaint/create');
      
      // Reset unsaved changes flag
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('[StationCardEdit] Error saving data:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองอีกครั้ง",
        variant: "destructive"
      });
    }
  };
  
  // Block navigation if there are unsaved changes
  useBlocker(
    ({ currentLocation, nextLocation }) => {
      if (
        hasUnsavedChanges &&
        currentLocation.pathname !== nextLocation.pathname
      ) {
        setShowUnsavedDialog(true);
        setPendingNavigation(nextLocation.pathname);
        return true;
      }
      return false;
    }
  );
  
  // Handle confirming navigation with unsaved changes
  const handleConfirmNavigation = () => {
    setShowUnsavedDialog(false);
    setHasUnsavedChanges(false);
    
    if (pendingNavigation) {
      navigate(pendingNavigation);
      setPendingNavigation(null);
    }
  };
  
  // Handle canceling navigation with unsaved changes
  const handleCancelNavigation = () => {
    setShowUnsavedDialog(false);
    setPendingNavigation(null);
  };
  
  // Handle saving changes
  const handleSave = async () => {
    try {
      console.log('[StationCardEdit] Saving changes');
      
      // Log the current Jotai state
      console.log('[StationCardEdit] Current Jotai state after save:', {
        title: complaintData.title,
        description: complaintData.description,
        location: complaintData.location,
        amphure: stationData.currentAmphure,
        province: stationData.currentProvince,
        monitoringStations: stationData.userSelectedMonitoringStations.length,
        rainStations: stationData.userSelectedRainStations.length,
        reservoirs: stationData.userSelectedReservoirs.length
      });
      
      // Reset unsaved changes flag
      setHasUnsavedChanges(false);
      
      // Show success toast
      toast({
        title: "บันทึกสำเร็จ",
        description: "บันทึกข้อมูลสถานีเรียบร้อยแล้ว",
      });
    } catch (error) {
      console.error('[StationCardEdit] Error saving data:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองอีกครั้ง",
        variant: "destructive"
      });
    }
  };
  
  // Handle discarding changes
  const handleDiscard = () => {
    console.log('[StationCardEdit] Discarding changes');
    setHasUnsavedChanges(false);
  };
  
  // Render loading state for the gray placeholder boxes
  const renderLoadingState = () => {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold mb-4 text-[#17254D]">กำลังโหลดข้อมูลสถานี...</h2>
        <div className="bg-gray-400 h-[120px] w-full rounded-md mb-4"></div>
        <div className="bg-gray-400 h-[120px] w-full rounded-md mb-4"></div>
        <div className="bg-gray-400 h-[120px] w-full rounded-md"></div>
      </div>
    );
  };
  
  // Render error state if no location data
  if (loadError) {
    return (
      <div className="flex flex-col min-h-screen">
        <StationCardEditHeader />
        <div className="flex-1 container mx-auto py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">ข้อมูลสนับสนุน</h1>
            
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <AlertDescription>
                {loadError}
              </AlertDescription>
            </Alert>
            
            <div className="flex justify-center mt-8">
              <Button 
                onClick={() => navigate('/complaint/create')}
                className="bg-[#42A5F5] text-white hover:bg-[#1E88E5] h-12 px-8 text-base flex items-center justify-center"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                กลับไปที่หน้าแบบฟอร์ม
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-[#F0F8FF]">
      <StationCardEditHeader />
      
      <div className="container mx-auto px-12 py-6 flex-1">
        <div className="flex flex-col space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">แก้ไขข้อมูลสถานี</h1>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={saveAndReturn}
                className="flex items-center"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                ย้อนกลับ
              </Button>
              <Button 
                onClick={saveAndNavigate}
                className="flex items-center"
              >
                ดำเนินการต่อ
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Upper half: Only ComplaintInfoCard */}
          <div className="mb-6">
            <ComplaintInfoCard 
              title="ข้อมูลข้อร้องเรียน"
              editable={false}
            />
          </div>
          
          {/* Lower half: StationCardEditInfo on left, WaterManagementPlanCard on right */}
          <div className="grid grid-cols-2 gap-6">
            {/* Left column - StationCardEditInfo or loading state */}
            <div>
              {isLoading ? renderLoadingState() : (
                <StationCardEditInfo 
                  onChangesMade={handleChangesMade}
                  onSave={handleSave}
                  onDiscard={handleDiscard}
                />
              )}
            </div>
            
            {/* Right column - Water Management Plan */}
            <div>
              <WaterManagementPlanCard />
            </div>
          </div>
        </div>
      </div>
      
      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onOpenChange={setShowUnsavedDialog}
        onSave={handleSave}
        onDiscard={handleDiscard}
        onCancel={handleCancelNavigation}
      />
    </div>
  );
};

export default StationCardEdit; 