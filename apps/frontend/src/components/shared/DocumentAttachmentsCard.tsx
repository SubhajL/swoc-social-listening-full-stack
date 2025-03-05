import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Paperclip, X, FileText, Download } from "lucide-react";
import { useRef, useCallback } from "react";
import { atom } from "jotai";
import { useDocumentAttachments, Attachment } from "@/atoms/hooks";

// Define attachment atom
export const documentAttachmentsAtom = atom<Attachment[]>([]);

interface DocumentAttachmentsCardProps {
  title?: string;
  className?: string;
  editable?: boolean;
  onAttachmentDownload?: (id: string) => void;
}

export const DocumentAttachmentsCard = ({
  title = "เอกสารประกอบ",
  className = "",
  editable = true,
  onAttachmentDownload
}: DocumentAttachmentsCardProps) => {
  // Use document attachments hook
  const { attachments, addAttachment, removeAttachment, getAttachment } = useDocumentAttachments();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Handle file selection
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    addAttachment(file);
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [addAttachment]);
  
  // Handle attachment download
  const handleDownloadAttachment = useCallback((id: string) => {
    if (onAttachmentDownload) {
      onAttachmentDownload(id);
    } else {
      // Default download behavior
      const attachment = getAttachment(id);
      if (attachment && attachment.url) {
        window.open(attachment.url, '_blank');
      }
    }
  }, [getAttachment, onAttachmentDownload]);
  
  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  return (
    <ErrorBoundary component="DocumentAttachmentsCard">
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* File upload input (hidden) */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            />
            
            {/* Upload button */}
            {editable && (
              <div>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-dashed border-2 py-8 flex flex-col items-center justify-center"
                >
                  <Paperclip className="h-6 w-6 mb-2" />
                  <span>คลิกเพื่อเพิ่มเอกสารประกอบ</span>
                  <span className="text-sm text-gray-500 mt-1">
                    รองรับไฟล์ PDF, Word, Excel, และรูปภาพ
                  </span>
                </Button>
              </div>
            )}
            
            {/* Attachment list */}
            {attachments.length > 0 ? (
              <div className="space-y-2">
                <Label>รายการเอกสารประกอบ</Label>
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <div 
                      key={attachment.id} 
                      className="flex items-center justify-between p-3 border rounded-md bg-gray-50"
                    >
                      <div className="flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="font-medium">{attachment.name}</p>
                          <p className="text-sm text-gray-500">{formatFileSize(attachment.size)}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadAttachment(attachment.id)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {editable && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAttachment(attachment.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                ยังไม่มีเอกสารประกอบ
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </ErrorBoundary>
  );
};

export default DocumentAttachmentsCard; 