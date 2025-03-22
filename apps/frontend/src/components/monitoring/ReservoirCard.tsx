import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Reservoir } from "@/types/reservoir";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, UserCircle, AlertCircle, Clock, RefreshCw } from "lucide-react";
import React, { useMemo, useState, useEffect } from "react";
import { ReservoirData, useReservoirData } from "@/hooks/useReservoirData";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Extended Reservoir interface with additional properties
interface ExtendedReservoir {
  id: string;
  name?: string;
  location?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  status?: 'active' | 'inactive' | 'maintenance';
  capacity?: number;
  currentLevel?: number;
  percentFull?: number;
  type?: 'reservoir';
  current_storage?: number | null;
  percent_full?: number | null;
  updated_at?: string | null;
  reservoir_name?: string;
  source?: 'system' | 'user';
  normal_storage_capacity?: number | null;
  minimum_storage_capacity?: number | null;
  reservoir_id?: string;
  data_source?: string;
}

interface ReservoirCardProps {
  reservoir: ExtendedReservoir;
  showButtons?: boolean;
  disabled?: boolean;
  isUserSelected?: boolean;
  useCompactLayout?: boolean;
  hideUnitLabels?: boolean;
  onAddData?: () => void;
  onDeleteData?: () => void;
  onToggleDisabled?: () => void;
}

