import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Loader2 } from "lucide-react";
import { useMonitoringStations } from "@/hooks/useMonitoringStations";
import { useRainStations } from "@/hooks/useRainStations";
import { useReservoirs } from "@/hooks/useReservoirs";
import { MonitoringStation } from "@/types/monitoring-station";
import { RainStation } from "@/types/rain-station";
import { Reservoir } from "@/types/reservoir";
import { getAdjacentAmphures } from "@/utils/adjacent-amphures";

export type StationType = 'monitoring' | 'rain' | 'reservoir';

interface StationSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stationType: StationType;
  currentProvince?: string;
  currentAmphure?: string;
  onStationSelect: (stations: any[]) => void;
}

export const StationSelectionDialog = ({
  open,
  onOpenChange,
  stationType,
  currentProvince,
  currentAmphure,
  onStationSelect
}: StationSelectionDialogProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStations, setSelectedStations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>("current");
  const [adjacentLocations, setAdjacentLocations] = useState<Array<{ province: string; amphure: string }>>([]);
  
  // Fetch stations for current location
  const { 
    data: monitoringData, 
    isLoading: isLoadingMonitoring 
  } = useMonitoringStations(
    activeTab === "current" ? currentAmphure : undefined,
    activeTab === "current" ? currentProvince : undefined
  );
  
  const { 
    data: rainData, 
    isLoading: isLoadingRain 
  } = useRainStations(
    activeTab === "current" ? currentAmphure : undefined,
    activeTab === "current" ? currentProvince : undefined
  );
  
  const { 
    data: reservoirData, 
    isLoading: isLoadingReservoir 
  } = useReservoirs(
    activeTab === "current" ? currentAmphure : undefined,
    activeTab === "current" ? currentProvince : undefined
  );

  // Fetch stations for adjacent locations
  const [adjacentStations, setAdjacentStations] = useState<any[]>([]);
  const [isLoadingAdjacent, setIsLoadingAdjacent] = useState(false);

  // Get adjacent amphures when component mounts
  useEffect(() => {
    if (currentProvince && currentAmphure) {
      const adjacent = getAdjacentAmphures(currentProvince, currentAmphure);
      setAdjacentLocations(adjacent);
    }
  }, [currentProvince, currentAmphure]);

  // Fetch stations from adjacent amphures when tab changes
  useEffect(() => {
    if (activeTab === "adjacent" && adjacentLocations.length > 0) {
      setIsLoadingAdjacent(true);
      
      const fetchAdjacentStations = async () => {
        try {
          const stations: any[] = [];
          
          // Fetch stations for each adjacent location
          for (const location of adjacentLocations) {
            if (stationType === 'monitoring') {
              const response = await fetch(
                `/api/monitoring-stations?province=${encodeURIComponent(location.province)}&amphure=${encodeURIComponent(location.amphure)}`
              );
              if (response.ok) {
                const data = await response.json();
                stations.push(...data.stations);
              }
            } else if (stationType === 'rain') {
              const response = await fetch(
                `/api/rain-stations?province=${encodeURIComponent(location.province)}&amphure=${encodeURIComponent(location.amphure)}`
              );
              if (response.ok) {
                const data = await response.json();
                stations.push(...data.stations);
              }
            } else if (stationType === 'reservoir') {
              const response = await fetch(
                `/api/reservoirs?province=${encodeURIComponent(location.province)}&amphure=${encodeURIComponent(location.amphure)}`
              );
              if (response.ok) {
                const data = await response.json();
                stations.push(...data.reservoirs);
              }
            }
          }
          
          // Remove duplicates based on id
          const uniqueStations = stations.filter((station, index, self) =>
            index === self.findIndex((s) => s.id === station.id)
          );
          
          setAdjacentStations(uniqueStations);
        } catch (error) {
          console.error("Error fetching adjacent stations:", error);
        } finally {
          setIsLoadingAdjacent(false);
        }
      };
      
      fetchAdjacentStations();
    }
  }, [activeTab, adjacentLocations, stationType]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedStations([]);
      setSearchTerm("");
      setActiveTab("current");
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

  // Filter stations based on search term
  const filterStations = (stations: any[]) => {
    if (!searchTerm) return stations;
    
    return stations.filter(station => {
      const stationName = stationType === 'reservoir' 
        ? station.reservoir_name 
        : station.station_name;
      
      return stationName.toLowerCase().includes(searchTerm.toLowerCase());
    });
  };

  // Get stations based on active tab and station type
  const getStations = () => {
    if (activeTab === "adjacent") {
      return filterStations(adjacentStations);
    }
    
    switch (stationType) {
      case 'monitoring':
        return filterStations(monitoringData?.stations || []);
      case 'rain':
        return filterStations(rainData?.stations || []);
      case 'reservoir':
        return filterStations(reservoirData?.reservoirs || []);
      default:
        return [];
    }
  };

  // Check if loading based on active tab and station type
  const isLoading = () => {
    if (activeTab === "adjacent") {
      return isLoadingAdjacent;
    }
    
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
        return "เลือกสถานีเฝ้าระวัง";
      case 'rain':
        return "เลือกสถานีน้ำฝน";
      case 'reservoir':
        return "เลือกเขื่อน/อ่างเก็บน้ำ";
      default:
        return "เลือกสถานี";
    }
  };

  // Handle confirm button click
  const handleConfirm = () => {
    onStationSelect(selectedStations);
    onOpenChange(false);
  };

  const stations = getStations();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
        </DialogHeader>
        
        <div className="flex items-center space-x-2 mb-4">
          <Search className="w-4 h-4 text-gray-500" />
          <Input
            placeholder="ค้นหาสถานี..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="current">
              {currentAmphure ? `${currentAmphure}` : currentProvince ? `${currentProvince}` : "พื้นที่ปัจจุบัน"}
            </TabsTrigger>
            <TabsTrigger value="adjacent" disabled={adjacentLocations.length === 0}>
              พื้นที่ใกล้เคียง ({adjacentLocations.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="current" className="mt-4">
            {isLoading() ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : stations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                ไม่พบสถานีในพื้นที่นี้
              </div>
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {stations.map((station) => (
                    <div
                      key={station.id}
                      className="flex items-center space-x-2 p-2 rounded hover:bg-gray-100"
                    >
                      <Checkbox
                        id={`station-${station.id}`}
                        checked={selectedStations.some(s => s.id === station.id)}
                        onCheckedChange={() => handleStationToggle(station)}
                      />
                      <Label
                        htmlFor={`station-${station.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        {stationType === 'reservoir' ? station.reservoir_name : station.station_name}
                        <div className="text-xs text-gray-500">
                          {station.amphure}, {station.province}
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
          
          <TabsContent value="adjacent" className="mt-4">
            {isLoading() ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : stations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                ไม่พบสถานีในพื้นที่ใกล้เคียง
              </div>
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {stations.map((station) => (
                    <div
                      key={station.id}
                      className="flex items-center space-x-2 p-2 rounded hover:bg-gray-100"
                    >
                      <Checkbox
                        id={`station-${station.id}`}
                        checked={selectedStations.some(s => s.id === station.id)}
                        onCheckedChange={() => handleStationToggle(station)}
                      />
                      <Label
                        htmlFor={`station-${station.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        {stationType === 'reservoir' ? station.reservoir_name : station.station_name}
                        <div className="text-xs text-gray-500">
                          {station.amphure}, {station.province}
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-4">
          <div className="flex justify-between w-full">
            <div className="text-sm text-gray-500">
              เลือก {selectedStations.length} สถานี
            </div>
            <div className="space-x-2">
              <DialogClose asChild>
                <Button variant="outline">ยกเลิก</Button>
              </DialogClose>
              <Button 
                onClick={handleConfirm}
                disabled={selectedStations.length === 0}
              >
                เพิ่มสถานี
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 