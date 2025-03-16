import { Layers, Info as InfoIcon, AlertCircle, Plus, FileText } from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary";
import { cleanLocationString, formatLocationForDisplay } from "@/lib/location-utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { currentAmphureAtom, currentProvinceAtom } from "@/atoms/stationData";
import { useStationData } from "@/atoms/hooks";
import { useAtomValue } from "jotai";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { waterManagementPlanDataAtom } from "@/components/complaint/WaterManagementPlanDialog";
import { useMemo, memo } from "react";

interface WaterManagementPlanCardProps {
  className?: string;
  title?: string;
  onAddData?: () => void;
}

export const WaterManagementPlanCard = memo(({ 
  className = "",
  title = "แผนการบริหารจัดการน้ำ",
  onAddData
}: WaterManagementPlanCardProps) => {
  // Get location data from Jotai
  const amphure = useAtomValue(currentAmphureAtom);
  const province = useAtomValue(currentProvinceAtom);
  
  // Get water management plan data from Jotai
  const waterManagementData = useAtomValue(waterManagementPlanDataAtom);
  
  // Clean location strings for display
  const cleanedAmphure = useMemo(() => cleanLocationString(amphure), [amphure]);
  const cleanedProvince = useMemo(() => cleanLocationString(province), [province]);
  
  // Format location for display
  const displayAmphure = useMemo(() => 
    amphure ? formatLocationForDisplay(amphure, 'amphure') : undefined, 
    [amphure]
  );
  
  const displayProvince = useMemo(() => 
    province ? formatLocationForDisplay(province, 'province') : undefined, 
    [province]
  );
  
  // Check if we have custom water management plan data
  const hasCustomPlanData = useMemo(() => 
    waterManagementData && waterManagementData.lastUpdated,
    [waterManagementData]
  );
  
  // Format file size for display
  const formatFileSize = useMemo(() => (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }, []);

  return (
    <Card className={cn("w-full h-full min-h-[500px]", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-[#17254D]">{title}</CardTitle>
        </div>
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
          {hasCustomPlanData ? (
            <div className="space-y-4">
              <p className="text-sm text-[#64748B]">
                ข้อมูลล่าสุด: {new Date(waterManagementData.lastUpdated).toLocaleString('th-TH')}
              </p>
              
              {/* Water management plan section */}
              <div className="space-y-4">
                <h3 className="text-base font-medium text-[#17254D]">แผนการบริหารจัดการน้ำ</h3>
                
                <div className="bg-[#F1F5F9] rounded-lg p-4">
                  <div className="flex items-start">
                    <InfoIcon className="h-5 w-5 text-[#0369A1] mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      {waterManagementData?.planDescription ? (
                        <p className="text-sm text-[#334155]">
                          {waterManagementData.planDescription}
                        </p>
                      ) : (
                        <p className="text-sm text-[#334155]">
                          ยังไม่มีรายละเอียดแผนการบริหารจัดการน้ำสำหรับพื้นที่ {displayAmphure || cleanedAmphure} {displayProvince || cleanedProvince}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Attached files section */}
              {waterManagementData?.files && waterManagementData.files.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-base font-medium text-[#17254D]">เอกสารแนบ</h3>
                  
                  <div className="space-y-2">
                    {waterManagementData.files.map(file => (
                      <div 
                        key={file.id} 
                        className="flex items-center justify-between bg-[#F1F5F9] p-3 rounded-lg"
                      >
                        <div className="flex items-center space-x-2">
                          <FileText className="h-5 w-5 text-[#64748B]" />
                          <div>
                            <p className="text-sm font-medium text-[#334155] truncate max-w-[300px]">
                              {file.name}
                            </p>
                            <p className="text-xs text-[#64748B]">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>
                        {file.url && (
                          <a 
                            href={file.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-[#0369A1] hover:underline"
                          >
                            ดูเอกสาร
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                ยังไม่มีข้อมูลแผนการบริหารจัดการน้ำสำหรับพื้นที่ {displayAmphure || cleanedAmphure || 'ไม่ระบุอำเภอ'} {displayProvince || cleanedProvince || 'ไม่ระบุจังหวัด'}
              </AlertDescription>
            </Alert>
          )}
        </ErrorBoundary>
      </CardContent>
    </Card>
  );
});

WaterManagementPlanCard.displayName = 'WaterManagementPlanCard';

export default WaterManagementPlanCard; 