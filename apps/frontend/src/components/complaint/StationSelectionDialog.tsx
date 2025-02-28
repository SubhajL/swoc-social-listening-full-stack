import { useState, useEffect, useRef } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useMonitoringStations } from "@/hooks/useMonitoringStations";
import { useRainStations } from "@/hooks/useRainStations";
import { useReservoirs } from "@/hooks/useReservoirs";
import { MonitoringStation } from "@/types/monitoring-station";
import { RainStation } from "@/types/rain-station";
import { Reservoir } from "@/types/reservoir";

/**
 * CODE LOCK: 2025-02-28
 * 
 * The StationSelectionDialog component UI and interaction are now working correctly:
 * - Dialog layout and styling are finalized
 * - Station list display with checkboxes is working
 * - Pagination with blue arrows below the station list is functioning
 * - Footer with station count and buttons is properly positioned
 * - Selection functionality works as expected
 * 
 * PENDING: Data querying functionality still needs improvement
 * - Current implementation fetches all stations by province
 * - Filtering logic may need optimization
 * 
 * DO NOT modify the UI layout or styling without approval.
 */

export type StationType = 'monitoring' | 'rain' | 'reservoir';

interface StationSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stationType: StationType;
  currentProvince?: string;
  currentAmphure?: string;
  onStationSelect: (stations: any[]) => void;
  currentStations?: any[]; // Stations already selected in the ComplaintForm
}

