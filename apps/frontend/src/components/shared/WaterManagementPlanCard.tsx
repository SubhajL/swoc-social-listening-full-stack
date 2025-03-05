import { Layers, Info as InfoIcon } from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";
import { cleanLocationString, formatLocationForDisplay } from "@/lib/location-utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RainStation } from "@/types/rain-station";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStationData, useComplaintData } from "@/atoms/hooks";

interface WaterManagementPlanCardProps {
  amphure?: string;
  province?: string;
  className?: string;
  title?: string;
}

export const WaterManagementPlanCard = ({ 
  amphure: propAmphure, 
  province: propProvince, 
  className = "",
  title = "แผนการบริหารจัดการน้ำ"
}: WaterManagementPlanCardProps) => {
  // Get location data from Jotai
  const { location } = useComplaintData();
  
  // Get station data from Jotai
  const { rainStations, userSelectedRainStations } = useStationData();
  
  // Use props if provided, otherwise try to parse from location string
  const amphure = propAmphure || (location ? location.split(',')[0]?.trim() : undefined);
  const province = propProvince || (location ? location.split(',')[1]?.trim() : undefined);
  
  // Determine which stations to display - prioritize user selected stations
  const stationData = userSelectedRainStations.length > 0 
    ? userSelectedRainStations 
    : rainStations;
  
  // Clean location strings for display
  const cleanedAmphure = cleanLocationString(amphure);
  const cleanedProvince = cleanLocationString(province);
  
  // Format location for display
  const displayAmphure = amphure ? formatLocationForDisplay(amphure, 'amphure') : undefined;
  const displayProvince = province ? formatLocationForDisplay(province, 'province') : undefined;
  
  return (
    <ErrorBoundary component="WaterManagementPlanCard">
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </ErrorBoundary>
  );
};

export default WaterManagementPlanCard; 