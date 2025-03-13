import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAtom } from 'jotai';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, X, AlertTriangle } from 'lucide-react';
import { StationCardEditInfo } from '@/components/complaint/StationCardEditInfo';
import ComplaintInfoCard from '@/components/shared/ComplaintInfoCard';
import { UnsavedChangesDialog } from '@/components/complaint/UnsavedChangesDialog';
import { useStationEditState } from '@/hooks/useStationEditState';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { handleError, parseError, createRetryFunction, isTimeoutError, isNetworkError } from '@/utils/errorHandling';
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

// Create memoized station type components to prevent unnecessary re-renders
const MemoizedMonitoringTab = React.memo(() => <StationCardEditInfo stationType="monitoring" />);
const MemoizedRainTab = React.memo(() => <StationCardEditInfo stationType="rain" />);
const MemoizedReservoirTab = React.memo(() => <StationCardEditInfo stationType="reservoir" />);

/**
 * StationCardEdit component for editing station data
 * Uses the useStationEditState hook for state management
 */
const StationCardEdit: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // Use Jotai atoms for error handling UI state instead of local state
  const [syncError, setSyncError] = useAtom(syncErrorAtom);
  const [syncErrorMessage, setSyncErrorMessage] = useAtom(syncErrorMessageAtom);
  const [isRetrying, setIsRetrying] = useAtom(isRetryingAtom);
  const [retryCount, setRetryCount] = useAtom(retryCountAtom);
  const [MAX_RETRY_ATTEMPTS] = useAtom(maxRetryAttemptsAtom);
  const resetErrorState = useAtom(resetErrorStateAtom)[1];
  const setErrorState = useAtom(setErrorStateAtom)[1];
  const incrementRetryCount = useAtom(incrementRetryCountAtom)[1];
  
  // Get station management functions and state from hook
  const {
    // Station data status
    hasUnsavedChanges,
    areAllMonitoringStationsDisabled,
    areAllRainStationsDisabled,
    areAllReservoirsDisabled,
    
    // Loading states
    isLoadingMonitoring,
    isLoadingRain,
    isLoadingReservoirs,
    
    // UI state
    unsavedChangesDialogOpen,
    setUnsavedChangesDialogOpen,
    currentStationType,
    setCurrentStationType,
    
    // Station management functions
    synchronizeAllStations,
    
    // Navigation functions
    handleBackNavigation,
    saveChangesAndNavigate,
    discardChangesAndNavigate,
    cancelNavigation
  } = useStationEditState();
  
  // Create stable references for functions
  const stableFunctionsRef = useRef({
    synchronizeAllStations,
    handleBackNavigation,
    saveChangesAndNavigate,
    discardChangesAndNavigate,
    cancelNavigation
  });
  
  // Update refs when functions change
  stableFunctionsRef.current = {
    synchronizeAllStations,
    handleBackNavigation,
    saveChangesAndNavigate,
    discardChangesAndNavigate,
    cancelNavigation
  };
  
  // Memoize the loading state to avoid unnecessary re-renders
  const isLoading = useMemo(() => 
    isLoadingMonitoring || isLoadingRain || isLoadingReservoirs,
    [isLoadingMonitoring, isLoadingRain, isLoadingReservoirs]
  );
  
  // Function to synchronize station data with enhanced error handling
  const synchronizeStationData = useCallback(async () => {
    try {
      // Reset error state using the atom action
      resetErrorState();
      
      // Set a timeout for the synchronization
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Synchronization timed out')), 15000);
      });
      
      // Race the synchronization against the timeout
      await Promise.race([
        stableFunctionsRef.current.synchronizeAllStations(),
        timeoutPromise
      ]);
      
      // Reset retry count on success
      setRetryCount(0);
      
      // Show success toast
      toast({
        title: 'ซิงโครไนซ์ข้อมูลสำเร็จ',
        description: 'ข้อมูลสถานีได้รับการอัปเดตเรียบร้อยแล้ว',
      });
    } catch (error) {
      const typedError = parseError(error);
      console.error('[StationCardEdit] Error synchronizing station data:', typedError);
      
      // Set the error state using the atom action
      setErrorState(typedError, typedError.message || 'Unknown error');
      
      // Determine error type for better user feedback
      let errorTitle = 'ไม่สามารถซิงโครไนซ์ข้อมูลสถานีได้';
      let errorDescription = 'เกิดข้อผิดพลาดในการซิงโครไนซ์ข้อมูลสถานี กรุณาลองใหม่อีกครั้ง';
      
      if (isTimeoutError(typedError)) {
        errorTitle = 'การซิงโครไนซ์ข้อมูลใช้เวลานานเกินไป';
        errorDescription = 'การเชื่อมต่อกับเซิร์ฟเวอร์ใช้เวลานานเกินไป กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตและลองใหม่อีกครั้ง';
      } else if (isNetworkError(typedError)) {
        errorTitle = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้';
        errorDescription = 'เกิดปัญหาการเชื่อมต่อเครือข่าย กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตและลองใหม่อีกครั้ง';
      }
      
      // Create an async wrapper for handleRetry to match the expected Promise<any> type
      const asyncRetry = async () => {
        await handleRetry();
        return true;
      };
      
      // Use centralized error handling with recovery options
      handleError({
        source: 'apiCall',
        operation: 'synchronizeAllStations',
        originalError: typedError,
        component: 'StationCardEdit',
        details: {
          monitoringDisabled: areAllMonitoringStationsDisabled,
          rainDisabled: areAllRainStationsDisabled,
          reservoirsDisabled: areAllReservoirsDisabled,
          retryCount
        },
        recoveryOptions: {
          retry: retryCount < MAX_RETRY_ATTEMPTS ? asyncRetry : undefined
        }
      });
      
      // Show error toast with retry button
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: 'destructive',
        action: retryCount < MAX_RETRY_ATTEMPTS ? (
          <Button variant="outline" size="sm" onClick={handleRetry}>
            ลองใหม่
          </Button>
        ) : undefined
      });
    }
  }, [
    toast, 
    retryCount, 
    areAllMonitoringStationsDisabled, 
    areAllRainStationsDisabled, 
    areAllReservoirsDisabled,
    resetErrorState,
    setErrorState,
    setRetryCount,
    MAX_RETRY_ATTEMPTS
  ]);
  
  // Log component mount and props
  useEffect(() => {
    // Check for edge cases where all stations of a type are disabled
    if (areAllMonitoringStationsDisabled || areAllRainStationsDisabled || areAllReservoirsDisabled) {
      console.warn('[StationCardEdit] Some station types are completely disabled');
    }
    
    // Synchronize all station data on mount
    synchronizeStationData();
  }, [
    areAllMonitoringStationsDisabled, 
    areAllRainStationsDisabled, 
    areAllReservoirsDisabled,
    synchronizeStationData
  ]);
  
  // Function to retry synchronization with exponential backoff
  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    incrementRetryCount();
    
    try {
      // Add exponential backoff
      const backoffDelay = 1000 * Math.pow(2, retryCount);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      
      await synchronizeStationData();
    } catch (error) {
      // Error is already handled in synchronizeStationData
      console.error('[StationCardEdit] Retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  }, [retryCount, synchronizeStationData, setIsRetrying, incrementRetryCount]);
  
  // Handle navigation back with enhanced error handling
  const handleBack = useCallback(() => {
    try {
      const navigationResult = stableFunctionsRef.current.handleBackNavigation('/complaint-form');
      
      if (navigationResult) {
        // Navigate using the path from the result, but don't pass state via react-router
        // The navigation state is now stored in Jotai atoms
        navigate(navigationResult.path);
      }
    } catch (error) {
      // Use centralized error handling with fallback navigation
      handleError({
        source: 'navigation',
        operation: 'handleBack',
        originalError: parseError(error),
        component: 'StationCardEdit',
        recoveryOptions: {
          fallback: () => navigate('/complaint-form')
        }
      });
      
      // Show error toast
      toast({
        title: 'ไม่สามารถย้อนกลับได้',
        description: 'เกิดข้อผิดพลาดในการนำทางย้อนกลับ กำลังนำทางไปยังหน้าแบบฟอร์มร้องเรียน',
        variant: 'destructive'
      });
      
      // Fallback navigation
      navigate('/complaint-form');
    }
  }, [navigate, toast]);
  
  // Handle save with enhanced error handling
  const handleSave = useCallback(() => {
    try {
      // Save changes and get navigation info
      const navigationInfo = stableFunctionsRef.current.saveChangesAndNavigate();
      
      // Navigate using the path from the result, but don't pass state via react-router
      // The navigation state is now stored in Jotai atoms
      navigate(navigationInfo.path);
      
      // Show success toast
      toast({
        title: 'บันทึกการเปลี่ยนแปลงสำเร็จ',
        description: 'บันทึกการเปลี่ยนแปลงสถานีเรียบร้อยแล้ว',
      });
    } catch (error) {
      const typedError = parseError(error);
      
      // Create an async wrapper for handleSave to match the expected Promise<any> type
      const asyncRetry = async () => {
        handleSave();
        return true;
      };
      
      // Use centralized error handling
      handleError({
        source: 'stationManagement',
        operation: 'saveChanges',
        originalError: typedError,
        component: 'StationCardEdit',
        details: {
          hasUnsavedChanges
        },
        recoveryOptions: {
          retry: asyncRetry
        }
      });
      
      // Show error toast with retry button
      toast({
        title: 'ไม่สามารถบันทึกการเปลี่ยนแปลงได้',
        description: 'เกิดข้อผิดพลาดในการบันทึกการเปลี่ยนแปลง กรุณาลองใหม่อีกครั้ง',
        variant: 'destructive',
        action: (
          <Button variant="outline" size="sm" onClick={handleSave}>
            ลองใหม่
          </Button>
        )
      });
    }
  }, [navigate, toast, hasUnsavedChanges]);
  
  // Handle discard with enhanced error handling
  const handleDiscard = useCallback(() => {
    try {
      // Discard changes and get navigation info
      const navigationInfo = stableFunctionsRef.current.discardChangesAndNavigate();
      
      // Navigate using the path from the result, but don't pass state via react-router
      // The navigation state is now stored in Jotai atoms
      navigate(navigationInfo.path);
      
      // Show success toast
      toast({
        title: 'ยกเลิกการเปลี่ยนแปลงสำเร็จ',
        description: 'ยกเลิกการเปลี่ยนแปลงสถานีเรียบร้อยแล้ว',
      });
    } catch (error) {
      // Use centralized error handling
      handleError({
        source: 'stationManagement',
        operation: 'discardChanges',
        originalError: parseError(error),
        component: 'StationCardEdit',
        recoveryOptions: {
          fallback: () => navigate('/complaint-form')
        }
      });
      
      // Show error toast
      toast({
        title: 'ไม่สามารถยกเลิกการเปลี่ยนแปลงได้',
        description: 'เกิดข้อผิดพลาดในการยกเลิกการเปลี่ยนแปลง กำลังนำทางไปยังหน้าแบบฟอร์มร้องเรียน',
        variant: 'destructive'
      });
      
      // Fallback navigation
      navigate('/complaint-form');
    }
  }, [navigate, toast]);
  
  // Handle tab change with enhanced error handling
  const handleTabChange = useCallback((value: string) => {
    try {
      setCurrentStationType(value as 'monitoring' | 'rain' | 'reservoir');
    } catch (error) {
      // Use centralized error handling
      handleError({
        source: 'uiState',
        operation: 'changeTab',
        originalError: parseError(error),
        component: 'StationCardEdit',
        details: { newTab: value }
      });
      
      // Show error toast
      toast({
        title: 'ไม่สามารถเปลี่ยนแท็บได้',
        description: 'เกิดข้อผิดพลาดในการเปลี่ยนแท็บ กรุณาลองใหม่อีกครั้ง',
        variant: 'destructive'
      });
    }
  }, [setCurrentStationType, toast]);
  
  // Memoize the error UI to prevent unnecessary re-renders
  const errorUI = useMemo(() => {
    if (!syncError) return null;
    
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Station Data</AlertTitle>
          <AlertDescription>
            {syncErrorMessage}
          </AlertDescription>
        </Alert>
        
        <div className="flex justify-center">
          <Button 
            onClick={handleRetry} 
            disabled={isRetrying || retryCount >= MAX_RETRY_ATTEMPTS}
            className="mx-2"
          >
            {isRetrying ? 'Retrying...' : `Retry Loading (${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleBack}
            className="mx-2"
          >
            Return to Previous Page
          </Button>
        </div>
      </div>
    );
  }, [syncError, syncErrorMessage, handleRetry, handleBack, isRetrying, retryCount, MAX_RETRY_ATTEMPTS]);
  
  // Memoize the loading UI to prevent unnecessary re-renders
  const loadingUI = useMemo(() => {
    if (!isLoading) return null;
    
    return (
      <div className="container mx-auto py-6 flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }, [isLoading]);
  
  // Memoize the warning alert to prevent unnecessary re-renders
  const warningAlert = useMemo(() => {
    if (!areAllMonitoringStationsDisabled && !areAllRainStationsDisabled && !areAllReservoirsDisabled) {
      return null;
    }
    
    return (
      <Alert className="mb-6">
        <AlertTriangle className="h-4 w-4 mr-2" />
        <AlertTitle>คำเตือน</AlertTitle>
        <AlertDescription>
          {areAllMonitoringStationsDisabled && <p>สถานีตรวจวัดน้ำทั้งหมดถูกปิดใช้งาน</p>}
          {areAllRainStationsDisabled && <p>สถานีตรวจวัดฝนทั้งหมดถูกปิดใช้งาน</p>}
          {areAllReservoirsDisabled && <p>อ่างเก็บน้ำทั้งหมดถูกปิดใช้งาน</p>}
        </AlertDescription>
      </Alert>
    );
  }, [areAllMonitoringStationsDisabled, areAllRainStationsDisabled, areAllReservoirsDisabled]);
  
  // Memoize the sync error alert to prevent unnecessary re-renders
  const syncErrorAlert = useMemo(() => {
    if (!syncError) return null;
    
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertTriangle className="h-4 w-4 mr-2" />
        <AlertTitle>ไม่สามารถซิงโครไนซ์ข้อมูลสถานีได้</AlertTitle>
        <AlertDescription className="mt-2">
          <p>เกิดข้อผิดพลาดในการซิงโครไนซ์ข้อมูลสถานี: {syncErrorMessage}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2" 
            onClick={handleRetry}
            disabled={isRetrying || retryCount >= MAX_RETRY_ATTEMPTS}
          >
            {isRetrying ? 'กำลังลองใหม่...' : 'ลองใหม่อีกครั้ง'}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }, [syncError, syncErrorMessage, handleRetry, isRetrying, retryCount, MAX_RETRY_ATTEMPTS]);
  
  // Memoize the header UI to prevent unnecessary re-renders
  const headerUI = useMemo(() => (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
      <div className="flex items-center mb-4 md:mb-0">
        <Button
          variant="outline"
          size="icon"
          onClick={handleBack}
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold">แก้ไขข้อมูลสถานี</h2>
      </div>
      <div className="flex space-x-2">
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
  ), [handleBack, handleDiscard, handleSave, hasUnsavedChanges]);
  
  // Memoize the tabs UI to prevent unnecessary re-renders
  const tabsUI = useMemo(() => (
    <Tabs defaultValue="monitoring" onValueChange={handleTabChange}>
      <TabsList className="mb-4">
        <TabsTrigger value="monitoring">สถานีตรวจวัดน้ำ</TabsTrigger>
        <TabsTrigger value="rain">สถานีตรวจวัดฝน</TabsTrigger>
        <TabsTrigger value="reservoir">อ่างเก็บน้ำ</TabsTrigger>
      </TabsList>
      
      <TabsContent value="monitoring">
        <MemoizedMonitoringTab />
      </TabsContent>
      
      <TabsContent value="rain">
        <MemoizedRainTab />
      </TabsContent>
      
      <TabsContent value="reservoir">
        <MemoizedReservoirTab />
      </TabsContent>
    </Tabs>
  ), [handleTabChange]);
  
  // Render error state
  if (syncError) {
    return errorUI;
  }
  
  // Render loading state
  if (isLoading) {
    return loadingUI;
  }
  
  return (
    <div className="container mx-auto py-6 px-4">
      <Card className="w-full">
        <CardContent className="p-6">
          {headerUI}
          {syncErrorAlert}
          {warningAlert}
          {tabsUI}
        </CardContent>
      </Card>
      
      <UnsavedChangesDialog
        open={unsavedChangesDialogOpen}
        onOpenChange={setUnsavedChangesDialogOpen}
        onSave={handleSave}
        onDiscard={handleDiscard}
        onCancel={cancelNavigation}
      />
      
      <ComplaintInfoCard className="mt-6" />
    </div>
  );
};

// Wrap the component with React.memo to prevent unnecessary re-renders
export default React.memo(StationCardEdit); 