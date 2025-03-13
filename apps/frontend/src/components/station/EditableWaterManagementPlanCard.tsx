import { Plus } from "lucide-react";
import { WaterManagementPlanCard } from "@/components/shared/WaterManagementPlanCard";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAtomValue } from "jotai";
import { currentAmphureAtom, currentProvinceAtom } from "@/atoms/stationData";
import { formatLocationForDisplay } from "@/lib/location-utils";
import React, { useMemo } from "react";

interface EditableWaterManagementPlanCardProps {
  className?: string;
  title?: string;
  onAddData: () => void;
}

export const EditableWaterManagementPlanCard = React.memo(({
  className = "",
  title = "แผนการบริหารจัดการน้ำ",
  onAddData
}: EditableWaterManagementPlanCardProps) => {
  // Get location data from Jotai
  const amphure = useAtomValue(currentAmphureAtom);
  const province = useAtomValue(currentProvinceAtom);
  
  // Format location for display
  const displayAmphure = useMemo(() => 
    amphure ? formatLocationForDisplay(amphure, 'amphure') : undefined,
    [amphure]
  );
  
  const displayProvince = useMemo(() => 
    province ? formatLocationForDisplay(province, 'province') : undefined,
    [province]
  );

  // Memoize the button click handler to prevent unnecessary re-renders
  const handleAddDataClick = useMemo(() => () => {
    onAddData();
  }, [onAddData]);

  return (
    <Card className={cn("w-full h-full min-h-[500px]", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-[#17254D]">{title}</CardTitle>
          <Button 
            onClick={handleAddDataClick}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-sm text-white"
          >
            <Plus className="h-4 w-4" />
            เพิ่มข้อมูล
          </Button>
        </div>
        <CardDescription>
          {displayAmphure && displayProvince 
            ? `${displayAmphure} ${displayProvince}` 
            : 'ไม่ระบุตำแหน่ง'}
        </CardDescription>
      </CardHeader>
      
      {/* Use the existing WaterManagementPlanCard for the content */}
      <WaterManagementPlanCard 
        className="border-none shadow-none min-h-0 h-auto"
        title=""
      />
    </Card>
  );
});

EditableWaterManagementPlanCard.displayName = 'EditableWaterManagementPlanCard';

export default EditableWaterManagementPlanCard; 