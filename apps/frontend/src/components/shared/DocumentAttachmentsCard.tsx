import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useDocumentAttachments } from "@/atoms/hooks";
import { Attachment } from "@/atoms/documentAttachments";
import { Download, Trash2, Upload, FileText } from "lucide-react";
import { useRef, useState } from "react";

interface DocumentAttachmentsCardProps {
  title?: string;
  className?: string;
  editable?: boolean;
  onAttachmentDownload?: (fileName: string) => void;
}

export const DocumentAttachmentsCard = ({
  title = "เอกสารแนบ",
  className = "",
  editable = true,
  onAttachmentDownload,
}: DocumentAttachmentsCardProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const { 
    attachments, 
    addAttachment, 
    removeAttachment,
    downloadAttachment
  } = useDocumentAttachments();
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editable || !e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    addAttachment(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleDownload = (fileName: string) => {
    if (onAttachmentDownload) {
      onAttachmentDownload(fileName);
    } else {
      downloadAttachment(fileName);
    }
  };
  
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };
  
  return (
    <ErrorBoundary component="DocumentAttachmentsCard">
      <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
        <div className="flex justify-start items-center mb-4">
          <h2 className="text-xl font-semibold text-[#17254D]">{title}</h2>
        </div>
        
        <div className="px-4 py-0">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          
          {editable && (
            <div className="mb-4">
              <Button
                variant="outline"
                onClick={handleUploadClick}
                className="w-full border-dashed border-2 border-[#E2E8F0] py-6 flex flex-col items-center justify-center gap-2 hover:bg-[#F8FAFC]"
              >
                <Upload className="h-6 w-6 text-[#64748B]" />
                <span className="text-[#64748B]">คลิกเพื่ออัปโหลดเอกสาร</span>
                <span className="text-xs text-[#94A3B8]">หรือลากและวางไฟล์ที่นี่</span>
              </Button>
            </div>
          )}
          
          <div className="space-y-3">
            <h3 className="text-base font-medium text-[#17254D]">เอกสารที่แนบ</h3>
            
            {attachments.length > 0 ? (
              <div className="space-y-2">
                {attachments.map((attachment) => (
                  <div 
                    key={attachment.id} 
                    className="flex items-center justify-between p-3 border border-[#E2E8F0] rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-[#64748B]" />
                      <div>
                        <p className="text-sm font-medium text-[#17254D]">{attachment.name}</p>
                        <p className="text-xs text-[#64748B]">{formatFileSize(attachment.size)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(attachment.name)}
                        className="h-8 w-8 text-[#64748B] hover:text-[#0284C7] hover:bg-[#F0F9FF]"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      
                      {editable && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeAttachment(attachment.id)}
                          className="h-8 w-8 text-[#64748B] hover:text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border border-[#E2E8F0] rounded-lg">
                <p className="text-[#64748B]">ยังไม่มีเอกสารแนบ</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default DocumentAttachmentsCard; 