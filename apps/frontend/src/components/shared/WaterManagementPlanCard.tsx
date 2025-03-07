import { Layers, Info as InfoIcon, AlertCircle } from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";
import { cleanLocationString, formatLocationForDisplay } from "@/lib/location-utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RainStation, currentAmphureAtom, currentProvinceAtom } from "@/atoms/stationData";
import { useStationData, useComplaintData } from "@/atoms/hooks";
import { useAtomValue } from "jotai";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface WaterManagementPlanCardProps {
  className?: string;
  title?: string;
}

export const WaterManagementPlanCard = ({ 
  className = "",
  title = "แผนการบริหารจัดการน้ำ"
}: WaterManagementPlanCardProps) => {
  // Get location data from Jotai
  const amphure = useAtomValue(currentAmphureAtom);
  const province = useAtomValue(currentProvinceAtom);
  
  // Get station data from Jotai
  const { rainStations, userSelectedRainStations } = useStationData();
  
  // Clean location strings for display
  const cleanedAmphure = cleanLocationString(amphure);
  const cleanedProvince = cleanLocationString(province);
  
  // Format location for display
  const displayAmphure = amphure ? formatLocationForDisplay(amphure, 'amphure') : undefined;
  const displayProvince = province ? formatLocationForDisplay(province, 'province') : undefined;
  
  // Determine which stations to display - prioritize user selected stations
  const stationData = userSelectedRainStations.length > 0 
    ? userSelectedRainStations 
    : rainStations;
  
  // Helper function to safely access rainfall data
  const getRainfall3d = (station: RainStation) => {
    return (station as any).lastReading?.value || 0;
  };

  const getRainfall7d = (station: RainStation) => {
    return (station as any).lastReading?.value || 0;
  };

  return (
    <Card className={cn("w-full h-full min-h-[500px]", className)}>
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-[#17254D]">{title}</CardTitle>
        <CardDescription>
          {displayAmphure && displayProvince 
            ? `${displayAmphure} ${displayProvince}` 
            : 'ไม่ระบุตำแหน่ง'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ErrorBoundary fallback={
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              เกิดข้อผิดพลาดในการโหลดข้อมูล
            </AlertDescription>
          </Alert>
        }>
          {stationData.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-[#64748B]">
                พบสถานีวัดน้ำฝนที่เกี่ยวข้องกับพื้นที่นี้จำนวน {stationData.length} สถานี
              </p>
              
              {/* Rainfall data section */}
              <div className="space-y-4">
                <h3 className="text-base font-medium text-[#17254D]">ข้อมูลปริมาณน้ำฝน</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 3-day rainfall */}
                  <div className="bg-[#F1F5F9] rounded-lg p-4">
                    <h4 className="text-sm font-medium text-[#475569] mb-2">ปริมาณน้ำฝนสะสม 3 วัน</h4>
                    <div className="flex items-center">
                      <span className="text-2xl font-bold text-[#0369A1]">
                        {stationData.length > 0 ? getRainfall3d(stationData[0]) : 0}
                      </span>
                      <span className="ml-1 text-sm text-[#64748B]">มม.</span>
                    </div>
                  </div>
                  
                  {/* 7-day rainfall */}
                  <div className="bg-[#F1F5F9] rounded-lg p-4">
                    <h4 className="text-sm font-medium text-[#475569] mb-2">ปริมาณน้ำฝนสะสม 7 วัน</h4>
                    <div className="flex items-center">
                      <span className="text-2xl font-bold text-[#0369A1]">
                        {stationData.length > 0 ? getRainfall7d(stationData[0]) : 0}
                      </span>
                      <span className="ml-1 text-sm text-[#64748B]">มม.</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Water management plan section */}
              <div className="space-y-4">
                <h3 className="text-base font-medium text-[#17254D]">แผนการบริหารจัดการน้ำ</h3>
                
                <div className="bg-[#F1F5F9] rounded-lg p-4">
                  <div className="flex items-start">
                    <InfoIcon className="h-5 w-5 text-[#0369A1] mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-[#334155]">
                        จากข้อมูลปริมาณน้ำฝนในพื้นที่ {displayAmphure || cleanedAmphure} {displayProvince || cleanedProvince} พบว่ามีปริมาณน้ำฝนสะสม 7 วันอยู่ที่ {stationData.length > 0 ? getRainfall7d(stationData[0]) : 0} มม. 
                        {stationData.length > 0 && getRainfall7d(stationData[0]) > 100 
                          ? ' ซึ่งอยู่ในเกณฑ์สูง ควรเฝ้าระวังน้ำท่วมฉับพลันและน้ำป่าไหลหลาก' 
                          : ' ซึ่งอยู่ในเกณฑ์ปกติ ยังไม่มีความเสี่ยงน้ำท่วมฉับพลัน'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                ไม่พบข้อมูลสถานีวัดน้ำฝนในพื้นที่ {displayAmphure || cleanedAmphure || 'ไม่ระบุอำเภอ'} {displayProvince || cleanedProvince || 'ไม่ระบุจังหวัด'}
              </AlertDescription>
            </Alert>
          )}
        </ErrorBoundary>
      </CardContent>
    </Card>
  );
};

export default WaterManagementPlanCard; 