export const StationSelectionDialog = ({
  open,
  onOpenChange,
  stationType,
  currentProvince,
  currentAmphure,
  onStationSelect,
  currentStations = [] // Default to empty array if not provided
}: StationSelectionDialogProps) => {
  const [selectedStations, setSelectedStations] = useState<any[]>([]);
  const [startIndex, setStartIndex] = useState(0);
  const stationsContainerRef = useRef<HTMLDivElement>(null);
  
  // Fetch stations for current location
  const { 
    data: monitoringData, 
    isLoading: isLoadingMonitoring 
  } = useMonitoringStations(undefined, currentProvince); // Only filter by province, not amphure
  
  const { 
    data: rainData, 
    isLoading: isLoadingRain 
  } = useRainStations(undefined, currentProvince); // Only filter by province, not amphure
  
  const { 
    data: reservoirData, 
    isLoading: isLoadingReservoir 
  } = useReservoirs(undefined, currentProvince); // Only filter by province, not amphure

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedStations([]);
      setStartIndex(0);
    }
  }, [open]);

  // Handle station selection
  const handleStationToggle = (station: any) => {
    setSelectedStations(prev => {
      const isSelected = prev.some(s => s.id === station.id);
      
      if (isSelected) {
        return prev.filter(s => s.id !== station.id);
      } else {
        return [...prev, station];
      }
    });
  };

  // Get stations based on station type and filter out current stations
  const getStations = () => {
    let stations: any[] = [];
    
    switch (stationType) {
      case 'monitoring':
        stations = monitoringData?.stations || [];
        break;
      case 'rain':
        stations = rainData?.stations || [];
        break;
      case 'reservoir':
        stations = reservoirData?.reservoirs || [];
        break;
      default:
        stations = [];
    }
    
    // Filter out all stations that are already in the StationCardEditInfo
    // This includes both user-selected stations and stations from the current location
    // regardless of whether they are enabled or disabled
    return stations.filter(station => 
      !currentStations.some(currentStation => currentStation.id === station.id)
    );
  };

  // Check if loading based on station type
  const isLoading = () => {
    switch (stationType) {
      case 'monitoring':
        return isLoadingMonitoring;
      case 'rain':
        return isLoadingRain;
      case 'reservoir':
        return isLoadingReservoir;
      default:
        return false;
    }
  };

  // Get dialog title based on station type
  const getDialogTitle = () => {
    switch (stationType) {
      case 'monitoring':
        return "เพิ่มสถานีเฝ้าระวัง";
      case 'rain':
        return "เพิ่มสถานีน้ำฝน";
      case 'reservoir':
        return "เพิ่มเขื่อน/อ่างเก็บน้ำ";
      default:
        return "เพิ่มสถานี";
    }
  };

  // Get station name based on station type
  const getStationName = (station: MonitoringStation | RainStation | Reservoir) => {
    if (stationType === 'reservoir' && 'reservoir_name' in station) {
      return station.reservoir_name;
    } else if ((stationType === 'monitoring' || stationType === 'rain') && 'station_name' in station) {
      return station.station_name;
    }
    return "Unknown Station";
  };

  // Check if station has station_id
  const hasStationId = (station: MonitoringStation | RainStation | Reservoir): boolean => {
    return (stationType === 'monitoring' || stationType === 'rain') && 
           'station_id' in station && 
           station.station_id !== undefined && 
           station.station_id !== null;
  };

  // Get station_id if available
  const getStationId = (station: MonitoringStation | RainStation | Reservoir): string => {
    if (hasStationId(station) && 'station_id' in station && station.station_id) {
      return station.station_id;
    }
    return "";
  };

  // Handle confirm button click
  const handleConfirm = () => {
    onStationSelect(selectedStations);
    onOpenChange(false);
  };

  // Handle navigation
  const handleScrollLeft = () => {
    if (startIndex > 0) {
      setStartIndex(startIndex - 5); // Move by 5 stations at a time
    }
  };

  const handleScrollRight = () => {
    const stations = getStations();
    if (startIndex + 5 < stations.length) {
      setStartIndex(startIndex + 5); // Move by 5 stations at a time
    }
  };

  const stations = getStations();
  const visibleStations = stations.slice(startIndex, startIndex + 5);
  const canScrollLeft = startIndex > 0;
  const canScrollRight = startIndex + 5 < stations.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col bg-white p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-semibold text-[#17254D]">{getDialogTitle()}</DialogTitle>
        </DialogHeader>
        
        <div className="p-6 pt-4">
          <div className="border border-[#E2E8F0] rounded-md bg-white p-0">
            {isLoading() ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-[#42A5F5]" />
              </div>
            ) : stations.length === 0 ? (
              <div className="text-center py-8 text-[#64748B]">
                {currentStations.length > 0 
                  ? "ไม่พบสถานีเพิ่มเติมในจังหวัดนี้" 
                  : "ไม่พบสถานีในจังหวัดนี้"}
              </div>
            ) : (
              <div className="relative">
                <div 
                  ref={stationsContainerRef}
                  className="py-4 px-12"
                >
                  <div className="space-y-2">
                    {visibleStations.map((station) => (
                      <div
                        key={station.id}
                        className="flex items-center space-x-3 p-3 rounded-md border border-[#E2E8F0] bg-white"
                      >
                        <Checkbox
                          id={`station-${station.id}`}
                          checked={selectedStations.some(s => s.id === station.id)}
                          onCheckedChange={() => handleStationToggle(station)}
                          className="border-[#42A5F5] data-[state=checked]:bg-[#42A5F5] data-[state=checked]:text-white h-5 w-5"
                        />
                        <Label
                          htmlFor={`station-${station.id}`}
                          className="flex-1 cursor-pointer font-medium text-[#17254D]"
                        >
                          {getStationName(station)}
                          <div className="text-xs text-[#64748B] mt-1">
                            {station.amphure}, {station.province}
                            {hasStationId(station) && (
                              <span className="ml-2 text-[#94A3B8]">รหัสสถานี: {getStationId(station)}</span>
                            )}
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Pagination buttons below the station list */}
          {stations.length > 0 && !isLoading() && (
            <div className="flex justify-center mt-4 mb-0">
              <div className="flex items-center justify-center space-x-4">
                <button 
                  onClick={handleScrollLeft}
                  className={`w-8 h-8 flex items-center justify-center bg-white border border-[#E2E8F0] rounded-full shadow-sm ${!canScrollLeft ? 'opacity-50 cursor-not-allowed' : ''}`}
                  aria-label="Scroll left"
                  disabled={!canScrollLeft}
                >
                  <div className="w-0 h-0 border-t-[8px] border-t-transparent border-r-[12px] border-r-[#42A5F5] border-b-[8px] border-b-transparent" />
                </button>
                
                <button 
                  onClick={handleScrollRight}
                  className={`w-8 h-8 flex items-center justify-center bg-white border border-[#E2E8F0] rounded-full shadow-sm ${!canScrollRight ? 'opacity-50 cursor-not-allowed' : ''}`}
                  aria-label="Scroll right"
                  disabled={!canScrollRight}
                >
                  <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-[#42A5F5] border-b-[8px] border-b-transparent" />
                </button>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="px-6 py-4 flex justify-between items-center w-full">
          {/* Station count on the left */}
          <div className="text-[#64748B] text-sm">
            เลือก {selectedStations.length} สถานี
          </div>
          
          <div className="flex items-center space-x-3">
            <DialogClose asChild>
              <Button 
                variant="outline" 
                className="border-[#42A5F5] text-[#42A5F5] hover:bg-[#F1F5F9] h-10 px-6"
              >
                ยกเลิก
              </Button>
            </DialogClose>
            <Button 
              onClick={handleConfirm}
              disabled={selectedStations.length === 0}
              className="bg-[#42A5F5] text-white hover:bg-[#1E88E5] h-10 px-6 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              เพิ่มสถานี
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 