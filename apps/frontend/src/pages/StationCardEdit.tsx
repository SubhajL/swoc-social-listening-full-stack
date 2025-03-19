import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { useAtom } from 'jotai';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useBlocker } from '@/hooks/useBlocker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StationCardEditInfo } from '@/components/complaint/StationCardEditInfo';
import { useStationManagement } from '@/hooks/useStationManagement';
import { UnsavedChangesDialog } from '@/components/complaint/UnsavedChangesDialog';
import { ComplaintInfoCard } from '@/components/shared/ComplaintInfoCard';
import { useComplaintData } from '@/atoms/hooks';
import { 
  syncErrorAtom, 
  syncErrorMessageAtom, 
  isRetryingAtom, 
  retryCountAtom, 
  maxRetryAttemptsAtom,
  resetErrorStateAtom,
  setErrorStateAtom,
  incrementRetryCountAtom
} from '@/atoms/errorHandlingUI';
import { AlertCircle, RefreshCw, Settings, ArrowLeft, Save, X, Bell } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from "@/hooks/useAuth";
import logo1 from "@/assets/logo1.png";
import logo2 from "@/assets/logo2.png";
import { WaterLevelInfoCard, WaterManagementPlanCard } from "@/components/shared";
import { currentAmphureAtom, currentProvinceAtom } from "@/atoms/stationData";

// Create memoized station type components to prevent unnecessary re-renders
const MonitoringStationTab = () => (
  <TabsContent value="monitoring">
    <StationCardEditInfo stationType="monitoring" />
  </TabsContent>
);

const RainStationTab = () => (
  <TabsContent value="rain">
    <StationCardEditInfo stationType="rain" />
  </TabsContent>
);

const ReservoirTab = () => (
  <TabsContent value="reservoir">
    <StationCardEditInfo stationType="reservoir" />
  </TabsContent>
);

// Header component with settings button and navigation
const StationCardEditHeader = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
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
        <div className="flex space-x-4">
          <Link to="/system-online" className="text-gray-600 hover:text-blue-600">
            ระบบจัดการข้อมูลสื่อสังคมออนไลน์
          </Link>
          <Link to="/system-complaint" className="text-blue-600 font-medium">
            ระบบตอบประเด็นข้อร้องเรียน
          </Link>
          <Link to="/system-dashboard" className="text-gray-600 hover:text-blue-600">
            ระบบแสดงผลข้อมูลและสรุปผลผู้บริหาร
          </Link>
        </div>
        <Button variant="ghost" size="icon" onClick={handleSettingsClick}>
          <Settings className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
        {isAuthenticated && (
          <Link to="/profile" className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 font-medium">
            {user?.name?.charAt(0) || 'U'}
          </Link>
        )}
      </div>
    </div>
  );
};

/**
 * StationCardEdit component for editing station data
 * Uses the useStationEditState hook for state management
 */
