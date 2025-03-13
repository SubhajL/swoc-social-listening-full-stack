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
import { useStationEditState } from '@/hooks/useStationEditState';
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

// Define station type
export type StationType = 'monitoring' | 'rain' | 'reservoir';

// Define props interface
interface StationCardEditInfoProps {
  stationType: StationType;
}

// Define interfaces for the card component props
interface ExtendedMonitoringStationProps {
  id: string;
  station_id?: string;
  station_name?: string;
  name?: string;
  water_level?: number;
  flow_rate?: number;
  telemetry_data?: {
    water_level: number;
    flow_rate: number;
    timestamp: string;
    notation?: string;
  };
  source?: 'system' | 'user';
  status: 'active' | 'inactive' | 'maintenance';
  location?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

interface ExtendedRainStationProps {
  id: string;
  name?: string;
  station_name?: string;
  location?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  status: 'active' | 'inactive' | 'maintenance';
  source?: 'system' | 'user';
  rainfall_24h?: number;
  rainfall_today?: number;
  lastReading?: {
    timestamp: string;
    value: number;
    unit: string;
  };
  type: 'rain';
}

interface ExtendedReservoirProps {
  id: string;
  name?: string;
  reservoir_name?: string;
  location?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  status: 'active' | 'inactive' | 'maintenance';
  source?: 'system' | 'user';
  capacity?: number;
  currentLevel?: number;
  percentFull?: number;
  type: 'reservoir';
}

// Adapter functions to convert between different station interfaces
const adaptMonitoringStation = (station: MonitoringStation): ExtendedMonitoringStationProps => {
  return {
    id: ensureStringId(station.id),
    name: station.name,
    location: station.location,
    coordinates: station.coordinates,
    status: station.status,
    source: station.source,
    // Map lastReading to telemetry_data if available
    ...(station.lastReading && {
      telemetry_data: {
        water_level: station.lastReading.value,
        flow_rate: 0, // Default value as it might not be available
        timestamp: station.lastReading.timestamp,
      }
    })
  };
};

const adaptRainStation = (station: RainStation): ExtendedRainStationProps => {
  return {
    id: ensureStringId(station.id),
    name: station.name,
    location: station.location,
    coordinates: station.coordinates,
    status: station.status,
    source: station.source,
    lastReading: station.lastReading,
    type: 'rain'
  };
};

const adaptReservoir = (reservoir: Reservoir): ExtendedReservoirProps => {
  return {
    id: ensureStringId(reservoir.id),
    name: reservoir.name,
    location: reservoir.location,
    coordinates: reservoir.coordinates,
    status: reservoir.status,
    source: reservoir.source,
    capacity: reservoir.capacity,
    currentLevel: reservoir.currentLevel,
    percentFull: reservoir.percentFull,
    type: 'reservoir'
  };
};

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
    resetChanges,
    
    // UI state
    stationSelectionDialogOpen,
    setStationSelectionDialogOpen,
    
    // Combined functions
    openStationSelectionDialog,
    closeStationSelectionDialog,
    handleStationsFromDialog
  } = useStationEditState();
  
  // Log component mount and props
  console.log("[StationCardEditInfo] Rendering with stationType:", stationType);
  
  // Handle add station button click
  const handleAddStation = useCallback(() => {
    console.log(`[StationCardEditInfo] Opening dialog to add ${stationType} station`);
    openStationSelectionDialog(stationType);
  }, [stationType, openStationSelectionDialog]);
  
  // Handle remove station
  const handleRemoveStation = useCallback((id: string | number) => {
    const stringId = ensureStringId(id);
    console.log(`[StationCardEditInfo] Removing ${stationType} station ${stringId}`);
    
    try {
      if (stationType === 'monitoring') {
        removeMonitoringStation(stringId);
      } else if (stationType === 'rain') {
        removeRainStation(stringId);
      } else if (stationType === 'reservoir') {
        removeReservoir(stringId);
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
  const handleToggleStationDisabled = useCallback((id: string | number, isDisabled: boolean) => {
    const stringId = ensureStringId(id);
    console.log(`[StationCardEditInfo] Toggling ${stationType} station ${stringId} disabled state to ${!isDisabled}`);
    
    try {
      if (stationType === 'monitoring') {
        toggleMonitoringStationDisabled(stringId);
      } else if (stationType === 'rain') {
        toggleRainStationDisabled(stringId);
      } else if (stationType === 'reservoir') {
        toggleReservoirDisabled(stringId);
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
          open={stationSelectionDialogOpen}
          onOpenChange={setStationSelectionDialogOpen}
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
          stations.map(station => {
            // Type assertion with runtime check
            if (!isMonitoringStation(station)) {
              console.error('[StationCardEditInfo] Invalid monitoring station:', station);
              return null;
            }
            
            const stringId = ensureStringId(station.id);
            const adaptedStation = adaptMonitoringStation(station);
            
            return (
              <MonitoringStationCard
                key={stringId}
                station={adaptedStation}
                showButtons={true}
                disabled={!!disabledStations[stringId]}
                onToggleDisabled={() => handleToggleStationDisabled(station.id, !!disabledStations[stringId])}
                onDeleteData={() => handleRemoveStation(station.id)}
                hideUnitLabels={false}
              />
            );
          })
        )}
        
        {stationType === 'rain' && (
          stations.map(station => {
            // Type assertion with runtime check
            if (!isRainStation(station)) {
              console.error('[StationCardEditInfo] Invalid rain station:', station);
              return null;
            }
            
            const stringId = ensureStringId(station.id);
            const adaptedStation = adaptRainStation(station);
            
            return (
              <RainStationCard
                key={stringId}
                station={adaptedStation}
                showButtons={true}
                disabled={!!disabledStations[stringId]}
                onToggleDisabled={() => handleToggleStationDisabled(station.id, !!disabledStations[stringId])}
                onDeleteData={() => handleRemoveStation(station.id)}
                hideUnitLabels={true}
              />
            );
          })
        )}
        
        {stationType === 'reservoir' && (
          stations.map(reservoir => {
            // Type assertion with runtime check
            if (!isReservoir(reservoir)) {
              console.error('[StationCardEditInfo] Invalid reservoir:', reservoir);
              return null;
            }
            
            const stringId = ensureStringId(reservoir.id);
            const adaptedReservoir = adaptReservoir(reservoir);
            
            return (
              <ReservoirCard
                key={stringId}
                reservoir={adaptedReservoir}
                showButtons={true}
                disabled={!!disabledStations[stringId]}
                onToggleDisabled={() => handleToggleStationDisabled(reservoir.id, !!disabledStations[stringId])}
                onDeleteData={() => handleRemoveStation(reservoir.id)}
                hideUnitLabels={true}
              />
            );
          })
        )}
      </div>
      
      {/* Station Selection Dialog */}
      <StationSelectionDialog
        open={stationSelectionDialogOpen}
        onOpenChange={setStationSelectionDialogOpen}
        stationType={stationType}
        onStationSelect={handleStationsFromDialog}
      />
    </div>
  );
}; 