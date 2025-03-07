import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Plus, Save } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { MonitoringStationCard } from "@/components/monitoring/MonitoringStationCard";
import { RainStationCard } from "@/components/monitoring/RainStationCard";
import { ReservoirCard } from "@/components/monitoring/ReservoirCard";
import { StationSelectionDialog } from "@/components/complaint/StationSelectionDialog";
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";
import { StationType } from "@/components/complaint/StationSelectionDialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
// Import Jotai hooks and atoms instead of Zustand
import { useStationData } from "@/atoms/hooks";
import { useAtom, useAtomValue } from "jotai";
import { 
  currentAmphureAtom, 
  currentProvinceAtom,
  MonitoringStation as JotaiMonitoringStation,
  RainStation as JotaiRainStation,
  Reservoir as JotaiReservoir
} from "@/atoms/stationData";

// Define callback-only props (no data props)
interface StationCardEditInfoProps {
  onChangesMade?: () => void;
  onSave?: () => void;
  onDiscard?: () => void;
}

export const StationCardEditInfo = ({ 
  onChangesMade,
  onSave,
  onDiscard
}: StationCardEditInfoProps) => {
  const navigate = useNavigate();
  
  // Local state for UI management
  const [currentStationType, setCurrentStationType] = useState<StationType>('monitoring');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Track if this is the initial mount
  const isInitialMount = useRef(true);
  
  // Get location data from Jotai atoms
  const amphure = useAtomValue(currentAmphureAtom);
  const province = useAtomValue(currentProvinceAtom);
  
  // Get station data from Jotai
  const {
    monitoringStations,
    rainStations,
    reservoirs,
    userSelectedMonitoringStations,
    userSelectedRainStations,
    userSelectedReservoirs,
    disabledMonitoringStations,
    disabledRainStations,
    disabledReservoirs,
    isLoadingMonitoringStations,
    isLoadingRainStations,
    isLoadingReservoirs,
    monitoringStationsError,
    rainStationsError,
    reservoirsError,
    addUserSelectedMonitoringStation,
    addUserSelectedRainStation,
    addUserSelectedReservoir,
    removeUserSelectedMonitoringStation,
    removeUserSelectedRainStation,
    removeUserSelectedReservoir,
    disableMonitoringStation,
    disableRainStation,
    disableReservoir,
    enableMonitoringStation,
    enableRainStation,
    enableReservoir
  } = useStationData();
  
  // Reset hasChanges on initial mount
  useEffect(() => {
    if (isInitialMount.current) {
      console.log("[StationCardEditInfo] Initial mount, resetting hasChanges");
      setHasChanges(false);
      
      // Set isInitialMount to false after the initial mount
      isInitialMount.current = false;
    }
  }, []);
  
  // Handle adding a station
  const handleAddStation = (type: StationType) => {
    setCurrentStationType(type);
    setDialogOpen(true);
  };
  
  // Handle station selection from dialog
  const handleStationSelected = (type: StationType, station: any) => {
    console.log(`[StationCardEditInfo] Selected ${type} station:`, station);
    
    // Add station to the appropriate list based on type
    if (type === 'monitoring') {
      // Convert to Jotai type if needed
      const jotaiStation: JotaiMonitoringStation = {
        ...station,
        name: station.station_name || station.name,
        location: { lat: station.latitude || 0, lng: station.longitude || 0 },
        coordinates: { lat: station.latitude || 0, lng: station.longitude || 0 },
        status: 'active',
        type: 'monitoring'
      };
      addUserSelectedMonitoringStation(jotaiStation);
    } else if (type === 'rain') {
      // Convert to Jotai type if needed
      const jotaiStation: JotaiRainStation = {
        ...station,
        name: station.station_name || station.name,
        location: { lat: station.latitude || 0, lng: station.longitude || 0 },
        coordinates: { lat: station.latitude || 0, lng: station.longitude || 0 },
        status: 'active',
        type: 'rain'
      };
      addUserSelectedRainStation(jotaiStation);
    } else if (type === 'reservoir') {
      // Convert to Jotai type if needed
      const jotaiReservoir: JotaiReservoir = {
        ...station,
        name: station.reservoir_name || station.name,
        location: { lat: station.latitude || 0, lng: station.longitude || 0 },
        coordinates: { lat: station.latitude || 0, lng: station.longitude || 0 },
        status: 'active',
        type: 'reservoir',
        capacity: station.capacity || 0,
        currentLevel: station.current_level || 0
      };
      addUserSelectedReservoir(jotaiReservoir);
    }
    
    // Close the dialog
    setDialogOpen(false);
    
    // Mark that changes have been made
    setHasChanges(true);
    
    // Notify parent component of changes
    if (onChangesMade) {
      onChangesMade();
    }
  };
  
  // Handle removing a station
  const handleRemoveStation = (type: StationType, stationId: number) => {
    console.log(`[StationCardEditInfo] Removing ${type} station with ID:`, stationId);
    
    // Convert number to string for Jotai functions
    const stationIdStr = stationId.toString();
    
    // Remove station from the appropriate list based on type
    if (type === 'monitoring') {
      removeUserSelectedMonitoringStation(stationIdStr);
    } else if (type === 'rain') {
      removeUserSelectedRainStation(stationIdStr);
    } else if (type === 'reservoir') {
      removeUserSelectedReservoir(stationIdStr);
    }
    
    // Mark that changes have been made
    setHasChanges(true);
    
    // Notify parent component of changes
    if (onChangesMade) {
      onChangesMade();
    }
  };
  
  // Handle toggling station disabled state
  const handleToggleStationDisabled = (type: StationType, stationId: number, isDisabled: boolean) => {
    console.log(`[StationCardEditInfo] Toggling ${type} station ${stationId} disabled state to:`, isDisabled);
    
    // Convert number to string for Jotai functions
    const stationIdStr = stationId.toString();
    
    // Toggle station disabled state based on type
    if (type === 'monitoring') {
      if (isDisabled) {
        disableMonitoringStation(stationIdStr);
      } else {
        enableMonitoringStation(stationIdStr);
      }
    } else if (type === 'rain') {
      if (isDisabled) {
        disableRainStation(stationIdStr);
      } else {
        enableRainStation(stationIdStr);
      }
    } else if (type === 'reservoir') {
      if (isDisabled) {
        disableReservoir(stationIdStr);
      } else {
        enableReservoir(stationIdStr);
      }
    }
    
    // Mark that changes have been made
    setHasChanges(true);
    
    // Notify parent component of changes
    if (onChangesMade) {
      onChangesMade();
    }
  };
  
  // Handle save action
  const handleSave = () => {
    console.log("[StationCardEditInfo] Saving changes");
    
    // Reset hasChanges
    setHasChanges(false);
    
    // Show success toast
    toast.success("บันทึกข้อมูลสำเร็จ");
    
    // Call onSave callback if provided
    if (onSave) {
      onSave();
    }
  };
  
  // Handle discard action
  const handleDiscard = () => {
    console.log("[StationCardEditInfo] Discarding changes");
    
    // Reset hasChanges
    setHasChanges(false);
    
    // Call onDiscard callback if provided
    if (onDiscard) {
      onDiscard();
    }
  };

  // Return the component UI
  return (
    <ErrorBoundary component="StationCardEditInfo">
      <div className="space-y-10 px-4">
        {/* Main Heading */}
        <h2 className="text-xl font-semibold text-[#17254D] mb-6">ข้อมูลสนับสนุน</h2>
        
        {/* Monitoring Stations Section */}
        <div className="flex flex-col relative mt-10 mx-auto max-w-full w-full">
          <div className="flex justify-between items-center absolute -top-4 left-3 z-10">
            <Label className="text-[#64748B] font-medium text-base bg-white px-2 z-10">
              สถานีเฝ้าระวัง {amphure && `ใน${amphure}`}{!amphure && province && `ใน${province}`}
            </Label>
            <Button 
              className="bg-[#42A5F5] text-white hover:bg-[#1E88E5] h-10 px-4 text-base flex items-center justify-center ml-auto rounded-xl"
              onClick={() => handleAddStation('monitoring')}
            >
              <Plus className="h-5 w-5 mr-2" /> เพิ่มข้อมูล
            </Button>
          </div>
          
          {/* Content will be rendered here based on data */}
          <div className="w-full border border-[#E2E8F0] rounded-xl p-4 bg-white text-[#17254D] text-sm font-normal">
            {isLoadingMonitoringStations ? (
              <div className="space-y-4">
                <Skeleton className="h-[100px] w-full" />
                <Skeleton className="h-[100px] w-full" />
              </div>
            ) : monitoringStationsError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  ไม่สามารถโหลดข้อมูลสถานีเฝ้าระวังได้
                </AlertDescription>
              </Alert>
            ) : monitoringStations.length === 0 && userSelectedMonitoringStations.length === 0 ? (
              <Alert>
                <AlertDescription>
                  ไม่พบสถานีเฝ้าระวังในพื้นที่นี้
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-8">
                {/* Render user-selected stations */}
                {userSelectedMonitoringStations.map((station) => {
                  // Convert Jotai station to MonitoringStation type expected by MonitoringStationCard
                  const cardStation = {
                    id: parseInt(station.id.toString(), 10) || 0,
                    station_id: station.id.toString(),
                    station_name: station.name,
                    code: '',
                    irrigation_office: '',
                    river_basin: '',
                    river_name: '',
                    province: '',
                    amphure: '',
                    water_level: 0,
                    flow_rate: 0,
                    bank_level_meters: '0',
                    capacity_cms: '0',
                    pole_center_msl: '0',
                    telemetry_data: {
                      timestamp: new Date().toISOString(),
                      water_level: 0,
                      flow_rate: 0,
                      notation: ''
                    }
                  };
                  
                  return (
                    <MonitoringStationCard 
                      key={`selected-${station.id}`} 
                      station={cardStation} 
                      showButtons={true}
                      isUserSelected={true}
                      onToggleDisabled={() => handleToggleStationDisabled('monitoring', parseInt(station.id.toString()), !!disabledMonitoringStations[station.id.toString()])}
                      onDeleteData={() => handleRemoveStation('monitoring', parseInt(station.id.toString()))}
                    />
                  );
                })}
                
                {/* Render available stations */}
                {monitoringStations.map((station) => {
                  // Convert Jotai station to MonitoringStation type expected by MonitoringStationCard
                  const cardStation = {
                    id: parseInt(station.id.toString(), 10) || 0,
                    station_id: station.id.toString(),
                    station_name: station.name,
                    code: '',
                    irrigation_office: '',
                    river_basin: '',
                    river_name: '',
                    province: '',
                    amphure: '',
                    water_level: 0,
                    flow_rate: 0,
                    bank_level_meters: '0',
                    capacity_cms: '0',
                    pole_center_msl: '0',
                    telemetry_data: {
                      timestamp: new Date().toISOString(),
                      water_level: 0,
                      flow_rate: 0,
                      notation: ''
                    }
                  };
                  
                  return (
                    <MonitoringStationCard 
                      key={station.id} 
                      station={cardStation} 
                      showButtons={true}
                      disabled={!!disabledMonitoringStations[station.id.toString()]}
                      onToggleDisabled={() => handleToggleStationDisabled('monitoring', parseInt(station.id.toString()), !!disabledMonitoringStations[station.id.toString()])}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
        
        {/* Rain Stations Section - Similar structure */}
        {/* Reservoirs Section - Similar structure */}
        
        {/* Save/Discard Buttons */}
        <div className="flex justify-center mt-6 gap-4">
          <Button 
            onClick={handleDiscard}
            disabled={!hasChanges}
            className="bg-white text-[#42A5F5] hover:bg-gray-50 border border-[#42A5F5] h-12 px-16 text-base font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
          >
            ไม่บันทึก
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!hasChanges}
            className="bg-[#42A5F5] text-white hover:bg-[#1E88E5] h-12 px-16 text-base font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
          >
            <Save className="h-5 w-5 mr-2" />
            บันทึก
          </Button>
        </div>
        
        {/* Station Selection Dialog */}
        <StationSelectionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          stationType={currentStationType}
          currentProvince={province}
          currentAmphure={amphure}
          onStationSelect={(stations) => {
            if (stations.length > 0) {
              handleStationSelected(currentStationType, stations[0]);
            }
          }}
          currentStations={[
            ...monitoringStations,
            ...rainStations,
            ...reservoirs,
            ...userSelectedMonitoringStations,
            ...userSelectedRainStations,
            ...userSelectedReservoirs
          ]}
        />
      </div>
    </ErrorBoundary>
  );
}; 