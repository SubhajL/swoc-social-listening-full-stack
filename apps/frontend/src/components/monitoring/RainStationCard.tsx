import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { RainStation } from "@/types/rain-station";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useThaiWaterData } from "@/hooks/useThaiWaterData";
import { useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, UserCircle, ClockIcon, RefreshCw } from "lucide-react";
import { ThaiWaterRainfallData } from "@/types/api";
import React from "react";
import { cn } from "@/lib/utils";
import { CardDescription } from "@/components/ui/card";
import { useQueryClient } from "@tanstack/react-query";

// Add the rainfall property to the RainStation interface
interface ExtendedRainStation {
  id: string;
  name?: string;
  name_th?: string | null;
  location?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  status?: 'active' | 'inactive' | 'maintenance';
  lastReading?: {
    timestamp: string;
    value: number;
    unit: string;
  };
  type?: 'rain';
  rainfall?: {
    daily?: number;
    hourly?: number;
    timestamp?: string;
  };
  station_id?: string;
  station_name?: string;
  rainfall_3d?: number;
  rainfall_7d?: number;
  source?: 'system' | 'user';
  // Add new fields for TMD and HII stations
  data_source?: string;
  rainfall10m?: number | null;
  rainfall1h?: number | null;
  rainfall3h?: number | null;
  rainfall24h?: number | null;
  rainfall_today?: number | null;
  rainfall_date_calc?: string | null;
  rainfall_datetime?: string | null;
  // Add location properties
  province?: string;
  amphure?: string;
}

interface RainStationCardProps {
  station: ExtendedRainStation;
  showButtons?: boolean;
  disabled?: boolean;
  isUserSelected?: boolean;
  useCompactLayout?: boolean;
  hideUnitLabels?: boolean;
  onAddData?: () => void;
  onDeleteData?: () => void;
  onToggleDisabled?: () => void;
  className?: string;
  disableAutoRefetch?: boolean;
}

