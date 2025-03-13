import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { MonitoringStationCard } from '@/components/monitoring/MonitoringStationCard';
import { RainStationCard } from '@/components/monitoring/RainStationCard';
import { ReservoirCard } from '@/components/monitoring/ReservoirCard';
import { StationSelectionDialog } from '@/components/complaint/StationSelectionDialog';
import { useStationManagement } from '@/hooks/useStationManagement';
import { MonitoringStation } from '@/types/monitoring-station';
import { RainStation } from '@/types/rain-station';
import { Reservoir } from '@/types/reservoir';
import { useToast } from '@/components/ui/use-toast';

// Define station type
export type StationType = 'monitoring' | 'rain' | 'reservoir';

// Define props interface
interface StationCardEditInfoProps {
  stationType: StationType;
}

// Common content box styles
const contentBoxStyle = "w-full border border-[#E2E8F0] rounded-md p-4 bg-white text-[#17254D] text-sm font-normal";
const contentTextStyle = "px-4"; // Reduced horizontal padding for more compact layout
const labelStyle = "text-[#64748B] font-medium text-base bg-white px-2 z-10";
const labelContainerStyle = "flex justify-between items-center absolute -top-4 left-3 z-10";

/**
 * StationCardEditInfo component for editing station data
 * Uses the useStationManagement hook for state management
 */
