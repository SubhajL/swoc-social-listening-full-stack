import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProcessedPost } from "@/types/processed-post";
import { Complaint } from "@/types/complaint";
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MOCK_PROCESSED_POSTS, USE_MOCK_DATA } from "@/utils/mockData";
import { useState } from "react";

interface SocialPostInfoProps {
  complaint: ProcessedPost | Complaint | null;
  onSave?: () => void;
  onDiscard?: () => void;
  selectedPostIds?: string[];
  onTogglePostSelection?: (postId: string) => void;
  showMockPosts?: boolean;
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

export const SocialPostInfo = ({ 
  complaint, 
  selectedPostIds = [], 
  onTogglePostSelection,
  showMockPosts = USE_MOCK_DATA 
}: SocialPostInfoProps) => {
  const [showMockPostsSection, setShowMockPostsSection] = useState(false);

  if (!complaint && !showMockPosts) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          ไม่พบข้อมูลข้อร้องเรียน
        </AlertDescription>
      </Alert>
    );
  }

  const mainCategory = complaint ? getCategory(complaint) : "ข้อความจากโซเชียลมีเดีย";

  const contentBoxStyle = "w-full border border-[#E2E8F0] rounded-xl p-3 bg-white text-[#17254D] text-sm font-normal";
  const contentTextStyle = "pl-8";
  const labelStyle = "text-[#64748B] font-medium text-base absolute -top-4 left-3 bg-white px-2 z-10";

  return (
    <ErrorBoundary component="SocialPostInfo">
      <div className="space-y-8 px-4">
        <h2 className="text-xl font-semibold text-[#17254D] mb-6">{mainCategory}</h2>
        
        {showMockPosts && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-yellow-800">ข้อมูลจำลอง (Mock Data)</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowMockPostsSection(!showMockPostsSection)}
                className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
              >
                {showMockPostsSection ? "ซ่อน" : "แสดง"}
              </Button>
            </div>
            
            {showMockPostsSection && (
              <div className="space-y-4">
                <p className="text-sm text-yellow-700 mb-2">เลือกข้อความจากข้อมูลจำลองเพื่อใช้ในการสร้างข้อร้องเรียน:</p>
                
                {MOCK_PROCESSED_POSTS.map((post) => (
                  <div 
                    key={post.processed_post_id} 
                    className={`border ${selectedPostIds.includes(String(post.processed_post_id)) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'} rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition-colors`}
                    onClick={() => onTogglePostSelection?.(String(post.processed_post_id))}
                  >
                    <div className="flex justify-between">
                      <span className="font-medium">{post.profile_name}</span>
                      <span className="text-xs text-gray-500">{new Date(post.post_date).toLocaleDateString('th-TH')}</span>
                    </div>
                    <p className="mt-2 text-sm">{post.text}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{post.category_name}</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">{post.amphure[0]}, {post.province[0]}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
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
                    {getIssue(complaint) || "ยังไม่มีข้อมูล"}
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
                  {getReporter(complaint) || "ยังไม่มีข้อมูล"}
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
                  {getAmphure(complaint) || "ยังไม่มีข้อมูล"}
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
                  {getDate(complaint) || "ยังไม่มีข้อมูล"}
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