const RainStationCardComponent = ({
  station,
  showButtons = false,
  disabled = false,
  isUserSelected = false,
  useCompactLayout = false,
  hideUnitLabels = false,
  onAddData,
  onDeleteData,
  onToggleDisabled,
  className,
  disableAutoRefetch = false
}: RainStationCardProps) => {
  // Add queryClient to invalidate cache
  const queryClient = useQueryClient();
  
  // Use the station's province and amphoe for the API query if available
  const params = useMemo(() => {
    return {
      province: station.province,
      amphoe: station.amphure || station.location,
      data_source: 'ALL' as 'ALL', // Always use ALL to get all records for the station
      disableAutoRefetch // Pass the disableAutoRefetch parameter to the hook
    };
  }, [station.province, station.amphure, station.location, disableAutoRefetch]);

  const { data: thaiWaterApiData, isLoading, error, refetch } = useThaiWaterData(params);

  // Function to force refresh the data
  const handleRefresh = () => {
    console.log(`[RainStationCard] Forcing refresh for station ${station.station_id}`);
    // Invalidate the cache for this specific query
    queryClient.invalidateQueries({ queryKey: ["thaiwater", "rainfall", params] });
    // Trigger a refetch
    refetch();
  };

  // Common content box styles
  const contentBoxStyle = useMemo(() => `w-full border border-[#E2E8F0] rounded-xl p-2 bg-white text-[#17254D] text-sm font-normal ${disabled ? 'opacity-60' : ''}`, [disabled]);
  const contentTextStyle = "px-1.5"; // Reduced horizontal padding for more space
  const labelStyle = useMemo(() => `text-[#64748B] font-medium text-base absolute -top-3.5 left-3 bg-card px-3 py-0.5 z-10 ${disabled ? 'opacity-60' : ''}`, [disabled]);
  
  // Log station details for debugging
  useEffect(() => {
    console.log('[RainStationCard] Station details:', {
      id: station.id,
      stationId: station.station_id,
      stationName: station.station_name,
      dataSource: station.data_source,
      province: station.province,
      amphure: station.amphure,
      location: station.location,
      rainfall3d: station.rainfall_3d,
      rainfall7d: station.rainfall_7d,
      isUserSelected: isUserSelected,
      hideUnitLabels: hideUnitLabels
    });
  }, [station, isUserSelected, hideUnitLabels]);

  // Get ThaiWater data for this station directly using station_id
  const thaiWaterData = useMemo(() => {
    if (!thaiWaterApiData?.data || !station.station_id) {
      console.log(`[RainStationCard] No ThaiWater data available for station ${station.station_id}`);
      return null;
    }
    
    // Log the full API response for debugging
    console.log(`[RainStationCard] Full API response for station ${station.station_id}:`, thaiWaterApiData);
    console.log(`[RainStationCard] Full API response data for station ${station.station_id}:`, JSON.stringify(thaiWaterApiData.data));
    
    // Convert station_id to number for comparison with API data
    const stationId = Number(station.station_id);
    console.log(`[RainStationCard] Looking for station ID ${stationId} (type: ${typeof stationId})`);
    
    // Log each record's tele_station_id for debugging
    thaiWaterApiData.data.forEach((record: ThaiWaterRainfallData, index: number) => {
      console.log(`[RainStationCard] Record ${index}: tele_station_id=${record.tele_station_id} (type: ${typeof record.tele_station_id}), rainfall_datetime=${record.rainfall_datetime}`);
    });
    
    // Find all matching records for this station
    const matchingRecords = thaiWaterApiData.data.filter(
      (s: ThaiWaterRainfallData) => {
        // Convert both to numbers to ensure consistent comparison
        const recordStationId = typeof s.tele_station_id === 'string' ? Number(s.tele_station_id) : s.tele_station_id;
        const matches = recordStationId === stationId;
        console.log(`[RainStationCard] Comparing ${s.tele_station_id} (${typeof s.tele_station_id}) === ${stationId} (${typeof stationId}): ${matches}`);
        return matches;
      }
    );
    
    console.log(`[RainStationCard] Found ${matchingRecords.length} matching records for station ${station.station_id}:`, matchingRecords);
    console.log(`[RainStationCard] Matching records for station ${station.station_id}:`, JSON.stringify(matchingRecords));
    
    if (matchingRecords.length === 0) {
      console.log(`[RainStationCard] No data found in API response for station ${station.station_id}`);
      console.log(`[RainStationCard] Available station IDs in response:`, 
        thaiWaterApiData.data.map((s: ThaiWaterRainfallData) => s.tele_station_id));
      return null;
    }
    
    // Sort by rainfall_datetime in descending order (latest first)
    const sortedRecords = [...matchingRecords].sort((a, b) => {
      const dateA = new Date(a.rainfall_datetime);
      const dateB = new Date(b.rainfall_datetime);
      return dateB.getTime() - dateA.getTime();
    });
    
    console.log(`[RainStationCard] Sorted records for station ${station.station_id}:`, sortedRecords);
    
    // Use the latest record
    const stationData = sortedRecords[0];
    
    console.log(`[RainStationCard] Using latest data for station ${station.station_id}:`, stationData);
    console.log(`[RainStationCard] Timestamp for station ${station.station_id}:`, stationData.rainfall_datetime);
    
    return stationData;
  }, [thaiWaterApiData, station.station_id]);

  // Determine the data source for display
  const displayDataSource = useMemo(() => {
    // If data_source is explicitly set on the station, use it
    if (station.data_source) {
      return station.data_source;
    }
    
    // If we have ThaiWater data with a data_source, use it
    if (thaiWaterData?.data_source) {
      return thaiWaterData.data_source;
    }
    
    // Otherwise, try to infer from station_id
    if (station.station_id) {
      // HII stations typically have IDs in the range 400-499
      if (/^4\d{2}$/.test(station.station_id)) {
        return 'HII';
      }
      
      // TMD stations typically have IDs starting with 11
      if (/^11\d+$/.test(station.station_id)) {
        return 'TMD';
      }
    }
    
    return 'Unknown';
  }, [station.data_source, station.station_id, thaiWaterData?.data_source]);

  // Helper function to parse numeric values safely
  const parseNumericValue = (value: any): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  // Get rainfall data from station or fallback to defaults
  const rainfallData = useMemo(() => {
    let data = {
      rainfall24h: null as number | null,
      rainfallToday: null as number | null,
      lastUpdated: null as string | null,
      dataAvailable: false
    };

    console.log(`[RainStationCard] Calculating rainfall data for station ${station.station_id || station.id}`);
    console.log(`[RainStationCard] Station rainfall properties:`, {
      rainfall10m: station.rainfall10m,
      rainfall1h: station.rainfall1h,
      rainfall3h: station.rainfall3h,
      rainfall24h: station.rainfall24h,
      rainfall_today: station.rainfall_today,
      rainfall_datetime: station.rainfall_datetime
    });

    // Priority: Use direct station rainfall data from backend API
    if (station.rainfall24h !== undefined || 
        station.rainfall_today !== undefined ||
        station.rainfall10m !== undefined || 
        station.rainfall1h !== undefined ||
        station.rainfall3h !== undefined) {
      
      // Extract data from station object with explicit null checks
      data = {
        // If rainfall24h is available, use it, otherwise use rainfall_today for TMD stations
        rainfall24h: station.rainfall24h !== undefined && station.rainfall24h !== null 
          ? parseNumericValue(station.rainfall24h) 
          : null,
          
        // For today's rainfall, use rainfall_today or fallback to rainfall24h for some stations
        rainfallToday: station.rainfall_today !== undefined && station.rainfall_today !== null 
          ? parseNumericValue(station.rainfall_today) 
          : null,
          
        // For timestamp, use rainfall_datetime or fallback to current time
        lastUpdated: station.rainfall_datetime || new Date().toISOString(),
        
        // Consider data available if any rainfall value is set
        dataAvailable: true
      };
      
      console.log(`[RainStationCard] Using direct station rainfall data for ${station.station_id || station.id}:`, data);
    } 
    // Fallback to ThaiWater API data
    else if (thaiWaterData) {
      data = {
        rainfall24h: thaiWaterData.rainfall24h !== null ? parseFloat(thaiWaterData.rainfall24h?.toString() || '0') : null,
        rainfallToday: thaiWaterData.rainfall_today !== null ? parseFloat(thaiWaterData.rainfall_today?.toString() || '0') : null,
        lastUpdated: thaiWaterData.rainfall_datetime || null,
        dataAvailable: true
      };
      
      console.log(`[RainStationCard] Using ThaiWater API data for station ${station.station_id || station.id}:`, data);
    } else {
      console.log(`[RainStationCard] No rainfall data available for station ${station.station_id || station.id}`);
    }

    // As a last resort, try to get data from the rainfall object
    if (!data.dataAvailable && station.rainfall) {
      console.log(`[RainStationCard] Checking rainfall object for station ${station.station_id || station.id}:`, station.rainfall);
      
      if (station.rainfall.daily !== undefined || station.rainfall.hourly !== undefined) {
        data = {
          rainfall24h: station.rainfall.daily !== undefined ? parseNumericValue(station.rainfall.daily) : null,
          rainfallToday: station.rainfall.daily !== undefined ? parseNumericValue(station.rainfall.daily) : null,
          lastUpdated: station.rainfall.timestamp || null,
          dataAvailable: true
        };
        
        console.log(`[RainStationCard] Using rainfall object data for station ${station.station_id || station.id}:`, data);
      }
    }

    return data;
  }, [station, thaiWaterData]);

  // Format timestamp for display
  const formattedTimestamp = useMemo(() => {
    try {
      console.log(`[RainStationCard] Formatting timestamp for station ${station.station_id}:`, rainfallData.lastUpdated);
      
      if (!rainfallData.lastUpdated) {
        console.log(`[RainStationCard] No timestamp available for station ${station.station_id}`);
        return '';
      }
      
      const date = new Date(rainfallData.lastUpdated);
      console.log(`[RainStationCard] Parsed date for station ${station.station_id}:`, date);
      
      const formatted = date.toLocaleString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      console.log(`[RainStationCard] Formatted timestamp for station ${station.station_id}:`, formatted);
      return formatted;
    } catch (e) {
      console.error('Error formatting timestamp:', e);
      return '';
    }
  }, [rainfallData.lastUpdated]);

  // Determine the display values for rainfall data
  const displayValues = useMemo(() => {
    // For TMD stations, always show '-' for rainfall_today
    const isTMD = displayDataSource === 'TMD';
    
    // Check if we have actual data from the API
    const hasApiData = !!thaiWaterData;
    
    // For rainfall24h:
    // - If data is from API, stale but not null, show value with note
    // - If data is from API and value is null, show "ไม่มีข้อมูล"
    // - If data is from API and value is 0, show "0.00"
    // - If data is from API and value is not 0, show the value
    // - If no data is from API, show "-"
    
    let rainfall24hValue = "-";
    if (hasApiData) {
      if (rainfallData.rainfall24h === null) {
        rainfall24hValue = "ไม่มีข้อมูล";
      } else if (rainfallData.rainfall24h === 0) {
        rainfall24hValue = "0.00";
      } else {
        rainfall24hValue = (rainfallData.rainfall24h || 0).toFixed(2);
      }
    }
    
    // For rainfallToday:
    // - If it's a TMD station, always show "-"
    // - If data is from API and value is null, show "ไม่มีข้อมูล"
    // - If data is from API and value is 0, show "0.00"
    // - If data is from API and value is not 0, show the value
    // - If no data is from API, show "-"
    
    let rainfallTodayValue = "-";
    if (!isTMD && hasApiData) {
      if (rainfallData.rainfallToday === null) {
        rainfallTodayValue = "ไม่มีข้อมูล";
      } else if (rainfallData.rainfallToday === 0) {
        rainfallTodayValue = "0.00";
      } else {
        rainfallTodayValue = (rainfallData.rainfallToday || 0).toFixed(2);
      }
    }
    
    return {
      rainfall24h: rainfall24hValue,
      rainfallToday: rainfallTodayValue
    };
  }, [rainfallData, displayDataSource, thaiWaterData]);

  // Determine if the station has data available from the API
  const hasData = useMemo(() => {
    // Consider data available if we have a timestamp, either from thaiWaterData or from the station
    return !!rainfallData.lastUpdated;
  }, [rainfallData.lastUpdated]);

  // Determine if we're still loading data
  const isLoadingData = useMemo(() => {
    return isLoading && !error;
  }, [isLoading, error]);

  // Determine if there was an error loading data
  const hasError = useMemo(() => {
    return !!error;
  }, [error]);

  // Only show loading state if we're loading AND there's no error
  const showLoading = isLoading && !error;

  // Determine if the timestamp is stale (older than 30 days)
  const isStaleData = useMemo(() => {
    if (!rainfallData.lastUpdated) return false;
    
    const lastUpdatedDate = new Date(rainfallData.lastUpdated);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - lastUpdatedDate.getTime()) / (1000 * 60 * 60 * 24));
    
    console.log(`[RainStationCard] Station ${station.station_id} timestamp age: ${diffDays} days`);
    const isStale = diffDays > 30;
    console.log(`[RainStationCard] Station ${station.station_id} has stale data: ${isStale}`);
    
    return isStale;
  }, [rainfallData.lastUpdated, station.station_id]);

  return (
    <div className="flex flex-col relative mt-6 mx-auto max-w-full w-full px-1.5">
      <Label className={labelStyle}>
        {(isUserSelected || station.source === 'user') && (
          <UserCircle className="inline-block h-5 w-5 mr-1 text-blue-500" />
        )}
        {station.name_th || station.station_name || station.name || "สถานีวัดน้ำฝน"}
        {station.station_id && (
          <span className="text-sm text-gray-500 ml-2">
            (ID: {station.station_id})
          </span>
        )}
        <span className={`text-xs rounded-full px-2 py-0.5 ml-2 ${
          displayDataSource === 'HII' 
            ? 'bg-green-100 text-green-800' 
            : displayDataSource === 'TMD' 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-gray-100 text-gray-800'
        }`}>
          {displayDataSource}
        </span>
        {(!rainfallData.lastUpdated) && !isLoadingData && (
          <span className="text-xs bg-yellow-100 text-yellow-800 rounded-full px-2 py-0.5 ml-2">
            ไม่พบข้อมูล
          </span>
        )}
        {isStaleData && rainfallData.lastUpdated && (
          <span className="text-xs bg-orange-100 text-orange-800 rounded-full px-2 py-0.5 ml-2">
            ข้อมูลเก่า
          </span>
        )}
        {showLoading && (
          <span className="text-xs bg-blue-50 text-blue-600 rounded-full px-2 py-0.5 ml-2">
            กำลังโหลด...
          </span>
        )}
        {hasError && (
          <span className="text-xs bg-red-100 text-red-800 rounded-full px-2 py-0.5 ml-2">
            เกิดข้อผิดพลาด
          </span>
        )}
      </Label>
      
      <div className={contentBoxStyle}>
        <div className="flex justify-between items-center">
          <div className="flex-grow">
            <div className={contentTextStyle}>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[#17254D] text-sm font-normal mb-1">ปริมาณน้ำฝนวันนี้</div>
                    {!useCompactLayout && !hideUnitLabels && (
                      <div className="text-[#64748B] text-xs font-normal mb-2">หน่วย: มม.</div>
                    )}
                    <div className="flex items-center whitespace-nowrap overflow-hidden">
                      <div className="flex items-center flex-shrink-0">
                        <Input 
                          className="w-[70px] h-8 text-right"
                          value={isLoadingData ? "..." : displayValues.rainfallToday}
                          readOnly
                          disabled={disabled || isLoadingData}
                        />
                        <span className="text-sm whitespace-nowrap ml-1">มม.</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-[#17254D] text-sm font-normal mb-1">ปริมาณน้ำฝน 24 ชม.</div>
                    {!useCompactLayout && !hideUnitLabels && (
                      <div className="text-[#64748B] text-xs font-normal mb-2">หน่วย: มม.</div>
                    )}
                    <div className="flex items-center whitespace-nowrap overflow-hidden">
                      <div className="flex items-center flex-shrink-0">
                        <Input 
                          className="w-[70px] h-8 text-right"
                          value={isLoadingData ? "..." : displayValues.rainfall24h}
                          readOnly
                          disabled={disabled || isLoadingData}
                        />
                        <span className="text-sm whitespace-nowrap ml-1">มม.</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs text-[#64748B] mt-2">
                  <div className="flex items-center gap-1">
                    <ClockIcon className="h-3 w-3" />
                    <span>
                      {isLoadingData 
                        ? "กำลังโหลดข้อมูล..." 
                        : (rainfallData.lastUpdated
                            ? `อัพเดทล่าสุด: ${formattedTimestamp}${isStaleData ? ' (ข้อมูลเก่า)' : ''}`
                            : "ไม่พบข้อมูลเวลา")}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-5 w-5 ml-1 p-0" 
                      onClick={handleRefresh}
                      disabled={isLoading}
                      title="รีเฟรชข้อมูล"
                    >
                      <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                  
                  {showButtons && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        console.log('[RainStationCard] Delete button clicked for station:', station.id);
                        console.log('[RainStationCard] Station source:', station.source);
                        console.log('[RainStationCard] Is disabled (from props):', disabled);
                        console.log('[RainStationCard] Is user selected (from props):', isUserSelected);
                        
                        // First check if this is explicitly marked as user-selected via props
                        // This is the most reliable indicator
                        if (isUserSelected) {
                          console.log('[RainStationCard] This is a user-selected station (from props), calling onDeleteData');
                          if (onDeleteData) {
                            console.log('[RainStationCard] Calling onDeleteData');
                            onDeleteData();
                          } else {
                            console.warn('[RainStationCard] onDeleteData is not defined');
                          }
                        } 
                        // Only fall back to source check if isUserSelected is false
                        else if (station.source === 'user') {
                          console.log('[RainStationCard] This is a user-selected station (from source), calling onDeleteData');
                          if (onDeleteData) {
                            console.log('[RainStationCard] Calling onDeleteData');
                            onDeleteData();
                          } else {
                            console.warn('[RainStationCard] onDeleteData is not defined');
                          }
                        }
                        // If neither isUserSelected nor source indicates this is a user-selected station
                        else {
                          console.log('[RainStationCard] This is a system station, calling onToggleDisabled');
                          if (onToggleDisabled) {
                            console.log('[RainStationCard] Calling onToggleDisabled');
                            onToggleDisabled();
                          } else {
                            console.warn('[RainStationCard] onToggleDisabled is not defined');
                          }
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Properly define the memoized component with explicit type
export const RainStationCard: React.FC<RainStationCardProps> = React.memo(RainStationCardComponent);