export const StationCardEditInfo: React.FC<StationCardEditInfoProps> = ({ 
  stationType
}) => {
  const { toast } = useToast();
  
  // Get station management functions and state from hook
  const {
    // Station data
    monitoringStations,
    rainStations,
    reservoirs,
    userSelectedMonitoring,
    userSelectedRain,
    userSelectedReservoirs,
    disabledMonitoring,
    disabledRain,
    disabledReservoirs,
    
    // Derived data
    availableMonitoringStations,
    availableRainStations,
    availableReservoirs,
    allAvailableMonitoringStations,
    allAvailableRainStations,
    allAvailableReservoirs,
    
    // Loading states
    isLoadingMonitoring,
    isLoadingRain,
    isLoadingReservoirs,
    
    // Station management functions
    addMonitoringStation,
    addRainStation,
    addReservoir,
    removeMonitoringStation,
    removeRainStation,
    removeReservoir,
    toggleMonitoringStationDisabled,
    toggleRainStationDisabled,
    toggleReservoirDisabled,
    
    // Edit session state
    hasUnsavedChanges,
    
    // State management functions
    resetChanges
  } = useStationManagement();
  
  // Local state for UI
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Log component mount and props
  console.log("[StationCardEditInfo] Rendering with stationType:", stationType);
  
  // Handle add station button click
  const handleAddStation = useCallback(() => {
    console.log(`[StationCardEditInfo] Opening dialog to add ${stationType} station`);
    setDialogOpen(true);
  }, [stationType]);
  
  // Handle dialog close
  const handleDialogClose = useCallback(() => {
    console.log(`[StationCardEditInfo] Closing ${stationType} station dialog`);
    setDialogOpen(false);
    setCurrentPage(1);
  }, [stationType]);
  
  // Handle stations selected from dialog
  const handleStationsFromDialog = useCallback((stations: any[]) => {
    console.log(`[StationCardEditInfo] Adding ${stations.length} ${stationType} stations from dialog`);
    
    try {
      if (stationType === 'monitoring') {
        (stations as MonitoringStation[]).forEach(station => {
          addMonitoringStation(station as any);
        });
      } else if (stationType === 'rain') {
        (stations as RainStation[]).forEach(station => {
          addRainStation(station as any);
        });
      } else if (stationType === 'reservoir') {
        (stations as Reservoir[]).forEach(reservoir => {
          addReservoir(reservoir as any);
        });
      }
      
      // Close dialog
      handleDialogClose();
      
      // Show success toast
      toast({
        title: 'Success',
        description: `Added ${stations.length} ${stationType} stations successfully`,
      });
    } catch (error) {
      console.error(`[StationCardEditInfo] Error adding ${stationType} stations:`, error);
      
      // Show error toast
      toast({
        title: 'Error',
        description: `Failed to add ${stationType} stations. Please try again.`,
        variant: 'destructive'
      });
    }
  }, [stationType, addMonitoringStation, addRainStation, addReservoir, handleDialogClose, toast]);
  
  // Handle remove station
  const handleRemoveStation = useCallback((id: string) => {
    console.log(`[StationCardEditInfo] Removing ${stationType} station ${id}`);
    
    try {
      if (stationType === 'monitoring') {
        removeMonitoringStation(id);
      } else if (stationType === 'rain') {
        removeRainStation(id);
      } else if (stationType === 'reservoir') {
        removeReservoir(id);
      }
      
      // Show success toast
      toast({
        title: 'Success',
        description: `Removed ${stationType} station successfully`,
      });
    } catch (error) {
      console.error(`[StationCardEditInfo] Error removing ${stationType} station:`, error);
      
      // Show error toast
      toast({
        title: 'Error',
        description: `Failed to remove ${stationType} station. Please try again.`,
        variant: 'destructive'
      });
    }
  }, [stationType, removeMonitoringStation, removeRainStation, removeReservoir, toast]);
  
  // Handle toggle station disabled
  const handleToggleStationDisabled = useCallback((id: string, isDisabled: boolean) => {
    console.log(`[StationCardEditInfo] Toggling ${stationType} station ${id} disabled state to ${!isDisabled}`);
    
    try {
      if (stationType === 'monitoring') {
        toggleMonitoringStationDisabled(id);
      } else if (stationType === 'rain') {
        toggleRainStationDisabled(id);
      } else if (stationType === 'reservoir') {
        toggleReservoirDisabled(id);
      }
    } catch (error) {
      console.error(`[StationCardEditInfo] Error toggling ${stationType} station disabled state:`, error);
      
      // Show error toast
      toast({
        title: 'Error',
        description: `Failed to toggle ${stationType} station visibility. Please try again.`,
        variant: 'destructive'
      });
    }
  }, [stationType, toggleMonitoringStationDisabled, toggleRainStationDisabled, toggleReservoirDisabled, toast]);
  
  // Handle discard changes
  const handleDiscard = useCallback(() => {
    console.log('[StationCardEditInfo] Discarding changes');
    
    try {
      // Reset all changes
      resetChanges();
      
      // Show success toast
      toast({
        title: 'Success',
        description: 'Changes discarded successfully',
      });
    } catch (error) {
      console.error('[StationCardEditInfo] Error discarding changes:', error);
      
      // Show error toast
      toast({
        title: 'Error',
        description: 'Failed to discard changes. Please try again.',
        variant: 'destructive'
      });
    }
  }, [resetChanges, toast]);
  
  // Get stations based on type
  const stations = useMemo(() => {
    if (stationType === 'monitoring') {
      return allAvailableMonitoringStations;
    } else if (stationType === 'rain') {
      return allAvailableRainStations;
    } else if (stationType === 'reservoir') {
      return allAvailableReservoirs;
    }
    return [];
  }, [stationType, allAvailableMonitoringStations, allAvailableRainStations, allAvailableReservoirs]);
  
  // Get loading state based on type
  const isLoading = useMemo(() => {
    if (stationType === 'monitoring') {
      return isLoadingMonitoring;
    } else if (stationType === 'rain') {
      return isLoadingRain;
    } else if (stationType === 'reservoir') {
      return isLoadingReservoirs;
    }
    return false;
  }, [stationType, isLoadingMonitoring, isLoadingRain, isLoadingReservoirs]);
  
  // Get disabled stations based on type
  const disabledStations = useMemo(() => {
    if (stationType === 'monitoring') {
      return disabledMonitoring;
    } else if (stationType === 'rain') {
      return disabledRain;
    } else if (stationType === 'reservoir') {
      return disabledReservoirs;
    }
    return {};
  }, [stationType, disabledMonitoring, disabledRain, disabledReservoirs]);
  
  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }
  
  // Render empty state
  if (stations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-gray-500">ไม่พบข้อมูลสถานี</p>
        <Button onClick={handleAddStation}>
          <Plus className="h-4 w-4 mr-2" />
          เพิ่มสถานี
        </Button>
        
        {/* Station Selection Dialog */}
        <StationSelectionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          stationType={stationType}
          onStationSelect={handleStationsFromDialog}
        />
      </div>
    );
  }
  
  // Render stations based on type
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">
          {stationType === 'monitoring' && 'สถานีตรวจวัดน้ำ'}
          {stationType === 'rain' && 'สถานีวัดน้ำฝน'}
          {stationType === 'reservoir' && 'อ่างเก็บน้ำ'}
        </h2>
        <Button onClick={handleAddStation}>
          <Plus className="h-4 w-4 mr-2" />
          เพิ่มสถานี
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stationType === 'monitoring' && (
          (stations as MonitoringStation[]).map(station => (
            <MonitoringStationCard
              key={station.id}
              station={station}
              onRemove={() => handleRemoveStation(station.id)}
              onToggleVisibility={() => handleToggleStationDisabled(station.id, !!disabledStations[station.id])}
              isDisabled={!!disabledStations[station.id]}
              hideUnitLabels={false}
            />
          ))
        )}
        
        {stationType === 'rain' && (
          (stations as RainStation[]).map(station => (
            <RainStationCard
              key={station.id}
              station={station}
              onRemove={() => handleRemoveStation(station.id)}
              onToggleVisibility={() => handleToggleStationDisabled(station.id, !!disabledStations[station.id])}
              isDisabled={!!disabledStations[station.id]}
              hideUnitLabels={true}
            />
          ))
        )}
        
        {stationType === 'reservoir' && (
          (stations as Reservoir[]).map(reservoir => (
            <ReservoirCard
              key={reservoir.id}
              reservoir={reservoir}
              onRemove={() => handleRemoveStation(reservoir.id)}
              onToggleVisibility={() => handleToggleStationDisabled(reservoir.id, !!disabledStations[reservoir.id])}
              isDisabled={!!disabledStations[reservoir.id]}
              hideUnitLabels={true}
            />
          ))
        )}
      </div>
      
      {/* Station Selection Dialog */}
      <StationSelectionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        stationType={stationType}
        onStationSelect={handleStationsFromDialog}
      />
    </div>
  );
}; 