const ReservoirCardComponent = ({ 
  reservoir,
  showButtons = false,
  disabled = false,
  isUserSelected = false,
  useCompactLayout = false,
  hideUnitLabels = false,
  onAddData,
  onDeleteData,
  onToggleDisabled
}: ReservoirCardProps) => {
  // Common content box styles
  const contentBoxStyle = useMemo(() => `w-full border border-[#E2E8F0] rounded-xl p-2 bg-white text-[#17254D] text-sm font-normal ${disabled ? 'opacity-60' : ''}`, [disabled]);
  const contentTextStyle = "px-1.5"; // Reduced horizontal padding for more space
  const labelStyle = useMemo(() => `text-[#64748B] font-medium text-base absolute -top-3.5 left-3 bg-card px-3 py-0.5 z-10 ${disabled ? 'opacity-60' : ''}`, [disabled]);

  // Fetch reservoir data
  const reservoirIdForApi = reservoir.reservoir_id || reservoir.id;
  const { data: reservoirDataResponse, isLoading, error, refetch } = useReservoirData(reservoirIdForApi);
  const [currentReservoirData, setCurrentReservoirData] = useState<ReservoirData | null>(null);

  // Debug API response
  useEffect(() => {
    console.log(`[ReservoirCard] Data response for ${reservoirIdForApi}:`, { 
      hasResponse: !!reservoirDataResponse,
      dataCount: reservoirDataResponse?.reservoir_data?.length || 0,
      error: error ? (error instanceof Error ? error.message : String(error)) : null,
      isLoading,
      dataSource: reservoir.data_source
    });
  }, [reservoirDataResponse, error, isLoading, reservoirIdForApi, reservoir.data_source]);

  // Find matching reservoir data
  useEffect(() => {
    if (reservoirDataResponse?.reservoir_data && reservoirDataResponse.reservoir_data.length > 0) {
      // First try to find by exact reservoir_id match
      let matchingData = reservoirDataResponse.reservoir_data.find(
        data => data.reservoir_id === reservoirIdForApi
      );
      
      // If not found, try to match by reservoir_name
      if (!matchingData && reservoir.reservoir_name) {
        matchingData = reservoirDataResponse.reservoir_data.find(
          data => data.reservoir_name === reservoir.reservoir_name
        );
      }
      
      if (matchingData) {
        console.log(`[ReservoirCard] Found matching data for ${reservoirIdForApi}:`, matchingData);
        // Log the types of the data fields to debug
        console.log('[ReservoirCard] Data types:', {
          storage: typeof matchingData.storage,
          dead_storage: typeof matchingData.dead_storage,
          volume: typeof matchingData.volume,
          inflow: typeof matchingData.inflow,
          outflow: typeof matchingData.outflow,
          storageValue: matchingData.storage,
          deadStorageValue: matchingData.dead_storage,
          volumeValue: matchingData.volume,
          inflowValue: matchingData.inflow,
          outflowValue: matchingData.outflow
        });
        setCurrentReservoirData(matchingData);
      } else {
        console.log(`[ReservoirCard] No matching data found for ${reservoirIdForApi} in response`);
      }
    } else {
      console.log(`[ReservoirCard] No reservoir data in response for ${reservoirIdForApi}`);
    }
  }, [reservoirDataResponse, reservoirIdForApi, reservoir.reservoir_name]);

  // Helper function to safely format numeric values
  const safelyFormatNumber = (value: any, decimals: number = 4): string => {
    // First check if value exists
    if (value === undefined || value === null) {
      return '-';
    }
    
    // Try to convert to number if it's a string
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    // Check if it's a valid number after conversion
    if (typeof numValue === 'number' && !isNaN(numValue)) {
      return numValue.toFixed(decimals);
    }
    
    // If it's not a valid number, return dash
    return '-';
  };

  // Use fallback values for missing data
  const reservoirData = useMemo(() => {
    return {
      normalStorage: reservoir.normal_storage_capacity ?? 0,
      minStorage: reservoir.minimum_storage_capacity ?? 0,
      currentStorage: reservoir.current_storage ?? 0,
      percentFull: reservoir.percent_full ?? 0,
      updatedAt: reservoir.updated_at ?? new Date().toISOString(),
      storage: currentReservoirData?.storage,
      deadStorage: currentReservoirData?.dead_storage,
      volume: currentReservoirData?.volume,
      inflow: currentReservoirData?.inflow,
      outflow: currentReservoirData?.outflow,
      dataSource: currentReservoirData?.data_source || reservoir.data_source || 'system',
      type: currentReservoirData?.type || reservoir.type || 'reservoir',
      lastUpdated: currentReservoirData?.updated_at ? format(new Date(currentReservoirData.updated_at), 'dd มี.ค. yyyy HH:mm', { locale: th }) : null
    };
  }, [
    reservoir.normal_storage_capacity,
    reservoir.minimum_storage_capacity,
    reservoir.current_storage,
    reservoir.percent_full,
    reservoir.updated_at,
    reservoir.type,
    reservoir.data_source,
    currentReservoirData
  ]);

  // Format the data source for display
  const getDataSourceDisplay = () => {
    if (reservoirData.dataSource === 'dam') return 'DAM';
    if (reservoirData.dataSource === 'reservoir') return 'reservoir';
    return reservoirData.dataSource?.toUpperCase() || '';
  };

  // Has data indicator
  const hasData = !!(
    (reservoirData.storage !== undefined && reservoirData.storage !== null) ||
    (reservoirData.deadStorage !== undefined && reservoirData.deadStorage !== null) ||
    (reservoirData.volume !== undefined && reservoirData.volume !== null) ||
    (reservoirData.inflow !== undefined && reservoirData.inflow !== null) ||
    (reservoirData.outflow !== undefined && reservoirData.outflow !== null)
  );

  // Check if we have any data from PostgreSQL - consider the API response too
  const hasPostgresData = !!currentReservoirData || (reservoirDataResponse && !error);

  return (
    <div className="flex flex-col relative mt-6 mx-auto max-w-full w-full px-1.5">
      <Label className={labelStyle}>
        {(isUserSelected || reservoir.source === 'user') && (
          <UserCircle className="inline-block h-5 w-5 mr-1 text-blue-500" />
        )}
        {reservoir.reservoir_name || reservoir.name || "เขื่อน/อ่างเก็บน้ำ"}
        <span className="text-sm text-gray-500 ml-2">
          (ID: {reservoir.reservoir_id || reservoir.id})
          {getDataSourceDisplay() && (
            <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full text-xs ml-1">
              {getDataSourceDisplay()}
            </span>
          )}
          {!hasPostgresData && (
            <span className="bg-[#FEF9C3] text-[#A16207] px-2 py-0.5 rounded-full text-xs ml-1">
              ไม่พบข้อมูล
            </span>
          )}
        </span>
      </Label>
      
      <div className={contentBoxStyle}>
        <div className="flex justify-between items-center">
          <div className="flex-grow">
            <div className={contentTextStyle}>
              <div className="space-y-3">
                {/* Row 1: Storage and Dead Storage */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[#17254D] text-sm font-normal mb-1">ปริมาณน้ำเก็บกัก</div>
                    {!useCompactLayout && !hideUnitLabels && (
                      <div className="text-[#64748B] text-xs font-normal mb-2">หน่วย: ล้าน ลบ.ม.</div>
                    )}
                    <div className="flex items-center whitespace-nowrap overflow-hidden">
                      <div className="flex items-center flex-shrink-0">
                        <Input 
                          value={safelyFormatNumber(reservoirData.storage)}
                          readOnly 
                          disabled={disabled}
                          className="w-[90px] h-8 text-right"
                        />
                        <span className="text-sm whitespace-nowrap ml-1">ล้าน ลบ.ม.</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-[#17254D] text-sm font-normal mb-1">ปริมาณน้ำเก็บกักต่ำสุด</div>
                    {!useCompactLayout && !hideUnitLabels && (
                      <div className="text-[#64748B] text-xs font-normal mb-2">หน่วย: ล้าน ลบ.ม.</div>
                    )}
                    <div className="flex items-center whitespace-nowrap overflow-hidden">
                      <div className="flex items-center flex-shrink-0">
                        <Input 
                          value={safelyFormatNumber(reservoirData.deadStorage)}
                          readOnly 
                          disabled={disabled}
                          className="w-[90px] h-8 text-right"
                        />
                        <span className="text-sm whitespace-nowrap ml-1">ล้าน ลบ.ม.</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Row 2: Volume and Percent Full */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[#17254D] text-sm font-normal mb-1">ปริมาณน้ำในอ่าง</div>
                    {!useCompactLayout && !hideUnitLabels && (
                      <div className="text-[#64748B] text-xs font-normal mb-2">หน่วย: ล้าน ลบ.ม.</div>
                    )}
                    <div className="flex items-center whitespace-nowrap overflow-hidden">
                      <div className="flex items-center flex-shrink-0">
                        <Input 
                          value={safelyFormatNumber(reservoirData.volume)}
                          readOnly 
                          disabled={disabled}
                          className="w-[90px] h-8 text-right"
                        />
                        <span className="text-sm whitespace-nowrap ml-1">ล้าน ลบ.ม.</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-[#17254D] text-sm font-normal mb-1">เปอร์เซ็นต์</div>
                    {!useCompactLayout && !hideUnitLabels && (
                      <div className="text-[#64748B] text-xs font-normal mb-2">หน่วย: %</div>
                    )}
                    <div className="flex items-center whitespace-nowrap overflow-hidden">
                      <div className="flex items-center flex-shrink-0">
                        <Input 
                          value={safelyFormatNumber(reservoirData.percentFull, 2)}
                          readOnly 
                          disabled={disabled}
                          className="w-[90px] h-8 text-right"
                        />
                        <span className="text-sm whitespace-nowrap ml-1">%</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Row 3: Inflow and Outflow */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[#17254D] text-sm font-normal mb-1">ปริมาณน้ำไหลเข้าอ่าง</div>
                    <div className="flex items-center whitespace-nowrap overflow-hidden">
                      <div className="flex items-center flex-shrink-0">
                        <Input 
                          value={safelyFormatNumber(reservoirData.inflow)}
                          readOnly 
                          disabled={disabled}
                          className="w-[90px] h-8 text-right"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-[#17254D] text-sm font-normal mb-1">ปริมาณน้ำระบาย</div>
                    <div className="flex items-center whitespace-nowrap overflow-hidden">
                      <div className="flex items-center flex-shrink-0">
                        <Input 
                          value={safelyFormatNumber(reservoirData.outflow)}
                          readOnly 
                          disabled={disabled}
                          className="w-[90px] h-8 text-right"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Data source and last updated */}
                <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
                  <div className="flex items-center">
                    <Clock className="h-3.5 w-3.5 mr-1" />
                    {reservoirData.lastUpdated ? (
                      <span>อัพเดตล่าสุด: {reservoirData.lastUpdated}</span>
                    ) : (
                      <span className="text-[#A16207]">ไม่พบข้อมูลเวลา</span>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 ml-1 p-0.5 hover:bg-gray-100 rounded-full"
                      onClick={() => {
                        // Manually refetch data
                        refetch();
                      }}
                    >
                      <RefreshCw className="h-4 w-4 text-gray-500" />
                    </Button>
                  </div>
                </div>
                
                {/* Error display */}
                {error && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      ไม่สามารถโหลดข้อมูลได้: {error instanceof Error ? error.message : 'เกิดข้อผิดพลาด'}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </div>
          
          {showButtons && (
            <div className="flex-shrink-0 flex space-x-2 ml-4">
              {disabled ? (
                <Button
                  className="bg-[#42A5F5] text-white hover:bg-[#1E88E5] h-8 px-3 text-sm flex items-center justify-center rounded-xl whitespace-nowrap"
                  onClick={() => {
                    if (onToggleDisabled) {
                      onToggleDisabled();
                    }
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  เพิ่มข้อมูล
                </Button>
              ) : (
                <Button
                  className="bg-[#EF5350] text-white hover:bg-[#E53935] h-8 px-3 text-sm flex items-center justify-center rounded-xl whitespace-nowrap"
                  onClick={() => {
                    if (isUserSelected || reservoir.source === 'user') {
                      if (onDeleteData) {
                        onDeleteData();
                      }
                    } else if (onToggleDisabled) {
                      onToggleDisabled();
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  ลบข้อมูล
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Export the component with a display name for better debugging
const ReservoirCard = React.memo(ReservoirCardComponent);
ReservoirCard.displayName = 'ReservoirCard';

export { ReservoirCard }; 