import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Reservoir } from "@/types/reservoir";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface ReservoirCardProps {
  reservoir: Reservoir;
}

export const ReservoirCard = ({ reservoir }: ReservoirCardProps) => {
  // Common content box styles (matching WaterLevelInfo)
  const contentBoxStyle = "w-full border border-[#E2E8F0] rounded-md p-3 bg-white text-[#17254D] text-sm font-normal";
  const contentTextStyle = "px-4"; // Reduced horizontal padding for more compact layout
  const labelStyle = "text-[#64748B] font-medium text-base absolute -top-4 left-3 bg-white px-2 z-10";

  return (
    <div className="flex flex-col relative mt-6 mx-auto max-w-full w-full px-2">
      <Label className={labelStyle}>
        {reservoir.reservoir_name}
        {reservoir.id && (
          <span className="text-sm text-gray-500 ml-2">
            (ID: {reservoir.id})
          </span>
        )}
      </Label>
      <div className={contentBoxStyle}>
        <div className={contentTextStyle}>
          <div className="space-y-3">
            <div className="text-[#17254D] text-sm font-normal mb-2">ความจุ รนก.</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center whitespace-nowrap overflow-hidden">
                <span className="text-[#17254D] text-sm font-normal mr-2 flex-shrink-0">ปกติ</span>
                <div className="flex items-center flex-shrink-0">
                  <Input 
                    value={reservoir.normal_storage_capacity ?? ''} 
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
                    value={reservoir.minimum_storage_capacity ?? ''} 
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
    </div>
  );
}; 