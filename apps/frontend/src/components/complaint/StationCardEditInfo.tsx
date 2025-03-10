import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Plus, Save, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { MonitoringStationCard } from "@/components/monitoring/MonitoringStationCard";
import { RainStationCard } from "@/components/monitoring/RainStationCard";
import { ReservoirCard } from "@/components/monitoring/ReservoirCard";
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
// Import Jotai hooks and atoms instead of Zustand
import { useStationData } from "@/atoms/hooks";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { 
  currentAmphureAtom,
  currentProvinceAtom,
  syncMonitoringStationsAtom,
  syncRainStationsAtom,
  syncReservoirsAtom
} from "@/atoms/stationData";
import { MonitoringStation } from "@/types/monitoring-station";
import { RainStation } from "@/types/rain-station";
import { Reservoir } from "@/types/reservoir";

// Utility functions for data consistency
// Helper function to normalize station IDs to strings
const normalizeStationId = (id: string | number): string => {
  return String(id);
};

// Debug utility to track station data operations
const debugStationData = (operation: string, type: StationType, id: string | number, data?: any) => {
  console.group(`[StationCardEditInfo] ${operation} ${type} station ${id}`);
  console.log('Operation details:', { type, id, data });
  console.groupEnd();
};

// Validate station data format before using
const validateStationData = (station: any, type: StationType): boolean => {
  if (!station || typeof station !== 'object') return false;
  
  const hasId = station.id !== undefined && station.id !== null;
  
  switch (type) {
    case 'monitoring':
      return hasId && (station.station_name !== undefined || station.name !== undefined);
    case 'rain':
      return hasId && (station.station_name !== undefined || station.name !== undefined);
    case 'reservoir':
      return hasId && (station.reservoir_name !== undefined || station.name !== undefined);
    default:
      return false;
  }
};

// Define station type
export type StationType = 'monitoring' | 'rain' | 'reservoir';

// Define props interface
interface StationCardEditInfoProps {
  onChangesMade?: () => void;
  onSave?: () => void;
  onDiscard?: () => void;
}

// Remove incorrect interfaces and use the actual component prop types
// The actual MonitoringStationCard expects:
// - station: MonitoringStation
// - showButtons?: boolean (not showControls)
// - disabled?: boolean (not isDisabled)
// - isUserSelected?: boolean
// - onDeleteData?: () => void (not onRemove)
// - onToggleDisabled?: () => void (without parameters)

// The actual RainStationCard has similar props
// The actual ReservoirCard uses 'reservoir' instead of 'station'

