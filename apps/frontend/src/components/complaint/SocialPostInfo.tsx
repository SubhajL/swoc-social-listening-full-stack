import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProcessedPost } from "@/types/processed-post";
import { Complaint } from "@/types/complaint";
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface SocialPostInfoProps {
  complaint: ProcessedPost | Complaint | null;
}

const isProcessedPost = (data: any): data is ProcessedPost => {
  return data !== null && typeof data === 'object' && 'processed_post_id' in data;
};

const getIssue = (complaint: ProcessedPost | Complaint | null): string => {
  if (!complaint) return '';
  if (isProcessedPost(complaint)) {
    return complaint.text || '';
  }
  return complaint.issue || '';
};

const getCategory = (complaint: ProcessedPost | Complaint | null): string => {
  if (!complaint) return '';
  if (isProcessedPost(complaint)) {
    return complaint.category_name || '';
  }
  return complaint.category || '';
};

const getSubCategory = (complaint: ProcessedPost | Complaint | null): string => {
  if (!complaint) return '';
  if (isProcessedPost(complaint)) {
    return complaint.sub1_category_name || '';
  }
  return '';
};

const getReporter = (complaint: ProcessedPost | Complaint | null): string => {
  if (!complaint) return '';
  if (isProcessedPost(complaint)) {
    return complaint.profile_name || '';
  }
  return complaint.reporter || '';
};

const getDate = (complaint: ProcessedPost | Complaint | null): string => {
  if (!complaint) return '';
  if (isProcessedPost(complaint)) {
    return complaint.post_date instanceof Date 
      ? complaint.post_date.toISOString().split('T')[0] 
      : new Date(complaint.post_date).toISOString().split('T')[0];
  }
  return complaint.date || '';
};

const getLink = (complaint: ProcessedPost | Complaint | null): string => {
  if (!complaint) return '';
  if (isProcessedPost(complaint)) {
    return complaint.post_url || '';
  }
  return complaint.link || '';
};

const getLatitude = (complaint: ProcessedPost | Complaint | null): string => {
  if (!complaint) return '';
  if (isProcessedPost(complaint)) {
    return complaint.latitude?.toString() || '';
  }
  return complaint.coordinates?.lat?.toString() || '';
};

const getLongitude = (complaint: ProcessedPost | Complaint | null): string => {
  if (!complaint) return '';
  if (isProcessedPost(complaint)) {
    return complaint.longitude?.toString() || '';
  }
  return complaint.coordinates?.lng?.toString() || '';
};

const getProvince = (complaint: ProcessedPost | Complaint | null): string => {
  if (!complaint) return '';
  if (isProcessedPost(complaint)) {
    return Array.isArray(complaint.province) && complaint.province.length > 0 
      ? complaint.province[0] 
      : '';
  }
  return Array.isArray(complaint.province) && complaint.province.length > 0 
    ? complaint.province[0] 
    : (complaint.province as unknown as string || '');
};

const getAmphure = (complaint: ProcessedPost | Complaint | null): string => {
  if (!complaint) return '';
  if (isProcessedPost(complaint)) {
    return Array.isArray(complaint.amphure) && complaint.amphure.length > 0 
      ? complaint.amphure[0] 
      : '';
  }
  return Array.isArray(complaint.amphure) && complaint.amphure.length > 0 
    ? complaint.amphure[0] 
    : (complaint.amphure as unknown as string || '');
};

const getTumbon = (complaint: ProcessedPost | Complaint | null): string => {
  if (!complaint) return '';
  if (isProcessedPost(complaint)) {
    return Array.isArray(complaint.tumbon) && complaint.tumbon.length > 0 
      ? complaint.tumbon[0] 
      : '';
  }
  return Array.isArray(complaint.tumbon) && complaint.tumbon.length > 0 
    ? complaint.tumbon[0] 
    : (complaint.tumbon as unknown as string || '');
};

