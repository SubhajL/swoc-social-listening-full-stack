import { ErrorBoundary } from "@/components/error-boundary";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useDocumentData } from "@/atoms/hooks";
import { useState, useEffect, useCallback } from "react";
import { CheckCircle, Save, Send } from "lucide-react";

interface DocumentResponseCardProps {
  title?: string;
  className?: string;
  editable?: boolean;
  showApprovalButtons?: boolean;
  onSave?: () => void;
  onApprove?: () => void;
  onSubmitForApproval?: () => void;
  isSaved?: boolean;
  isApproved?: boolean;
}

export const DocumentResponseCard = ({
  title = "ร่างเอกสารตอบ",
  className = "",
  editable = true,
  showApprovalButtons = false,
  onSave,
  onApprove,
  onSubmitForApproval,
  isSaved = false,
  isApproved = false
}: DocumentResponseCardProps) => {
  // Get document data from Jotai
  const { 
    documentContent, 
    updateDocumentContent
  } = useDocumentData();
  
  // Use props for approval and saved status
  const documentIsApproved = isApproved;
  const documentIsSaved = isSaved;
  
  // Handle textarea change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (editable) {
      updateDocumentContent(e.target.value);
    }
  };
  
  return (
    <ErrorBoundary component="DocumentResponseCard">
      <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
        <div className="flex justify-start items-center mb-4">
          <h2 className="text-xl font-semibold text-[#17254D]">{title}</h2>
        </div>
        
        <div className="px-4 py-0">
          <div className="flex flex-col relative mt-6 mx-auto max-w-full w-full mb-6">
            <Label className="text-[#64748B] font-medium text-base absolute -top-4 left-2 bg-white px-2 z-10">
              เนื้อหาเอกสาร
            </Label>
            {editable ? (
              <Textarea 
                value={documentContent} 
                onChange={handleChange}
                placeholder="พิมพ์เนื้อหาเอกสารตอบที่นี่..."
                className="min-h-[200px] border border-[#E2E8F0] rounded-xl p-4 text-[#17254D] text-sm"
              />
            ) : (
              <div className="min-h-[200px] border border-[#E2E8F0] rounded-xl p-4 bg-white text-[#17254D] text-sm whitespace-pre-wrap">
                <div className="pl-4">
                  {documentContent || "ยังไม่มีเนื้อหาเอกสาร"}
                </div>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          {(editable || showApprovalButtons) && (
            <div className="flex justify-end gap-3 mt-6">
              {editable && onSave && (
                <Button
                  variant="outline"
                  onClick={onSave}
                  className={`flex items-center gap-2 ${
                    documentIsSaved ? 'bg-green-50 text-green-600 border-green-300' : ''
                  }`}
                >
                  {documentIsSaved ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      บันทึกแล้ว
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      บันทึก
                    </>
                  )}
                </Button>
              )}
              
              {showApprovalButtons && (
                <>
                  {onSubmitForApproval && !documentIsApproved && (
                    <Button
                      variant="outline"
                      onClick={onSubmitForApproval}
                      className="flex items-center gap-2"
                    >
                      <Send className="h-4 w-4" />
                      ส่งอนุมัติ
                    </Button>
                  )}
                  
                  {onApprove && (
                    <Button
                      variant={documentIsApproved ? "outline" : "default"}
                      onClick={onApprove}
                      className={`flex items-center gap-2 ${
                        documentIsApproved ? 'bg-green-50 text-green-600 border-green-300' : 'bg-[#0284C7] hover:bg-[#0369A1] text-white'
                      }`}
                    >
                      {documentIsApproved ? (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          อนุมัติแล้ว
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          อนุมัติ
                        </>
                      )}
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default DocumentResponseCard; 