// Common content box styles
const contentBoxStyle = "w-full border border-[#E2E8F0] rounded-md p-4 bg-white text-[#17254D] text-sm font-normal";
const contentTextStyle = "px-4"; // Reduced horizontal padding for more compact layout
const labelStyle = "text-[#64748B] font-medium text-base bg-white px-2 z-10";
const labelContainerStyle = "flex justify-between items-center absolute -top-4 left-3 z-10";

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
  
  // State for station selection
  const [selectedStations, setSelectedStations] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const stationsPerPage = 5;
  
  // Track if this is the initial mount
  const isInitialMount = useRef(true);
  
  // Get location data from Jotai atoms
  const amphure = useAtomValue(currentAmphureAtom);
  const province = useAtomValue(currentProvinceAtom);
  
  // Get synchronization functions
  const syncMonitoringStations = useSetAtom(syncMonitoringStationsAtom);
  const syncRainStations = useSetAtom(syncRainStationsAtom);
  const syncReservoirs = useSetAtom(syncReservoirsAtom);
  
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
  
  // Initialize component on mount
  useEffect(() => {
    if (isInitialMount.current) {
      console.log("[StationCardEditInfo] Initial mount, initializing component");
      
      // Log current Jotai state
      console.log("[StationCardEditInfo] Current Jotai state:", {
        amphure,
        province,
        monitoringStationsCount: monitoringStations.length,
        rainStationsCount: rainStations.length,
        reservoirsCount: reservoirs.length,
        userSelectedMonitoringStationsCount: userSelectedMonitoringStations.length,
        userSelectedRainStationsCount: userSelectedRainStations.length,
        userSelectedReservoirsCount: userSelectedReservoirs.length
      });
      
      // Ensure we have location data for queries
      if (!amphure && !province) {
        console.warn("[StationCardEditInfo] Missing location data, station queries may not work correctly");
        
        // Try to get location data from the parent component
        if (onChangesMade) {
          // Signal to the parent that we need location data
          onChangesMade();
        }
        
        toast.error("ข้อมูลไม่ครบถ้วน", {
          description: "ไม่พบข้อมูลตำแหน่งที่ตั้ง อาจทำให้การค้นหาสถานีไม่ถูกต้อง"
        });
      } else {
        console.log("[StationCardEditInfo] Using location data from Jotai for queries:", { amphure, province });
        
        // Force refresh of station data if needed
        if (monitoringStations.length === 0 && rainStations.length === 0 && reservoirs.length === 0) {
          console.log("[StationCardEditInfo] No station data available, triggering queries");
          
          // The queries should be triggered automatically by the Jotai atoms
          // when amphure and province are set
        }
      }
      
      // Reset hasChanges
      setHasChanges(false);
      
      // Set isInitialMount to false after the initial mount
      isInitialMount.current = false;
    }
  }, [
    amphure, 
    province, 
    monitoringStations.length, 
    rainStations.length, 
    reservoirs.length,
    userSelectedMonitoringStations.length,
    userSelectedRainStations.length,
    userSelectedReservoirs.length,
    onChangesMade
  ]);
  
  // Add a debug effect to log when location data changes
  useEffect(() => {
    console.log("[StationCardEditInfo] Location data changed:", {
      amphure,
      province,
      timestamp: new Date().toISOString()
    });
    
    // If we have location data, trigger the synchronization
    if (amphure || province) {
      console.log("[StationCardEditInfo] Location data available, triggering synchronization");
      
      // Explicitly trigger the synchronization atoms to update the stored atoms
      syncMonitoringStations();
      syncRainStations();
      syncReservoirs();
    }
  }, [amphure, province, syncMonitoringStations, syncRainStations, syncReservoirs]);
  
  // Track changes to selected stations
  useEffect(() => {
    if (!isInitialMount.current) {
      console.log("[StationCardEditInfo] Selected stations changed");
      setHasChanges(true);
      if (onChangesMade) {
        onChangesMade();
      }
    }
  }, [
    userSelectedMonitoringStations,
    userSelectedRainStations,
    userSelectedReservoirs,
    onChangesMade
  ]);
  
  // Handle adding a station
  const handleAddStation = (type: StationType) => {
    setCurrentStationType(type);
    setSelectedStations([]);
    setCurrentPage(0);
    setDialogOpen(true);
  };
  
  // Get available stations for the current type, filtering out stations in the same amphure
  const getAvailableStations = () => {
    let availableStations: any[] = [];
    let selectedStationIds: string[] = [];
    
    switch (currentStationType) {
      case 'monitoring':
        availableStations = monitoringStations.filter(station => {
          // Only include stations in the same province but not in the same amphure
          // Type assertion to access province and amphure properties
          const stationAny = station as any;
          return stationAny.province === province && stationAny.amphure !== amphure;
        });
        selectedStationIds = userSelectedMonitoringStations.map(s => String(s.id));
        break;
      case 'rain':
        availableStations = rainStations.filter(station => {
          // Type assertion to access province and amphure properties
          const stationAny = station as any;
          return stationAny.province === province && stationAny.amphure !== amphure;
        });
        selectedStationIds = userSelectedRainStations.map(s => String(s.id));
        break;
      case 'reservoir':
        availableStations = reservoirs.filter(reservoir => {
          // Type assertion to access province and amphure properties
          const reservoirAny = reservoir as any;
          return reservoirAny.province === province && reservoirAny.amphure !== amphure;
        });
        selectedStationIds = userSelectedReservoirs.map(s => String(s.id));
        break;
    }
    
    // Filter out already selected stations
    return availableStations.filter(station => 
      !selectedStationIds.includes(String(station.id))
    );
  };
  
  // Get paginated stations
  const getPaginatedStations = () => {
    const availableStations = getAvailableStations();
    const startIndex = currentPage * stationsPerPage;
    return availableStations.slice(startIndex, startIndex + stationsPerPage);
  };
  
  // Get total pages
  const getTotalPages = () => {
    const availableStations = getAvailableStations();
    return Math.ceil(availableStations.length / stationsPerPage);
  };
  
  // Handle station selection in dialog
  const handleStationToggle = (station: any) => {
    setSelectedStations(prev => {
      const stationId = String(station.id);
      const isSelected = prev.some(s => String(s.id) === stationId);
      
      if (isSelected) {
        return prev.filter(s => String(s.id) !== stationId);
      } else {
        return [...prev, station];
      }
    });
  };
  
  // Handle confirming station selection
  const handleConfirmSelection = () => {
    console.log(`[StationCardEditInfo] Confirming selection of ${selectedStations.length} ${currentStationType} stations`);
    
    if (selectedStations.length === 0) {
      toast.info("ไม่ได้เลือกสถานี", {
        description: "กรุณาเลือกสถานีอย่างน้อย 1 สถานี"
      });
      return;
    }
    
    // Process stations in batch for better performance
    const validStations = selectedStations.filter(station => 
      validateStationData(station, currentStationType)
    );
    
    if (validStations.length === 0) {
      toast.error("ข้อมูลสถานีไม่ถูกต้อง", {
        description: "ไม่สามารถเพิ่มสถานีได้เนื่องจากข้อมูลไม่ถูกต้อง"
      });
      return;
    }
    
    // Add stations based on type
    switch (currentStationType) {
      case 'monitoring':
        // Get existing IDs to avoid duplicates
        const existingMonitoringIds = userSelectedMonitoringStations.map(s => normalizeStationId(s.id));
        
        // Filter out stations that are already selected
        const newMonitoringStations = validStations.filter(station => 
          !existingMonitoringIds.includes(normalizeStationId(station.id))
        );
        
        // Add each station
        newMonitoringStations.forEach(station => {
          addUserSelectedMonitoringStation(station);
          debugStationData('Add User Selected', 'monitoring', station.id, station);
        });
        
        if (newMonitoringStations.length > 0) {
          toast.success(`เพิ่มสถานีเฝ้าระวัง ${newMonitoringStations.length} สถานี`, {
            description: "เพิ่มสถานีเฝ้าระวังเรียบร้อยแล้ว",
            duration: 3000,
          });
        } else {
          toast.info("ไม่มีสถานีใหม่ถูกเพิ่ม", {
            description: "สถานีที่เลือกถูกเพิ่มไว้แล้ว",
            duration: 3000,
          });
        }
        break;
        
      case 'rain':
        // Similar implementation for rain stations
        const existingRainIds = userSelectedRainStations.map(s => normalizeStationId(s.id));
        const newRainStations = validStations.filter(station => 
          !existingRainIds.includes(normalizeStationId(station.id))
        );
        
        newRainStations.forEach(station => {
          addUserSelectedRainStation(station);
          debugStationData('Add User Selected', 'rain', station.id, station);
        });
        
        if (newRainStations.length > 0) {
          toast.success(`เพิ่มสถานีน้ำฝน ${newRainStations.length} สถานี`, {
            description: "เพิ่มสถานีน้ำฝนเรียบร้อยแล้ว",
            duration: 3000,
          });
        } else {
          toast.info("ไม่มีสถานีใหม่ถูกเพิ่ม", {
            description: "สถานีที่เลือกถูกเพิ่มไว้แล้ว",
            duration: 3000,
          });
        }
        break;
        
      case 'reservoir':
        // Similar implementation for reservoirs
        const existingReservoirIds = userSelectedReservoirs.map(s => normalizeStationId(s.id));
        const newReservoirs = validStations.filter(station => 
          !existingReservoirIds.includes(normalizeStationId(station.id))
        );
        
        newReservoirs.forEach(station => {
          addUserSelectedReservoir(station);
          debugStationData('Add User Selected', 'reservoir', station.id, station);
        });
        
        if (newReservoirs.length > 0) {
          toast.success(`เพิ่มเขื่อน/อ่างเก็บน้ำ ${newReservoirs.length} แห่ง`, {
            description: "เพิ่มเขื่อน/อ่างเก็บน้ำเรียบร้อยแล้ว",
            duration: 3000,
          });
        } else {
          toast.info("ไม่มีเขื่อน/อ่างเก็บน้ำใหม่ถูกเพิ่ม", {
            description: "เขื่อน/อ่างเก็บน้ำที่เลือกถูกเพิ่มไว้แล้ว",
            duration: 3000,
          });
        }
        break;
    }
    
    // Mark that changes have been made
    if (validStations.length > 0) {
      setHasChanges(true);
      if (onChangesMade) {
        onChangesMade();
      }
    }
    
    // Close dialog and reset selection
    setDialogOpen(false);
    setSelectedStations([]);
  };
  
  // Handle removing a station
  const handleRemoveStation = (type: StationType, stationId: any) => {
    // Normalize the station ID to ensure consistent handling
    const normalizedId = normalizeStationId(stationId);
    
    debugStationData('Remove Station', type, normalizedId);
    
    console.log(`[StationCardEditInfo] Removing ${type} station ${normalizedId}`);
    
    // Use the appropriate remove function based on the station type
    switch (type) {
      case 'monitoring':
        removeUserSelectedMonitoringStation(normalizedId);
        break;
      case 'rain':
        removeUserSelectedRainStation(normalizedId);
        break;
      case 'reservoir':
        removeUserSelectedReservoir(normalizedId);
        break;
    }
    
    // Mark that changes have been made
    setHasChanges(true);
    
    // Notify parent component of changes
    if (onChangesMade) {
      onChangesMade();
    }
    
    // Show success toast
    let stationTypeText = '';
    switch (type) {
      case 'monitoring':
        stationTypeText = 'สถานีเฝ้าระวัง';
        break;
      case 'rain':
        stationTypeText = 'สถานีน้ำฝน';
        break;
      case 'reservoir':
        stationTypeText = 'เขื่อน/อ่างเก็บน้ำ';
        break;
    }
    
    toast.success(`ลบ${stationTypeText}`, {
      description: `ลบ${stationTypeText}เรียบร้อยแล้ว`,
      duration: 3000,
    });
  };
  
  // Handle toggling station disabled state
  const handleToggleStationDisabled = (type: StationType, stationId: any, isDisabled: boolean) => {
    // Normalize the station ID to ensure consistent handling
    const normalizedId = normalizeStationId(stationId);
    
    debugStationData('Toggle Disabled', type, normalizedId, { isDisabled });
    
    console.log(`[StationCardEditInfo] Toggle disabled: ${type} station ${normalizedId}, currently disabled: ${isDisabled}`);
    
    // Use the appropriate enable/disable functions based on the current state
    switch (type) {
      case 'monitoring':
        if (isDisabled) {
          enableMonitoringStation(normalizedId);
        } else {
          disableMonitoringStation(normalizedId);
        }
        break;
      case 'rain':
        if (isDisabled) {
          enableRainStation(normalizedId);
        } else {
          disableRainStation(normalizedId);
        }
        break;
      case 'reservoir':
        if (isDisabled) {
          enableReservoir(normalizedId);
        } else {
          disableReservoir(normalizedId);
        }
        break;
    }
    
    // Mark that changes have been made
    setHasChanges(true);
    
    // Notify parent component of changes
    if (onChangesMade) {
      onChangesMade();
    }
  };
  
  // Handle save button click
  const handleSave = () => {
    console.log("[StationCardEditInfo] Saving changes");
    
    // Log current state
    console.log("[StationCardEditInfo] Current state:", {
      userSelectedMonitoringStations,
      userSelectedRainStations,
      userSelectedReservoirs,
      disabledMonitoringStations,
      disabledRainStations,
      disabledReservoirs
    });
    
    // Reset hasChanges
    setHasChanges(false);
    
    // Call parent onSave if provided
    if (onSave) {
      onSave();
    }
  };
  
  // Handle discard button click
  const handleDiscard = () => {
    console.log("[StationCardEditInfo] Discarding changes");
    
    // Reset hasChanges
    setHasChanges(false);
    
    // Call parent onDiscard if provided
    if (onDiscard) {
      onDiscard();
    }
  };
  
  // Handle pagination
  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };
  
  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(getTotalPages() - 1, prev + 1));
  };
  
  // Get dialog title based on station type
  const getDialogTitle = () => {
    switch (currentStationType) {
      case 'monitoring':
        return 'เลือกสถานีตรวจวัด';
      case 'rain':
        return 'เลือกสถานีวัดน้ำฝน';
      case 'reservoir':
        return 'เลือกอ่างเก็บน้ำ';
      default:
        return 'เลือกสถานี';
    }
  };
  
  // Get station name based on station type
  const getStationName = (station: any) => {
    if (currentStationType === 'monitoring') {
      return station.station_name || station.name || 'ไม่ระบุชื่อ';
    } else if (currentStationType === 'rain') {
      return station.station_name || station.name || 'ไม่ระบุชื่อ';
    } else if (currentStationType === 'reservoir') {
      return station.reservoir_name || station.name || 'ไม่ระบุชื่อ';
    }
    return 'ไม่ระบุชื่อ';
  };
  
  // Memoize expensive computations for better performance
  const availableMonitoringStations = useMemo(() => {
    return monitoringStations.filter(station => {
      const stationId = normalizeStationId(station.id);
      return !userSelectedMonitoringStations.some(s => normalizeStationId(s.id) === stationId);
    });
  }, [monitoringStations, userSelectedMonitoringStations]);

  const availableRainStations = useMemo(() => {
    return rainStations.filter(station => {
      const stationId = normalizeStationId(station.id);
      return !userSelectedRainStations.some(s => normalizeStationId(s.id) === stationId);
    });
  }, [rainStations, userSelectedRainStations]);

  const availableReservoirs = useMemo(() => {
    return reservoirs.filter(reservoir => {
      const reservoirId = normalizeStationId(reservoir.id);
      return !userSelectedReservoirs.some(r => normalizeStationId(r.id) === reservoirId);
    });
  }, [reservoirs, userSelectedReservoirs]);

  // Memoize handler creators for better performance
  const createToggleHandler = useCallback((type: StationType, stationId: string | number, isDisabled: boolean) => {
    return () => {
      handleToggleStationDisabled(type, stationId, isDisabled);
    };
  }, [handleToggleStationDisabled]);

  const createDeleteHandler = useCallback((type: StationType, stationId: string | number) => {
    return () => {
      handleRemoveStation(type, stationId);
    };
  }, [handleRemoveStation]);
  
  // Ensure data consistency with WaterLevelInfoCard
  useEffect(() => {
    // This effect runs when station data changes
    // It ensures that the data is properly formatted for WaterLevelInfoCard
    
    console.log("[StationCardEditInfo] Station data updated, ensuring consistency with WaterLevelInfoCard");
    
    // Log current state for debugging
    console.log("[StationCardEditInfo] Current station data state:", {
      monitoringStations: monitoringStations.length,
      rainStations: rainStations.length,
      reservoirs: reservoirs.length,
      userSelectedMonitoring: userSelectedMonitoringStations.length,
      userSelectedRain: userSelectedRainStations.length,
      userSelectedReservoirs: userSelectedReservoirs.length,
      disabledMonitoring: Object.keys(disabledMonitoringStations).length,
      disabledRain: Object.keys(disabledRainStations).length,
      disabledReservoirs: Object.keys(disabledReservoirs).length
    });
    
    // The WaterLevelInfoCard component uses the same Jotai atoms
    // So as long as we update the atoms correctly, the data will be consistent
  }, [
    monitoringStations, 
    rainStations, 
    reservoirs,
    userSelectedMonitoringStations,
    userSelectedRainStations,
    userSelectedReservoirs,
    disabledMonitoringStations,
    disabledRainStations,
    disabledReservoirs
  ]);
  
  // Render loading state - show gray placeholder boxes
  if (isLoadingMonitoringStations || isLoadingRainStations || isLoadingReservoirs) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold mb-4 text-[#17254D]">กำลังโหลดข้อมูลสถานี...</h2>
        <div className="bg-gray-400 h-[120px] w-full rounded-md mb-4"></div>
        <div className="bg-gray-400 h-[120px] w-full rounded-md mb-4"></div>
        <div className="bg-gray-400 h-[120px] w-full rounded-md"></div>
      </div>
    );
  }
  
  // Render error state
  if (monitoringStationsError || rainStationsError || reservoirsError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          เกิดข้อผิดพลาดในการโหลดข้อมูลสถานี กรุณาลองใหม่อีกครั้ง
          {monitoringStationsError && <div>ข้อผิดพลาด: {String(monitoringStationsError)}</div>}
          {rainStationsError && <div>ข้อผิดพลาด: {String(rainStationsError)}</div>}
          {reservoirsError && <div>ข้อผิดพลาด: {String(reservoirsError)}</div>}
        </AlertDescription>
      </Alert>
    );
  }
  
  // Early return if no location data
  if (!amphure && !province) {
    console.info("[StationCardEditInfo] ⚠️ No location data provided", {
      timestamp: new Date().toISOString()
    });
    return (
      <div className="space-y-8 px-4">
        <h2 className="text-xl font-semibold text-[#17254D] mb-6">ข้อมูลสนับสนุน</h2>
        <div className="flex flex-col relative mt-10 mx-auto max-w-full w-full">
          <Alert className="mb-4">
            <AlertDescription>
              ไม่พบข้อมูลพื้นที่สำหรับค้นหาสถานี กรุณากลับไปที่หน้าแบบฟอร์มและระบุตำแหน่งที่ตั้ง
            </AlertDescription>
          </Alert>
          
          <div className="flex justify-center mt-6">
            <Button 
              onClick={handleDiscard}
              className="bg-white text-[#42A5F5] hover:bg-gray-50 border border-[#42A5F5] h-12 px-16 text-base font-medium rounded-md flex items-center justify-center"
            >
              กลับไปที่หน้าแบบฟอร์ม
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <ErrorBoundary fallback={<div>เกิดข้อผิดพลาดในการแสดงข้อมูลสถานี</div>}>
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-[#17254D]">สถานีเฝ้าระวัง</h3>
            <Button 
              onClick={() => handleAddStation('monitoring')}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600"
            >
              <Plus className="h-4 w-4" />
              เพิ่มสถานี
            </Button>
          </div>
          
          {/* Display user-selected monitoring stations */}
          {userSelectedMonitoringStations.length > 0 && (
            <div className={contentBoxStyle}>
              <div className={contentTextStyle}>
                <div className="space-y-8">
                  {userSelectedMonitoringStations.map((station) => {
                    const stationId = normalizeStationId(station.id);
                    const isDisabled = disabledMonitoringStations[stationId];
                    
                    // Create memoized handlers for better performance
                    const toggleHandler = createToggleHandler('monitoring', stationId, isDisabled);
                    
                    const deleteHandler = createDeleteHandler('monitoring', stationId);
                    
                    return (
                      <MonitoringStationCard 
                        key={`selected-${stationId}`} 
                        station={station as any}
                        showButtons={true}
                        isUserSelected={true}
                        disabled={isDisabled}
                        onToggleDisabled={toggleHandler}
                        onDeleteData={deleteHandler}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Display available monitoring stations */}
          {!isLoadingMonitoringStations && !monitoringStationsError && 
           monitoringStations.length > 0 && (
            <div className={contentBoxStyle}>
              <div className={contentTextStyle}>
                <div className="space-y-8">
                  {availableMonitoringStations.map((station) => {
                    const stationId = normalizeStationId(station.id);
                    const isDisabled = disabledMonitoringStations[stationId];
                    
                    // Create handler for toggling disabled state
                    const toggleHandler = createToggleHandler('monitoring', stationId, isDisabled);
                    
                    return (
                      <MonitoringStationCard 
                        key={stationId} 
                        station={station as any}
                        showButtons={true}
                        disabled={isDisabled}
                        onToggleDisabled={toggleHandler}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-[#17254D]">สถานีวัดน้ำฝน</h3>
            <Button 
              onClick={() => handleAddStation('rain')}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600"
            >
              <Plus className="h-4 w-4" />
              เพิ่มสถานี
            </Button>
          </div>
          
          {/* Display user-selected rain stations */}
          {userSelectedRainStations.length > 0 && (
            <div className={contentBoxStyle}>
              <div className={contentTextStyle}>
                <div className="space-y-8">
                  {userSelectedRainStations.map((station) => {
                    const stationId = normalizeStationId(station.id);
                    const isDisabled = disabledRainStations[stationId];
                    
                    // Create memoized handlers for better performance
                    const toggleHandler = createToggleHandler('rain', stationId, isDisabled);
                    
                    const deleteHandler = createDeleteHandler('rain', stationId);
                    
                    return (
                      <RainStationCard 
                        key={`selected-${stationId}`} 
                        station={station as any}
                        showButtons={true}
                        isUserSelected={true}
                        disabled={isDisabled}
                        onToggleDisabled={toggleHandler}
                        onDeleteData={deleteHandler}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Display available rain stations */}
          {!isLoadingRainStations && !rainStationsError && 
           rainStations.length > 0 && (
            <div className={contentBoxStyle}>
              <div className={contentTextStyle}>
                <div className="space-y-8">
                  {availableRainStations.map((station) => {
                    const stationId = normalizeStationId(station.id);
                    const isDisabled = disabledRainStations[stationId];
                    
                    // Create handler for toggling disabled state
                    const toggleHandler = createToggleHandler('rain', stationId, isDisabled);
                    
                    return (
                      <RainStationCard 
                        key={stationId} 
                        station={station as any}
                        showButtons={true}
                        disabled={isDisabled}
                        onToggleDisabled={toggleHandler}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-[#17254D]">สถานีเก็บน้ำ</h3>
            <Button 
              onClick={() => handleAddStation('reservoir')}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600"
            >
              <Plus className="h-4 w-4" />
              เพิ่มสถานี
            </Button>
          </div>
          
          {/* Display user-selected reservoirs */}
          {userSelectedReservoirs.length > 0 && (
            <div className={contentBoxStyle}>
              <div className={contentTextStyle}>
                <div className="space-y-8">
                  {userSelectedReservoirs.map((reservoir) => {
                    const reservoirId = normalizeStationId(reservoir.id);
                    const isDisabled = disabledReservoirs[reservoirId];
                    
                    // Create memoized handlers for better performance
                    const toggleHandler = createToggleHandler('reservoir', reservoirId, isDisabled);
                    
                    const deleteHandler = createDeleteHandler('reservoir', reservoirId);
                    
                    return (
                      <ReservoirCard 
                        key={`selected-${reservoirId}`} 
                        reservoir={reservoir as any}
                        showButtons={true}
                        isUserSelected={true}
                        disabled={isDisabled}
                        onToggleDisabled={toggleHandler}
                        onDeleteData={deleteHandler}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Display available reservoirs */}
          {!isLoadingReservoirs && !reservoirsError && 
           reservoirs.length > 0 && (
            <div className={contentBoxStyle}>
              <div className={contentTextStyle}>
                <div className="space-y-8">
                  {availableReservoirs.map((reservoir) => {
                    const reservoirId = normalizeStationId(reservoir.id);
                    const isDisabled = disabledReservoirs[reservoirId];
                    
                    // Create handler for toggling disabled state
                    const toggleHandler = createToggleHandler('reservoir', reservoirId, isDisabled);
                    
                    return (
                      <ReservoirCard 
                        key={reservoirId} 
                        reservoir={reservoir as any}
                        showButtons={true}
                        disabled={isDisabled}
                        onToggleDisabled={toggleHandler}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};