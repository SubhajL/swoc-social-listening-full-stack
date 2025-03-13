import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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

/**
 * StationCardEdit component for editing station data
 * Uses the useStationEditState hook for state management
 */
const StationCardEdit: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // State for tracking errors
  const [syncError, setSyncError] = useState<Error | null>(null);
  const [syncErrorMessage, setSyncErrorMessage] = useState<string>('');
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRY_ATTEMPTS = 3;
  
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
  
  // Log component mount and props
  useEffect(() => {
    console.log('[StationCardEdit] Component mounted');
    console.log('[StationCardEdit] Location state:', location.state);
    
    // Check for edge cases where all stations of a type are disabled
    if (areAllMonitoringStationsDisabled) {
      console.warn('[StationCardEdit] All monitoring stations are disabled');
    }
    if (areAllRainStationsDisabled) {
      console.warn('[StationCardEdit] All rain stations are disabled');
    }
    if (areAllReservoirsDisabled) {
      console.warn('[StationCardEdit] All reservoirs are disabled');
    }
    
    // Synchronize all station data on mount
    synchronizeStationData();
  }, [
    location.state, 
    areAllMonitoringStationsDisabled, 
    areAllRainStationsDisabled, 
    areAllReservoirsDisabled
  ]);
  
  // Function to synchronize station data with enhanced error handling
  const synchronizeStationData = async () => {
    try {
      setSyncError(null);
      setSyncErrorMessage('');
      setIsRetrying(false);
      
      console.log('[StationCardEdit] Synchronizing station data');
      
      // Set a timeout for the synchronization
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Synchronization timed out')), 15000);
      });
      
      // Race the synchronization against the timeout
      await Promise.race([
        synchronizeAllStations(),
        timeoutPromise
      ]);
      
      console.log('[StationCardEdit] Station data synchronized successfully');
      
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
      
      // Set the error state
      setSyncError(typedError);
      setSyncErrorMessage(typedError.message || 'Unknown error');
      
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
  };
  
  // Function to retry synchronization with exponential backoff
  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    
    try {
      console.log(`[StationCardEdit] Retry attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS}`);
      
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
  };
  
  // Handle navigation back with enhanced error handling
  const handleBack = () => {
    try {
      console.log('[StationCardEdit] Handling back navigation');
      
      const navigationResult = handleBackNavigation('/complaint-form');
      
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
  };
  
  // Handle save with enhanced error handling
  const handleSave = () => {
    try {
      console.log('[StationCardEdit] Handling save');
      
      // Save changes and get navigation info
      const navigationInfo = saveChangesAndNavigate();
      
      console.log('[StationCardEdit] Changes saved, navigating to:', navigationInfo.path);
      
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
  };
  
  // Handle discard with enhanced error handling
  const handleDiscard = () => {
    try {
      console.log('[StationCardEdit] Handling discard');
      
      // Discard changes and get navigation info
      const navigationInfo = discardChangesAndNavigate();
      
      console.log('[StationCardEdit] Changes discarded, navigating to:', navigationInfo.path);
      
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
  };
  
  // Handle tab change with enhanced error handling
  const handleTabChange = (value: string) => {
    try {
      console.log('[StationCardEdit] Tab changed to:', value);
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
  };
  
  // Render error state
  if (syncError) {
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
  }
  
  // Render loading state
  if (isLoadingMonitoring || isLoadingRain || isLoadingReservoirs) {
    return (
      <div className="container mx-auto py-6 flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 px-4">
      <Card className="w-full">
        <CardContent className="p-6">
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

          {/* Show error alert if synchronization failed */}
          {syncError && (
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
          )}

          {/* Show warning if all stations of a type are disabled */}
          {(areAllMonitoringStationsDisabled || areAllRainStationsDisabled || areAllReservoirsDisabled) && (
            <Alert className="mb-6">
              <AlertTriangle className="h-4 w-4 mr-2" />
              <AlertTitle>คำเตือน</AlertTitle>
              <AlertDescription>
                {areAllMonitoringStationsDisabled && <p>สถานีตรวจวัดน้ำทั้งหมดถูกปิดใช้งาน</p>}
                {areAllRainStationsDisabled && <p>สถานีตรวจวัดฝนทั้งหมดถูกปิดใช้งาน</p>}
                {areAllReservoirsDisabled && <p>อ่างเก็บน้ำทั้งหมดถูกปิดใช้งาน</p>}
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="monitoring" onValueChange={handleTabChange}>
            <TabsList className="mb-4">
              <TabsTrigger value="monitoring">สถานีตรวจวัดน้ำ</TabsTrigger>
              <TabsTrigger value="rain">สถานีตรวจวัดฝน</TabsTrigger>
              <TabsTrigger value="reservoir">อ่างเก็บน้ำ</TabsTrigger>
            </TabsList>
            
            <TabsContent value="monitoring">
              <StationCardEditInfo stationType="monitoring" />
            </TabsContent>
            
            <TabsContent value="rain">
              <StationCardEditInfo stationType="rain" />
            </TabsContent>
            
            <TabsContent value="reservoir">
              <StationCardEditInfo stationType="reservoir" />
            </TabsContent>
          </Tabs>
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

export default StationCardEdit; 