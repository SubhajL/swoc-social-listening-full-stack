import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Reservoir } from "@/types/reservoir";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

interface ReservoirCardProps {
  reservoir: Reservoir;
  showButtons?: boolean;
  onAddData?: () => void;
  onDeleteData?: () => void;
}

export const ReservoirCard = ({ 
  reservoir,
  showButtons = false,
  onAddData,
  onDeleteData
}: ReservoirCardProps) => {
  // Common content box styles (matching WaterLevelInfo)
  const contentBoxStyle = "w-full border border-[#E2E8F0] rounded-md p-3 bg-white text-[#17254D] text-sm font-normal";
  const contentTextStyle = "px-3"; // Consistent horizontal padding for balanced layout
  const labelStyle = "text-[#64748B] font-medium text-base absolute -top-4 left-3 bg-white px-2 z-10";

  return (
    <div className="flex flex-col relative mt-6 mx-auto max-w-full w-full px-3">
      <Label className={labelStyle}>
        {reservoir.reservoir_name}
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
                <div className="text-[#17254D] text-sm font-normal mb-2">ความจุ รนก.</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center whitespace-nowrap overflow-hidden">
                    <span className="text-[#17254D] text-sm font-normal mr-2 flex-shrink-0">ปกติ</span>
                    <div className="flex items-center flex-shrink-0">
                      <Input 
                        value={reservoir.normal_storage_capacity ? parseFloat(reservoir.normal_storage_capacity).toFixed(2) : ''} 
                        readOnly 
                        className="w-[70px] h-8 text-right"
                      />
                      <span className="text-sm whitespace-nowrap ml-1">ล้าน ลบ.ม.</span>
                    </div>
                  </div>
                  <div className="flex items-center whitespace-nowrap overflow-hidden">
                    <span className="text-[#17254D] text-sm font-normal mr-2 flex-shrink-0">ต่ำสุด</span>
                    <div className="flex items-center flex-shrink-0">
                      <Input 
                        value={reservoir.minimum_storage_capacity ? parseFloat(reservoir.minimum_storage_capacity).toFixed(2) : ''} 
                        readOnly 
                        className="w-[70px] h-8 text-right"
                      />
                      <span className="text-sm whitespace-nowrap ml-1">ล้าน ลบ.ม.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {showButtons && (
            <div className="flex space-x-2 ml-4">
              <Button
                className="bg-[#EF5350] text-white hover:bg-[#E53935] h-10 px-4 text-base flex items-center"
                onClick={onDeleteData}
              >
                <Trash2 className="h-5 w-5 mr-2" />
                ลบข้อมูล
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 