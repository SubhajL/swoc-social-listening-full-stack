import { Layers, Info as InfoIcon, Plus } from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";
import { useEffect } from "react";
import { cleanLocationString, formatLocationForDisplay } from "@/lib/location-utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RainStation } from "@/types/rain-station";
import { Button } from "@/components/ui/button";

interface WaterManagementPlanProps {
  amphure?: string;
  province?: string;
  stationData?: RainStation[];
  onAddData?: () => void;
}

export const WaterManagementPlan = ({ amphure, province, stationData, onAddData }: WaterManagementPlanProps) => {
  // Clean location strings for display
  const cleanedAmphure = cleanLocationString(amphure);
  const cleanedProvince = cleanLocationString(province);
  
  // Format location for display
  const displayAmphure = amphure ? formatLocationForDisplay(amphure, 'amphure') : undefined;
  const displayProvince = province ? formatLocationForDisplay(province, 'province') : undefined;
  
  // Log when component renders with new props
  console.log('[WaterManagementPlan] Component rendered with location:', { 
    amphure, 
    province,
    cleanedAmphure,
    cleanedProvince
  });
  console.log('[WaterManagementPlan] Received stationData:', stationData);
  
  // Track location changes
  useEffect(() => {
    console.log('[WaterManagementPlan] Location changed:', { amphure, province });
  }, [amphure, province]);
  
  return (
    <ErrorBoundary component="WaterManagementPlan">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-[#17254D]">แผนการบริหารจัดการน้ำ</h2>
          <Button 
            onClick={onAddData}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 h-8 px-3 text-sm"
          >
            <Plus className="h-4 w-4" />
            เพิ่มข้อมูล
          </Button>
        </div>
        
        {/* Display water management plan information */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-start space-x-2">
            <Layers className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                แผนการบริหารจัดการน้ำ{displayAmphure && ` ${displayAmphure}`}{displayProvince && ` ${displayProvince}`}
              </h3>
              
              {/* If we have station data, show a message about it */}
              {stationData && stationData.length > 0 ? (
                <p className="text-gray-600 mt-2">
                  มีข้อมูลสถานีตรวจวัดน้ำฝนจำนวน {stationData.length} สถานี ที่เกี่ยวข้องกับพื้นที่นี้
                </p>
              ) : (
                <Alert className="mt-2">
                  <InfoIcon className="h-4 w-4" />
                  <AlertDescription>
                    ไม่พบข้อมูลแผนการบริหารจัดการน้ำสำหรับพื้นที่นี้
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}; 