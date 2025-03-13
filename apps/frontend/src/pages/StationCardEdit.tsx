import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, X } from 'lucide-react';
import { StationCardEditInfo } from '@/components/complaint/StationCardEditInfo';
import ComplaintInfoCard from '@/components/shared/ComplaintInfoCard';
import { UnsavedChangesDialog } from '@/components/complaint/UnsavedChangesDialog';
import { useStationManagement } from '@/hooks/useStationManagement';
import { useToast } from '@/components/ui/use-toast';

/**
 * StationCardEdit component for editing station data
 * Uses the useStationManagement hook for state management
 */
const StationCardEdit: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // Get station management functions and state from hook
  const {
    hasUnsavedChanges,
    saveChanges,
    discardChanges,
    synchronizeAllStations,
    areAllMonitoringStationsDisabled,
    areAllRainStationsDisabled,
    areAllReservoirsDisabled
  } = useStationManagement();
  
  // Local state for UI
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [waterManagementDialogOpen, setWaterManagementDialogOpen] = useState(false);
  
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
  const handleBack = useCallback(() => {
    console.log('[StationCardEdit] Handling back navigation');
    
    // If there are unsaved changes, show dialog
    if (hasUnsavedChanges) {
      console.log('[StationCardEdit] Unsaved changes detected, showing dialog');
      setShowUnsavedDialog(true);
      setPendingNavigation('/complaint-form');
    } else {
      // No unsaved changes, navigate back
      console.log('[StationCardEdit] No unsaved changes, navigating back');
      navigate('/complaint-form');
    }
  }, [hasUnsavedChanges, navigate]);
  
  // Handle save
  const handleSave = useCallback(() => {
    console.log('[StationCardEdit] Handling save');
    
    try {
      // Save changes and get navigation state
      const navigationState = saveChanges();
      
      console.log('[StationCardEdit] Changes saved, navigating back with state:', navigationState);
      
      // Navigate back with state
      navigate('/complaint-form', { state: navigationState });
      
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
  }, [saveChanges, navigate, toast]);
  
  // Handle discard
  const handleDiscard = useCallback(() => {
    console.log('[StationCardEdit] Handling discard');
    
    try {
      // Discard changes and get navigation state
      const navigationState = discardChanges();
      
      console.log('[StationCardEdit] Changes discarded, navigating back with state:', navigationState);
      
      // Close dialog
      setShowUnsavedDialog(false);
      
      // Navigate back with state
      if (pendingNavigation) {
        navigate(pendingNavigation, { state: navigationState });
      }
      
      // Reset pending navigation
      setPendingNavigation(null);
    } catch (error) {
      console.error('[StationCardEdit] Error discarding changes:', error);
      
      // Show error toast
      toast({
        title: 'Error',
        description: 'Failed to discard changes. Please try again.',
        variant: 'destructive'
      });
    }
  }, [discardChanges, navigate, pendingNavigation, toast]);
  
  // Handle cancel (keep editing)
  const handleCancel = useCallback(() => {
    console.log('[StationCardEdit] Handling cancel (keep editing)');
    
    // Close dialog
    setShowUnsavedDialog(false);
    
    // Reset pending navigation
    setPendingNavigation(null);
  }, []);
  
  // Handle dialog open change
  const handleDialogOpenChange = useCallback((open: boolean) => {
    console.log('[StationCardEdit] Dialog open change:', open);
    
    // If dialog is being closed, reset pending navigation
    if (!open) {
      setPendingNavigation(null);
    }
    
    // Update dialog state
    setShowUnsavedDialog(open);
  }, []);
  
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
              <Tabs defaultValue="monitoring">
                <TabsList className="mb-4">
                  <TabsTrigger value="monitoring">สถานีตรวจวัดน้ำ</TabsTrigger>
                  <TabsTrigger value="rain">สถานีวัดน้ำฝน</TabsTrigger>
                  <TabsTrigger value="reservoir">อ่างเก็บน้ำ</TabsTrigger>
                </TabsList>
                
                <TabsContent value="monitoring">
                  <StationCardEditInfo type="monitoring" />
                </TabsContent>
                
                <TabsContent value="rain">
                  <StationCardEditInfo type="rain" />
                </TabsContent>
                
                <TabsContent value="reservoir">
                  <StationCardEditInfo type="reservoir" />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Unsaved changes dialog */}
      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onOpenChange={handleDialogOpenChange}
        onSave={handleSave}
        onDiscard={handleDiscard}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default StationCardEdit; 