export const SocialPostInfo = ({ complaint }: SocialPostInfoProps) => {
  if (!complaint) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          ไม่พบข้อมูลข้อร้องเรียน
        </AlertDescription>
      </Alert>
    );
  }

  // Get the main category to use as the heading
  const mainCategory = getCategory(complaint);

  // Common content box styles
  const contentBoxStyle = "w-full border border-[#E2E8F0] rounded-md p-3 bg-white text-[#17254D] text-sm font-normal";
  const contentTextStyle = "pl-8"; // Increased left padding from pl-3 to pl-8
  const labelStyle = "text-[#64748B] font-medium text-lg absolute -top-4 left-3 bg-white px-2 z-10";

  return (
    <ErrorBoundary component="SocialPostInfo">
      {/* Reduce horizontal padding to create less spacing from borders */}
      <div className="space-y-8 px-6">
        {/* Main Heading - Selected message type */}
        <h2 className="text-2xl font-semibold text-[#17254D] mb-6">{mainCategory}</h2>
        
        {/* ประเด็นข้อความ */}
        <div className="flex flex-col relative mt-10 mx-auto max-w-full w-[95%]">
          <Label className={labelStyle}>
            ประเด็นข้อความ
          </Label>
          <div className="w-full">
            <div 
              className={`${contentBoxStyle} min-h-[80px] whitespace-pre-wrap`}
            >
              <div className={contentTextStyle}>
                {getIssue(complaint) || "ยังไม่มีข้อมูล"}
              </div>
            </div>
          </div>
        </div>
        
        {/* ประเภทข้อความ */}
        <div className="flex flex-col relative mt-10 mx-auto max-w-full w-[95%]">
          <Label className={labelStyle}>
            ประเภทข้อความ
          </Label>
          <div className={contentBoxStyle}>
            <div className={contentTextStyle}>
              {getCategory(complaint) || "ยังไม่มีข้อมูล"}
            </div>
          </div>
        </div>
        
        {/* ประเภทข้อความย่อย */}
        <div className="flex flex-col relative mt-10 mx-auto max-w-full w-[95%]">
          <Label className={labelStyle}>
            ประเภทข้อความย่อย
          </Label>
          <div className={contentBoxStyle}>
            <div className={contentTextStyle}>
              {getSubCategory(complaint) || "ยังไม่มีข้อมูล"}
            </div>
          </div>
        </div>
        
        {/* ข้อมูลผู้ร้องเรียน */}
        <div className="flex flex-col relative mt-10 mx-auto max-w-full w-[95%]">
          <Label className={labelStyle}>
            ข้อมูลผู้ร้องเรียน
          </Label>
          <div className={contentBoxStyle}>
            <div className={contentTextStyle}>
              {getReporter(complaint) || "ยังไม่มีข้อมูล"}
            </div>
          </div>
        </div>
        
        {/* ตำบล */}
        <div className="flex flex-col relative mt-10 mx-auto max-w-full w-[95%]">
          <Label className={labelStyle}>
            ตำบล
          </Label>
          <div className={contentBoxStyle}>
            <div className={contentTextStyle}>
              {getTumbon(complaint) || "ยังไม่มีข้อมูล"}
            </div>
          </div>
        </div>
        
        {/* อำเภอ */}
        <div className="flex flex-col relative mt-10 mx-auto max-w-full w-[95%]">
          <Label className={labelStyle}>
            อำเภอ
          </Label>
          <div className={contentBoxStyle}>
            <div className={contentTextStyle}>
              {getAmphure(complaint) || "ยังไม่มีข้อมูล"}
            </div>
          </div>
        </div>
        
        {/* จังหวัด */}
        <div className="flex flex-col relative mt-10 mx-auto max-w-full w-[95%]">
          <Label className={labelStyle}>
            จังหวัด
          </Label>
          <div className={contentBoxStyle}>
            <div className={contentTextStyle}>
              {getProvince(complaint) || "ยังไม่มีข้อมูล"}
            </div>
          </div>
        </div>
        
        {/* ละติจูด */}
        <div className="flex flex-col relative mt-10 mx-auto max-w-full w-[95%]">
          <Label className={labelStyle}>
            ละติจูด
          </Label>
          <div className={contentBoxStyle}>
            <div className={contentTextStyle}>
              {getLatitude(complaint) || "ยังไม่มีข้อมูล"}
            </div>
          </div>
        </div>
        
        {/* ลองจิจูด */}
        <div className="flex flex-col relative mt-10 mx-auto max-w-full w-[95%]">
          <Label className={labelStyle}>
            ลองจิจูด
          </Label>
          <div className={contentBoxStyle}>
            <div className={contentTextStyle}>
              {getLongitude(complaint) || "ยังไม่มีข้อมูล"}
            </div>
          </div>
        </div>
        
        {/* วันที่ */}
        <div className="flex flex-col relative mt-10 mx-auto max-w-full w-[95%]">
          <Label className={labelStyle}>
            วันที่
          </Label>
          <div className={contentBoxStyle}>
            <div className={contentTextStyle}>
              {getDate(complaint) || "ยังไม่มีข้อมูล"}
            </div>
          </div>
        </div>
        
        {/* ลิงค์ข้อความ */}
        <div className="flex flex-col relative mt-10 mx-auto max-w-full w-[95%]">
          <Label className={labelStyle}>
            ลิงค์ข้อความ
          </Label>
          <div className={contentBoxStyle}>
            <div className={contentTextStyle}>
              {getLink(complaint) || "ยังไม่มีข้อมูล"}
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default SocialPostInfo; 