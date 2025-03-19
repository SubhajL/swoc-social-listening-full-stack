import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { MonitoringStationCard } from '@/components/monitoring/MonitoringStationCard';
import { RainStationCard } from '@/components/monitoring/RainStationCard';
import { ReservoirCard } from '@/components/monitoring/ReservoirCard';
import { StationSelectionDialog } from '@/components/complaint/StationSelectionDialog';
import { useStationManagement } from '@/hooks/useStationManagement';
import { MonitoringStation as MonitoringStationType } from '@/types/monitoring-station';
import { RainStation as RainStationType } from '@/types/rain-station';
import { Reservoir as ReservoirType } from '@/types/reservoir';
import { MonitoringStation, RainStation, Reservoir } from '@/atoms/stationData';
import { useToast } from '@/components/ui/use-toast';
import { 
  isMonitoringStation, 
  isRainStation, 
  isReservoir,
  ensureStringId
} from '@/utils/stationTypeGuards';
import { trackStationChangesAtom } from '@/atoms/stationData';
import { useSetAtom } from 'jotai';

// Define station type
export type StationType = 'monitoring' | 'rain' | 'reservoir';

// Define props for the component
export interface StationCardEditInfoProps {
  stationType: StationType;
}

// Empty state component
const EmptyState: React.FC<{ onAddStation: () => void }> = ({ onAddStation }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <p className="mb-4 text-muted-foreground">ยังไม่มีสถานีที่เลือก</p>
      <Button onClick={onAddStation} className="flex items-center gap-2">
        <Plus size={16} />
        เพิ่มสถานี
      </Button>
    </div>
  );
};

// Header section component
const HeaderSection: React.FC<{ stationType: StationType; onAddStation: () => void }> = ({ 
  stationType, 
  onAddStation 
}) => {
  // Get display name based on station type
  const displayName = useMemo(() => {
    switch (stationType) {
      case 'monitoring':
        return 'สถานีเฝ้าระวัง';
      case 'rain':
        return 'สถานีวัดน้ำฝน';
      case 'reservoir':
        return 'เขื่อน/อ่างเก็บน้ำ';
      default:
        return 'สถานี';
    }
  }, [stationType]);

  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold">{displayName}</h3>
      <Button onClick={onAddStation} size="sm" className="flex items-center gap-2">
        <Plus size={16} />
        เพิ่ม{displayName}
      </Button>
    </div>
  );
};

