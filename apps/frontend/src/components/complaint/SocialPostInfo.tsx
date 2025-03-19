import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProcessedPost } from "@/types/processed-post";
import { Complaint } from "@/types/complaint";
import { ErrorBoundary } from "@/components/error-boundary";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAtomValue } from 'jotai';
import { processedPostsAtom } from '@/atoms/complaintData';

interface SocialPostInfoProps {
  complaint: ProcessedPost | ExtendedComplaint | null;
  onSave?: () => void;
  onDiscard?: () => void;
  selectedPostIds?: string[];
  onTogglePostSelection?: (postId: string) => void;
}

interface ExtendedComplaint extends Complaint {
  issue?: string;
  category?: string;
  reporter?: string;
  date?: string;
  coordinates?: { lat: number; lng: number };
  amphure?: string[];
  tumbon?: string[];
  sub1_category_name?: string;
}

const isExtendedComplaint = (complaint: any): complaint is ExtendedComplaint => {
  return complaint && 'id' in complaint && 'status' in complaint;
};

const isProcessedPost = (complaint: any): complaint is ProcessedPost => {
  return complaint && ('processed_post_id' in complaint || 'text' in complaint);
};

const getIssue = (complaint: ProcessedPost | ExtendedComplaint | null): string => {
  if (!complaint) return '';
  if (isExtendedComplaint(complaint)) {
    return complaint.issue || '';
  }
  if (isProcessedPost(complaint)) {
    return complaint.text || '';
  }
  return complaint.content || '';
};

const getCategory = (complaint: ProcessedPost | ExtendedComplaint | null): string => {
  if (!complaint) return '';
  if (isExtendedComplaint(complaint)) {
    return complaint.category || '';
  }
  if (isProcessedPost(complaint)) {
    return complaint.category_name || '';
  }
  return '';
};

const getSubCategory = (complaint: ProcessedPost | ExtendedComplaint | null): string => {
  if (!complaint) return '';
  if (isExtendedComplaint(complaint)) {
    return complaint.sub1_category_name || '';
  }
  return '';
};

const getReporter = (complaint: ProcessedPost | ExtendedComplaint | null): string => {
  if (!complaint) return '';
  if (isExtendedComplaint(complaint)) {
    return complaint.reporter || '';
  }
  if (isProcessedPost(complaint)) {
    return complaint.profile_name || '';
  }
  return '';
};

const getDate = (complaint: ProcessedPost | ExtendedComplaint | null): string => {
  if (!complaint) return '';
  if (isExtendedComplaint(complaint)) {
    return complaint.date || '';
  }
  if (isProcessedPost(complaint)) {
    if (complaint.post_date instanceof Date) {
      return complaint.post_date.toISOString().split('T')[0];
    } else if (typeof complaint.post_date === 'string') {
      return new Date(complaint.post_date).toISOString().split('T')[0];
    }
  }
  return '';
};

const getLink = (complaint: ProcessedPost | ExtendedComplaint | null): string => {
  if (!complaint) return '';
  if (isExtendedComplaint(complaint)) {
    return complaint.link || '';
  }
  if (isProcessedPost(complaint)) {
    return complaint.post_url || '';
  }
  return '';
};

const getLatitude = (complaint: ProcessedPost | ExtendedComplaint | null): string => {
  if (!complaint) return '';
  if (isExtendedComplaint(complaint)) {
    return complaint.coordinates?.lat?.toString() || '';
  }
  if (isProcessedPost(complaint)) {
    return complaint.latitude?.toString() || '';
  }
  return '';
};

const getLongitude = (complaint: ProcessedPost | ExtendedComplaint | null): string => {
  if (!complaint) return '';
  if (isExtendedComplaint(complaint)) {
    return complaint.coordinates?.lng?.toString() || '';
  }
  if (isProcessedPost(complaint)) {
    return complaint.longitude?.toString() || '';
  }
  return '';
};

const getProvince = (complaint: ProcessedPost | ExtendedComplaint | null): string => {
  if (!complaint) return '';
  if (isExtendedComplaint(complaint)) {
    return Array.isArray(complaint.province) && complaint.province.length > 0 
      ? complaint.province[0] 
      : '';
  }
  if (isProcessedPost(complaint)) {
    return Array.isArray(complaint.province) && complaint.province.length > 0 
      ? complaint.province[0] 
      : (complaint.province as unknown as string || '');
  }
  return '';
};

