import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Reservoir } from "@/types/reservoir";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, UserCircle } from "lucide-react";
import React, { useMemo } from "react";

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
  const labelStyle = useMemo(() => `text-[#64748B] font-medium text-base absolute -top-4 left-3 bg-white px-2 z-10 ${disabled ? 'opacity-60' : ''}`, [disabled]);

  // Use fallback values for missing data
  const reservoirData = useMemo(() => {
    return {
      normalStorage: reservoir.normal_storage_capacity ?? 0,
      minStorage: reservoir.minimum_storage_capacity ?? 0,
      currentStorage: reservoir.current_storage ?? 0,
      percentFull: reservoir.percent_full ?? 0,
      updatedAt: reservoir.updated_at ?? new Date().toISOString()
    };
  }, [
    reservoir.normal_storage_capacity,
    reservoir.minimum_storage_capacity,
    reservoir.current_storage,
    reservoir.percent_full,
    reservoir.updated_at
  ]);

  // Debug logging - commented out to reduce console noise
  /*
  console.log('ReservoirCard Debug:', {
    reservoirId: reservoir.id,
    stationId: reservoir.station_id,
    reservoirName: reservoir.reservoir_name,
    normalStorage: reservoirData.normalStorage,
    minStorage: reservoirData.minStorage,
    currentStorage: reservoirData.currentStorage,
    percentFull: reservoirData.percentFull,
    updatedAt: reservoirData.updatedAt,
    disabled,
    isUserSelected,
    hideUnitLabels
  });
  */

  return (
    <div className="flex flex-col relative mt-6 mx-auto max-w-full w-full px-1.5">
      <Label className={labelStyle}>
        {(isUserSelected || reservoir.source === 'user') && (
          <UserCircle className="inline-block h-5 w-5 mr-1 text-blue-500" />
        )}
        {reservoir.reservoir_name || reservoir.name || "เขื่อน/อ่างเก็บน้ำ"}
        {reservoir.id && (
          <span className="text-sm text-gray-500 ml-2">
            (ID: {reservoir.id})
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
                    <div className="text-[#17254D] text-sm font-normal mb-1">ความจุปกติ</div>
                    {!useCompactLayout && !hideUnitLabels && (
                      <div className="text-[#64748B] text-xs font-normal mb-2">หน่วย: ล้าน ลบ.ม.</div>
                    )}
                    <div className="flex items-center whitespace-nowrap overflow-hidden">
                      <div className="flex items-center flex-shrink-0">
                        <Input 
                          value={
                            (reservoir.normal_storage_capacity !== undefined && reservoir.normal_storage_capacity !== null) 
                              ? String(reservoir.normal_storage_capacity) 
                              : ''
                          } 
                          readOnly 
                          disabled={disabled}
                          className="w-[70px] h-8 text-right"
                        />
                        <span className="text-sm whitespace-nowrap ml-1">ล้าน ลบ.ม.</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-[#17254D] text-sm font-normal mb-1">ความจุต่ำสุด</div>
                    {!useCompactLayout && !hideUnitLabels && (
                      <div className="text-[#64748B] text-xs font-normal mb-2">หน่วย: ล้าน ลบ.ม.</div>
                    )}
                    <div className="flex items-center whitespace-nowrap overflow-hidden">
                      <div className="flex items-center flex-shrink-0">
                        <Input 
                          value={
                            (reservoir.minimum_storage_capacity !== undefined && reservoir.minimum_storage_capacity !== null) 
                              ? String(reservoir.minimum_storage_capacity) 
                              : ''
                          } 
                          readOnly 
                          disabled={disabled}
                          className="w-[70px] h-8 text-right"
                        />
                        <span className="text-sm whitespace-nowrap ml-1">ล้าน ลบ.ม.</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[#17254D] text-sm font-normal mb-1">ปริมาณน้ำปัจจุบัน</div>
                    {!useCompactLayout && !hideUnitLabels && (
                      <div className="text-[#64748B] text-xs font-normal mb-2">หน่วย: ล้าน ลบ.ม.</div>
                    )}
                    <div className="flex items-center whitespace-nowrap overflow-hidden">
                      <div className="flex items-center flex-shrink-0">
                        <Input 
                          value={reservoirData.currentStorage ? reservoirData.currentStorage.toFixed(2) : ''} 
                          readOnly 
                          disabled={disabled}
                          className="w-[70px] h-8 text-right"
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
                          value={reservoirData.percentFull ? reservoirData.percentFull.toFixed(2) : ''} 
                          readOnly 
                          disabled={disabled}
                          className="w-[70px] h-8 text-right"
                        />
                        <span className="text-sm whitespace-nowrap ml-1">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {showButtons && (
            <div className="flex-shrink-0 flex space-x-2 ml-4">
              {disabled ? (
                <Button
                  className="bg-[#42A5F5] text-white hover:bg-[#1E88E5] h-8 px-3 text-sm flex items-center justify-center rounded-xl whitespace-nowrap"
                  onClick={() => {
                    console.log('[ReservoirCard] Enable button clicked for reservoir:', reservoir.id);
                    console.log('[ReservoirCard] Reservoir source:', reservoir.source);
                    console.log('[ReservoirCard] Is disabled (from props):', disabled);
                    console.log('[ReservoirCard] Is user selected (from props):', isUserSelected);
                    
                    if (onToggleDisabled) {
                      console.log('[ReservoirCard] Calling onToggleDisabled');
                      onToggleDisabled();
                    } else {
                      console.warn('[ReservoirCard] onToggleDisabled is not defined');
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
                    console.log('[ReservoirCard] Delete button clicked for reservoir:', reservoir.id);
                    console.log('[ReservoirCard] Reservoir source:', reservoir.source);
                    console.log('[ReservoirCard] Is disabled (from props):', disabled);
                    console.log('[ReservoirCard] Is user selected (from props):', isUserSelected);
                    
                    // First check if this is explicitly marked as user-selected via props
                    // This is the most reliable indicator
                    if (isUserSelected) {
                      console.log('[ReservoirCard] This is a user-selected reservoir (from props), calling onDeleteData');
                      if (onDeleteData) {
                        console.log('[ReservoirCard] Calling onDeleteData');
                        onDeleteData();
                      } else {
                        console.warn('[ReservoirCard] onDeleteData is not defined');
                      }
                    } 
                    // Only fall back to source check if isUserSelected is false
                    else if (reservoir.source === 'user') {
                      console.log('[ReservoirCard] This is a user-selected reservoir (from source), calling onDeleteData');
                      if (onDeleteData) {
                        console.log('[ReservoirCard] Calling onDeleteData');
                        onDeleteData();
                      } else {
                        console.warn('[ReservoirCard] onDeleteData is not defined');
                      }
                    }
                    // If neither isUserSelected nor source indicates this is a user-selected reservoir
                    else {
                      console.log('[ReservoirCard] This is a system reservoir, calling onToggleDisabled');
                      if (onToggleDisabled) {
                        console.log('[ReservoirCard] Calling onToggleDisabled');
                        onToggleDisabled();
                      } else {
                        console.warn('[ReservoirCard] onToggleDisabled is not defined');
                      }
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

// Properly define the memoized component with explicit type
export const ReservoirCard: React.FC<ReservoirCardProps> = React.memo(ReservoirCardComponent); 