const StationCardEdit = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  
  // Use Jotai atoms for error handling UI state instead of local state
  const [syncError] = useAtom(syncErrorAtom);
  const [syncErrorMessage] = useAtom(syncErrorMessageAtom);
  const [isRetrying] = useAtom(isRetryingAtom);
  const [retryCount] = useAtom(retryCountAtom);
  const [MAX_RETRY_ATTEMPTS] = useAtom(maxRetryAttemptsAtom);
  const resetErrorState = useAtom(resetErrorStateAtom)[1];
  const setErrorState = useAtom(setErrorStateAtom)[1];
  const incrementRetryCount = useAtom(incrementRetryCountAtom)[1];
  
  // Get complaint data from Jotai store
  const complaintData = useComplaintData();
  
  // Get station management functions
  const {
    hasUnsavedChanges,
    enterEditMode,
    discardChanges,
    saveChanges,
    isEditMode
  } = useStationManagement();
  
  // State for the unsaved changes dialog
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  
  // Initialize edit mode when component mounts
  useEffect(() => {
    console.log('[StationCardEdit] Component mounted, entering edit mode');
    enterEditMode();
  }, [enterEditMode]);
  
  // Define handleError function
  const handleError = useCallback((error: Error) => {
    console.error('Operation failed:', error);
    setErrorState(error, error.message || 'An unknown error occurred');
    toast({
      variant: "destructive",
      title: "Error",
      description: error.message || 'An unknown error occurred',
    });
  }, [toast, setErrorState]);
  
  // Fix the useBlocker hook usage
  const blocker = useBlocker(({ currentLocation, nextLocation }: { 
    currentLocation: { pathname: string }, 
    nextLocation: { pathname: string } 
  }) => {
    return hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname;
  });
  
  // Handle blocked navigation
  useEffect(() => {
    if (blocker.state === 'blocked') {
      setShowUnsavedChangesDialog(true);
      setPendingNavigation(blocker.location?.pathname || '');
    }
  }, [blocker]);
  
  // Handle save button click
  const handleSave = useCallback(async () => {
    try {
      console.log('[StationCardEdit] Save button clicked');
      
      // Save changes
      const result = saveChanges();
      
      if (result) {
        // Navigate back to the complaint form
        navigate('/complaint/create', { 
          state: { 
            returnedFromStationEdit: true,
            editSessionTimestamp: Date.now()
          } 
        });
      }
    } catch (error) {
      console.error('[StationCardEdit] Error saving changes:', error);
      
      // Use centralized error handling
      handleError(error instanceof Error ? error : new Error(String(error)));
    }
  }, [saveChanges, navigate, handleError]);
  
  // Handle discard button click
  const handleDiscard = useCallback(() => {
    try {
      console.log('[StationCardEdit] Discard button clicked');
      
      // Discard changes
      const result = discardChanges();
      
      if (result) {
        // Navigate back to the complaint form
        navigate('/complaint/create', { 
          state: { 
            preserveState: true,
            discardedChanges: true
          } 
        });
      }
    } catch (error) {
      console.error('[StationCardEdit] Error discarding changes:', error);
      
      // Use centralized error handling
      handleError(error instanceof Error ? error : new Error(String(error)));
    }
  }, [discardChanges, navigate, handleError]);
  
  // Handle continue navigation (from unsaved changes dialog)
  const handleContinueNavigation = useCallback(() => {
    if (pendingNavigation) {
      // Discard changes
      discardChanges();
      
      // Close dialog
      setShowUnsavedChangesDialog(false);
      
      // Navigate to the pending location
      navigate(pendingNavigation);
      
      // Reset pending navigation
      setPendingNavigation(null);
    }
  }, [pendingNavigation, discardChanges, navigate]);
  
  // Handle cancel navigation (from unsaved changes dialog)
  const handleCancelNavigation = useCallback(() => {
    // Close dialog
    setShowUnsavedChangesDialog(false);
    
    // Reset pending navigation
    setPendingNavigation(null);
    
    // Reset blocker
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
  }, [blocker]);

  // Get location data from complaint
  const locationData = useMemo(() => {
    // Extract amphure and province from location string if possible
    if (complaintData && complaintData.location) {
      const locationParts = complaintData.location.split(',').map(part => part.trim());
      let amphure, province;
      
      if (locationParts.length >= 2) {
        // Assume format is "amphure, province"
        amphure = locationParts[0];
        province = locationParts[1];
      } else if (locationParts.length === 1) {
        // Only one part, assume it's province
        province = locationParts[0];
      }
      
      return { amphure, province };
    }
    
    return { amphure: undefined, province: undefined };
  }, [complaintData]);

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC]">
      <StationCardEditHeader />
      
      <div className="container mx-auto px-4 py-6 flex-grow">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            className="mr-2"
            onClick={() => {
              if (hasUnsavedChanges) {
                setShowUnsavedChangesDialog(true);
                setPendingNavigation('/complaint/create');
              } else {
                navigate('/complaint/create');
              }
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            กลับ
          </Button>
          <h1 className="text-2xl font-semibold text-[#17254D]">แก้ไขข้อมูลสถานี</h1>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="mb-6">
              <CardContent className="p-6">
                <Tabs defaultValue="monitoring" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="monitoring">สถานีเฝ้าระวัง</TabsTrigger>
                    <TabsTrigger value="rain">สถานีวัดน้ำฝน</TabsTrigger>
                    <TabsTrigger value="reservoir">เขื่อน/อ่างเก็บน้ำ</TabsTrigger>
                  </TabsList>
                  <TabsContent value="monitoring">
                    <MonitoringStationTab />
                  </TabsContent>
                  <TabsContent value="rain">
                    <RainStationTab />
                  </TabsContent>
                  <TabsContent value="reservoir">
                    <ReservoirTab />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
            
            <div className="flex justify-between mb-6">
              <Button 
                variant="outline" 
                onClick={handleDiscard}
                disabled={!hasUnsavedChanges}
              >
                <X className="h-4 w-4 mr-2" />
                ยกเลิกการเปลี่ยนแปลง
              </Button>
              <Button 
                onClick={handleSave}
                disabled={!hasUnsavedChanges}
              >
                <Save className="h-4 w-4 mr-2" />
                บันทึกการเปลี่ยนแปลง
              </Button>
            </div>
          </div>
          
          <div>
            <ComplaintInfoCard 
              className="mb-6"
            />
            <WaterLevelInfoCard 
              title="ข้อมูลระดับน้ำ" 
              location={locationData}
            />
          </div>
        </div>
      </div>
      
      {/* Unsaved changes dialog */}
      <UnsavedChangesDialog 
        open={showUnsavedChangesDialog} 
        onOpenChange={setShowUnsavedChangesDialog}
        onSave={handleSave}
        onDiscard={handleContinueNavigation}
        onCancel={handleCancelNavigation}
      />
    </div>
  );
};

export default StationCardEdit; 