const getAmphure = (complaint: ProcessedPost | ExtendedComplaint | null): string => {
  if (!complaint) return '';
  if (isExtendedComplaint(complaint)) {
    return Array.isArray(complaint.amphure) && complaint.amphure.length > 0 
      ? complaint.amphure[0] 
      : '';
  }
  if (isProcessedPost(complaint)) {
    return Array.isArray(complaint.amphure) && complaint.amphure.length > 0 
      ? complaint.amphure[0] 
      : (complaint.amphure as unknown as string || '');
  }
  return '';
};

const getTumbon = (complaint: ProcessedPost | ExtendedComplaint | null): string => {
  if (!complaint) return '';
  if (isExtendedComplaint(complaint)) {
    return Array.isArray(complaint.tumbon) && complaint.tumbon.length > 0 
      ? complaint.tumbon[0] 
      : '';
  }
  if (isProcessedPost(complaint)) {
    return Array.isArray(complaint.tumbon) && complaint.tumbon.length > 0 
      ? complaint.tumbon[0] 
      : (complaint.tumbon as unknown as string || '');
  }
  return '';
};

export const SocialPostInfo = ({ 
  complaint, 
  selectedPostIds = [], 
  onTogglePostSelection
}: SocialPostInfoProps) => {
  const [showMockPostsSection, setShowMockPostsSection] = useState(false);
  const processedPosts = useAtomValue(processedPostsAtom);

  if (!complaint) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          ไม่พบข้อมูลโพสต์ที่เกี่ยวข้อง
        </AlertDescription>
      </Alert>
    );
  }

  const issue = getIssue(complaint);
  const mainCategory = getCategory(complaint);
  const reporter = getReporter(complaint);
  const date = getDate(complaint);
  const coordinates = isExtendedComplaint(complaint) ? complaint.coordinates : 
                      isProcessedPost(complaint) ? {
                        lat: parseFloat(getLatitude(complaint)),
                        lng: parseFloat(getLongitude(complaint))
                      } : null;
  const hasCoordinates = coordinates && (coordinates.lat !== 0 || coordinates.lng !== 0);
  const amphure = getAmphure(complaint);
  const amphureDisplay = amphure ? (Array.isArray(amphure) ? amphure.join(', ') : amphure) : 'ไม่ระบุ';

  const contentBoxStyle = "w-full border border-[#E2E8F0] rounded-xl p-3 bg-white text-[#17254D] text-sm font-normal";
  const contentTextStyle = "pl-8";
  const labelStyle = "text-[#64748B] font-medium text-base absolute -top-4 left-3 bg-white px-2 z-10";

  return (
    <ErrorBoundary component="SocialPostInfo">
      <div className="space-y-8 px-4">
        <h2 className="text-xl font-semibold text-[#17254D] mb-6">{mainCategory}</h2>
        
        {complaint && (
          <>
            <div className="flex flex-col relative mt-10 mx-auto max-w-full w-[95%]">
              <Label className={labelStyle}>
                ประเด็นข้อความ
              </Label>
              <div className="w-full">
                <div 
                  className={`${contentBoxStyle} min-h-[80px] whitespace-pre-wrap`}
                >
                  <div className={contentTextStyle}>
                    {issue || "ยังไม่มีข้อมูล"}
                  </div>
                </div>
              </div>
            </div>
            
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
            
            <div className="flex flex-col relative mt-10 mx-auto max-w-full w-[95%]">
              <Label className={labelStyle}>
                ข้อมูลผู้ร้องเรียน
              </Label>
              <div className={contentBoxStyle}>
                <div className={contentTextStyle}>
                  {reporter || "ยังไม่มีข้อมูล"}
                </div>
              </div>
            </div>
            
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
            
            <div className="flex flex-col relative mt-10 mx-auto max-w-full w-[95%]">
              <Label className={labelStyle}>
                อำเภอ
              </Label>
              <div className={contentBoxStyle}>
                <div className={contentTextStyle}>
                  {amphureDisplay || "ยังไม่มีข้อมูล"}
                </div>
              </div>
            </div>
            
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
            
            <div className="flex flex-col relative mt-10 mx-auto max-w-full w-[95%]">
              <Label className={labelStyle}>
                วันที่
              </Label>
              <div className={contentBoxStyle}>
                <div className={contentTextStyle}>
                  {date || "ยังไม่มีข้อมูล"}
                </div>
              </div>
            </div>
            
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
          </>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default SocialPostInfo; 