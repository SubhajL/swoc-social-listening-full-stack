import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useDocumentData } from "@/atoms/hooks";
import { useState, useEffect, useCallback } from "react";

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
    documentContent: storeContent, 
    documentTitle: storeTitle,
    updateDocumentContent
  } = useDocumentData();
  
  // Local state for content
  const [content, setContent] = useState(storeContent || "");
  const [hasContentChanged, setHasContentChanged] = useState(false);
  
  // Update local state when store content changes
  useEffect(() => {
    if (storeContent !== undefined) {
      setContent(storeContent);
      setHasContentChanged(false);
    }
  }, [storeContent]);
  
  // Handle content change
  const handleContentChange = useCallback((value: string) => {
    setContent(value);
    setHasContentChanged(true);
    updateDocumentContent(value);
  }, [updateDocumentContent]);
  
  // Handle save
  const handleSave = useCallback(() => {
    if (onSave) {
      onSave();
    }
    setHasContentChanged(false);
  }, [onSave]);
  
  // Handle approve
  const handleApprove = useCallback(() => {
    if (onApprove) {
      onApprove();
    }
  }, [onApprove]);
  
  // Handle submit for approval
  const handleSubmitForApproval = useCallback(() => {
    if (onSubmitForApproval) {
      onSubmitForApproval();
    }
  }, [onSubmitForApproval]);
  
  return (
    <ErrorBoundary component="DocumentResponseCard">
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="documentContent">เนื้อหาเอกสาร</Label>
              <Textarea
                id="documentContent"
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="พิมพ์เนื้อหาเอกสารตอบที่นี่..."
                className="min-h-[300px] font-sarabun"
                readOnly={!editable}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              {editable && (
                <Button
                  variant="default"
                  onClick={handleSave}
                  disabled={!hasContentChanged && isSaved}
                  className={isSaved && !hasContentChanged ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  {isSaved && !hasContentChanged ? "บันทึกแล้ว" : "บันทึก"}
                </Button>
              )}
              
              {showApprovalButtons && (
                <>
                  {isApproved ? (
                    <Button
                      variant="default"
                      className="bg-green-600 hover:bg-green-700"
                      disabled
                    >
                      อนุมัติแล้ว
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="default"
                        onClick={handleApprove}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        อนุมัติ
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleSubmitForApproval}
                      >
                        ส่งต่อการอนุมัติ
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </ErrorBoundary>
  );
};

export default DocumentResponseCard; 