import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, X } from 'lucide-react';
import { StationCardEditInfo } from '@/components/complaint/StationCardEditInfo';
import ComplaintInfoCard from '@/components/shared/ComplaintInfoCard';
import { UnsavedChangesDialog } from '@/components/complaint/UnsavedChangesDialog';
import { useStationEditState } from '@/hooks/useStationEditState';
import { useToast } from '@/components/ui/use-toast';

/**
 * StationCardEdit component for editing station data
 * Uses the useStationEditState hook for state management
 */
const StationCardEdit: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
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
    try {
      synchronizeAllStations();
    } catch (error) {
      console.error('[StationCardEdit] Error synchronizing station data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load station data. Please try again.',
        variant: 'destructive'
      });
    }
  }, [
    location.state, 
    synchronizeAllStations, 
    areAllMonitoringStationsDisabled, 
    areAllRainStationsDisabled, 
    areAllReservoirsDisabled,
    toast
  ]);
  
  // Handle navigation back
  const handleBack = () => {
    console.log('[StationCardEdit] Handling back navigation');
    
    const navigationResult = handleBackNavigation('/complaint-form');
    
    if (navigationResult) {
      // Navigate using the path from the result, but don't pass state via react-router
      // The navigation state is now stored in Jotai atoms
      navigate(navigationResult.path);
    }
  };
  
  // Handle save
  const handleSave = () => {
    console.log('[StationCardEdit] Handling save');
    
    try {
      // Save changes and get navigation info
      const navigationInfo = saveChangesAndNavigate();
      
      console.log('[StationCardEdit] Changes saved, navigating to:', navigationInfo.path);
      
      // Navigate using the path from the result, but don't pass state via react-router
      // The navigation state is now stored in Jotai atoms
      navigate(navigationInfo.path);
      
      // Show success toast
      toast({
        title: 'Success',
        description: 'Station changes saved successfully',
      });
    } catch (error) {
      console.error('[StationCardEdit] Error saving changes:', error);
      
      // Show error toast
      toast({
        title: 'Error',
        description: 'Failed to save changes. Please try again.',
        variant: 'destructive'
      });
    }
  };
  
  // Handle discard
  const handleDiscard = () => {
    console.log('[StationCardEdit] Handling discard');
    
    try {
      // Discard changes and get navigation info
      const navigationInfo = discardChangesAndNavigate();
      
      console.log('[StationCardEdit] Changes discarded, navigating to:', navigationInfo.path);
      
      // Navigate using the path from the result, but don't pass state via react-router
      // The navigation state is now stored in Jotai atoms
      navigate(navigationInfo.path);
    } catch (error) {
      console.error('[StationCardEdit] Error discarding changes:', error);
      
      // Show error toast
      toast({
        title: 'Error',
        description: 'Failed to discard changes. Please try again.',
        variant: 'destructive'
      });
    }
  };
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    console.log('[StationCardEdit] Tab changed to:', value);
    setCurrentStationType(value as 'monitoring' | 'rain' | 'reservoir');
  };
  
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
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">แก้ไขสถานีตรวจวัด</h1>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleBack}>
            <X className="h-4 w-4 mr-2" />
            ยกเลิก
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            บันทึก
          </Button>
        </div>
      </div>
      
      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          <ComplaintInfoCard 
            title="ข้อมูลเรื่องร้องเรียน"
            editable={false}
          />
        </div>
        
        {/* Right column (spans 2 columns) */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <Tabs 
                defaultValue={currentStationType}
                onValueChange={handleTabChange}
              >
                <TabsList className="mb-4">
                  <TabsTrigger value="monitoring">สถานีตรวจวัดน้ำ</TabsTrigger>
                  <TabsTrigger value="rain">สถานีวัดน้ำฝน</TabsTrigger>
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
        </div>
      </div>
      
      {/* Unsaved changes dialog */}
      <UnsavedChangesDialog
        open={unsavedChangesDialogOpen}
        onOpenChange={setUnsavedChangesDialogOpen}
        onSave={handleSave}
        onDiscard={handleDiscard}
        onCancel={cancelNavigation}
      />
    </div>
  );
};

export default StationCardEdit; 