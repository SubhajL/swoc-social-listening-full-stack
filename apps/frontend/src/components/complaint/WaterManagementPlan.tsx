import { Layers } from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";

interface WaterManagementPlanProps {
  amphure?: string;
  province?: string;
}

export const WaterManagementPlan = ({ amphure, province }: WaterManagementPlanProps) => {
  return (
    <ErrorBoundary component="WaterManagementPlan">
      <div className="space-y-8 px-4">
        {/* Main Heading with icon */}
        <div className="flex items-center gap-2">
          <Layers className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-[#17254D]">แผนผังการสั่งน้ำ</h2>
        </div>
        
        {/* Content placeholder - to be implemented */}
        <div className="flex flex-col items-center justify-center min-h-[200px] border border-dashed border-gray-300 rounded-lg p-4">
          <p className="text-gray-500 text-center">
            ข้อมูลแผนผังการสั่งน้ำจะแสดงที่นี่
            {amphure && ` สำหรับ${amphure}`}
            {!amphure && province && ` สำหรับ${province}`}
          </p>
        </div>
      </div>
    </ErrorBoundary>
  );
}; 