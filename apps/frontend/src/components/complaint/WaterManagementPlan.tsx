import { Layers, Info as InfoIcon } from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";
import { useEffect } from "react";
import { cleanLocationString, formatLocationForDisplay } from "@/lib/location-utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface WaterManagementPlanProps {
  amphure?: string;
  province?: string;
}

export const WaterManagementPlan = ({ amphure, province }: WaterManagementPlanProps) => {
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
  
  // Track location changes
  useEffect(() => {
    console.log('[WaterManagementPlan] Location changed:', { 
      amphure, 
      province,
      cleanedAmphure,
      cleanedProvince
    });
  }, [amphure, province, cleanedAmphure, cleanedProvince]);
  
  // Early return if no location data
  if (!amphure && !province) {
    return (
      <ErrorBoundary component="WaterManagementPlan">
        <div className="space-y-8 px-4">
          {/* Main Heading with icon */}
          <div className="flex items-center gap-2">
            <Layers className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-[#17254D]">แผนผังการสั่งน้ำ</h2>
          </div>
          
          {/* Empty state message */}
          <Alert className="bg-gray-50">
            <InfoIcon className="h-5 w-5 text-blue-500" />
            <AlertDescription className="text-gray-600">
              กรุณาระบุพื้นที่ (อำเภอหรือจังหวัด) เพื่อดูแผนผังการสั่งน้ำ
            </AlertDescription>
          </Alert>
        </div>
      </ErrorBoundary>
    );
  }
  
  return (
    <ErrorBoundary component="WaterManagementPlan">
      <div className="space-y-8 px-4">
        {/* Main Heading with icon */}
        <div className="flex items-center gap-2">
          <Layers className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-[#17254D]">แผนผังการสั่งน้ำ</h2>
        </div>
        
        {/* Content placeholder - to be implemented */}
        <div className="flex flex-col items-center justify-center min-h-[200px] border border-dashed border-gray-300 rounded-xl p-4">
          <p className="text-gray-500 text-center">
            ข้อมูลแผนผังการสั่งน้ำจะแสดงที่นี่
            {displayAmphure && ` สำหรับ${displayAmphure}`}
            {!displayAmphure && displayProvince && ` สำหรับ${displayProvince}`}
          </p>
        </div>
      </div>
    </ErrorBoundary>
  );
}; 