export const StationCardEditInfo: React.FC<StationCardEditInfoProps> = ({ stationType }) => {
  // Get station management functions
  const {
    // Station data
    allAvailableMonitoringStations,
    allAvailableRainStations,
    allAvailableReservoirs,
    userSelectedMonitoring,
    userSelectedRain,
    userSelectedReservoirs,
    disabledMonitoring,
    disabledRain,
    disabledReservoirs,
    
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
    
    // Loading states
    isLoadingMonitoring,
    isLoadingRain,
    isLoadingReservoirs,
    
    // Error states
    monitoringError,
    rainError,
    reservoirsError,
    
    // State management
    isEditMode,
    hasUnsavedChanges
  } = useStationManagement();
  
  // Get track changes function
  const trackStationChanges = useSetAtom(trackStationChangesAtom);
  
  // State for station selection dialog
  const [showSelectionDialog, setShowSelectionDialog] = useState(false);
  const { toast } = useToast();
  
  // Track changes when component mounts
  useEffect(() => {
    if (isEditMode) {
      trackStationChanges();
    }
  }, [isEditMode, trackStationChanges]);
  
  // Handle adding a station from the selection dialog
  const handleAddStationFromDialog = useCallback((stations: any[]) => {
    if (!stations || stations.length === 0) return;
    
    // Process each station
    stations.forEach(station => {
      try {
        if (isMonitoringStation(station)) {
          addMonitoringStation(station);
          toast({
            title: "เพิ่มสถานีเฝ้าระวังสำเร็จ",
            description: `เพิ่มสถานี ${station.name || station.id} เรียบร้อยแล้ว`,
          });
        } else if (isRainStation(station)) {
          addRainStation(station);
          toast({
            title: "เพิ่มสถานีวัดน้ำฝนสำเร็จ",
            description: `เพิ่มสถานี ${station.name || station.id} เรียบร้อยแล้ว`,
          });
        } else if (isReservoir(station)) {
          addReservoir(station);
          toast({
            title: "เพิ่มเขื่อน/อ่างเก็บน้ำสำเร็จ",
            description: `เพิ่ม ${station.name || station.id} เรียบร้อยแล้ว`,
          });
        }
      } catch (error) {
        console.error('[StationCardEditInfo] Error adding station:', error);
        toast({
          title: "เกิดข้อผิดพลาดในการเพิ่มสถานี",
          description: "ไม่สามารถเพิ่มสถานีได้ กรุณาลองใหม่อีกครั้ง",
          variant: "destructive",
        });
      }
    });
    
    // Track changes
    trackStationChanges();
  }, [
    addMonitoringStation, 
    addRainStation, 
    addReservoir, 
    toast,
    trackStationChanges
  ]);
  
  // Handle removing a station by ID
  const handleRemoveStationById = useCallback(() => {
    try {
      // This function will be passed to the card components
      // The actual implementation will be handled by the wrapper functions below
      console.log('[StationCardEditInfo] Remove station called');
    } catch (error) {
      console.error('[StationCardEditInfo] Error removing station:', error);
    }
  }, []);
  
  // Handle toggling a station's disabled state by ID
  const handleToggleDisabledById = useCallback(() => {
    try {
      // This function will be passed to the card components
      // The actual implementation will be handled by the wrapper functions below
      console.log('[StationCardEditInfo] Toggle disabled called');
    } catch (error) {
      console.error('[StationCardEditInfo] Error toggling station disabled state:', error);
    }
  }, []);
  
  // Open station selection dialog
  const openSelectionDialog = useCallback(() => {
    setShowSelectionDialog(true);
  }, []);

  // Get stations based on type - memoized to prevent unnecessary recalculations
  const { stations, disabledStationsSet, isLoading, error } = useMemo(() => {
    switch (stationType) {
      case 'monitoring':
        return {
          stations: userSelectedMonitoring,
          disabledStationsSet: disabledMonitoring,
          isLoading: isLoadingMonitoring,
          error: monitoringError
        };
      case 'rain':
        return {
          stations: userSelectedRain,
          disabledStationsSet: disabledRain,
          isLoading: isLoadingRain,
          error: rainError
        };
      case 'reservoir':
        return {
          stations: userSelectedReservoirs,
          disabledStationsSet: disabledReservoirs,
          isLoading: isLoadingReservoirs,
          error: reservoirsError
        };
      default:
        return {
          stations: [],
          disabledStationsSet: new Set<string>(),
          isLoading: false,
          error: null
        };
    }
  }, [
    stationType,
    userSelectedMonitoring,
    userSelectedRain,
    userSelectedReservoirs,
    disabledMonitoring,
    disabledRain,
    disabledReservoirs,
    isLoadingMonitoring,
    isLoadingRain,
    isLoadingReservoirs,
    monitoringError,
    rainError,
    reservoirsError
  ]);

  // Render station cards based on type - memoized to prevent unnecessary recalculations
  const stationCards = useMemo(() => {
    if (isLoading) {
      return (
        <div className="flex justify-center p-4">
          <p>กำลังโหลด...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex justify-center p-4 text-destructive">
          <p>เกิดข้อผิดพลาดในการโหลดข้อมูล: {error.message}</p>
        </div>
      );
    }

    if (stations.length === 0) {
      return (
        <div className="flex justify-center p-4">
          <p className="text-muted-foreground">ไม่มีสถานีที่เลือก</p>
        </div>
      );
    }

    return stations.map((station) => {
      const stationId = ensureStringId(station.id);
      // Check if disabledStationsSet is a Set before calling has method
      const isDisabled = disabledStationsSet && typeof disabledStationsSet.has === 'function' 
        ? disabledStationsSet.has(stationId) 
        : false;
      
      // Create wrapper functions for each station to handle the specific ID
      const handleRemove = () => {
        try {
          if (stationType === 'monitoring') {
            removeMonitoringStation(stationId);
          } else if (stationType === 'rain') {
            removeRainStation(stationId);
          } else if (stationType === 'reservoir') {
            removeReservoir(stationId);
          }
          
          toast({
            title: `ลบ${stationType === 'monitoring' ? 'สถานีเฝ้าระวัง' : stationType === 'rain' ? 'สถานีวัดน้ำฝน' : 'เขื่อน/อ่างเก็บน้ำ'}สำเร็จ`,
            description: `ลบ${stationType === 'reservoir' ? '' : 'สถานี'}เรียบร้อยแล้ว`,
          });
          
          // Track changes
          trackStationChanges();
        } catch (error) {
          console.error('[StationCardEditInfo] Error removing station:', error);
          toast({
            title: "เกิดข้อผิดพลาดในการลบสถานี",
            description: "ไม่สามารถลบสถานีได้ กรุณาลองใหม่อีกครั้ง",
            variant: "destructive",
          });
        }
      };
      
      const handleToggleDisabled = () => {
        try {
          if (stationType === 'monitoring') {
            toggleMonitoringStationDisabled(stationId);
          } else if (stationType === 'rain') {
            toggleRainStationDisabled(stationId);
          } else if (stationType === 'reservoir') {
            toggleReservoirDisabled(stationId);
          }
          
          toast({
            title: `สถานะ${stationType === 'monitoring' ? 'สถานีเฝ้าระวัง' : stationType === 'rain' ? 'สถานีวัดน้ำฝน' : 'เขื่อน/อ่างเก็บน้ำ'}ถูกเปลี่ยนแปลง`,
            description: `สถานะ${stationType === 'reservoir' ? '' : 'ของสถานี'}ถูกเปลี่ยนแปลงเรียบร้อยแล้ว`,
          });
          
          // Track changes
          trackStationChanges();
        } catch (error) {
          console.error('[StationCardEditInfo] Error toggling station disabled state:', error);
          toast({
            title: "เกิดข้อผิดพลาดในการเปลี่ยนแปลงสถานะสถานี",
            description: "ไม่สามารถเปลี่ยนแปลงสถานะสถานีได้ กรุณาลองใหม่อีกครั้ง",
            variant: "destructive",
          });
        }
      };
      
      switch (stationType) {
        case 'monitoring':
          return (
            <MonitoringStationCard
              key={station.id}
              station={station as MonitoringStation}
              showButtons={true}
              disabled={isDisabled}
              onToggleDisabled={handleToggleDisabled}
              onDeleteData={handleRemove}
            />
          );
        case 'rain':
          return (
            <RainStationCard
              key={station.id}
              station={station as RainStation}
              showButtons={true}
              disabled={isDisabled}
              onToggleDisabled={handleToggleDisabled}
              onDeleteData={handleRemove}
            />
          );
        case 'reservoir':
          return (
            <ReservoirCard
              key={station.id}
              reservoir={station as Reservoir}
              showButtons={true}
              disabled={isDisabled}
              onToggleDisabled={handleToggleDisabled}
              onDeleteData={handleRemove}
            />
          );
        default:
          return null;
      }
    });
  }, [
    stationType, 
    stations, 
    disabledStationsSet, 
    isLoading,
    error,
    removeMonitoringStation,
    removeRainStation,
    removeReservoir,
    toggleMonitoringStationDisabled,
    toggleRainStationDisabled,
    toggleReservoirDisabled,
    toast,
    trackStationChanges
  ]);

  // If there are no stations, show empty state
  if (stations.length === 0 && !isLoading && !error) {
    return (
      <>
        <EmptyState onAddStation={openSelectionDialog} />
        
        {/* Station Selection Dialog */}
        <StationSelectionDialog
          open={showSelectionDialog}
          onOpenChange={setShowSelectionDialog}
          stationType={stationType}
          onStationSelect={handleAddStationFromDialog}
        />
      </>
    );
  }

  // Render the component
  return (
    <div className="space-y-4">
      {/* Header with add button */}
      <HeaderSection 
        stationType={stationType} 
        onAddStation={openSelectionDialog} 
      />
      
      {/* Station cards */}
      <div className="space-y-4">
        {stationCards}
      </div>
      
      {/* Station Selection Dialog */}
      <StationSelectionDialog
        open={showSelectionDialog}
        onOpenChange={setShowSelectionDialog}
        stationType={stationType}
        onStationSelect={handleAddStationFromDialog}
      />
    </div>
  );
}; 