import { useState, useEffect, useCallback, useMemo } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useStationData } from "@/atoms/hooks";
import { atomWithStorage } from "jotai/utils";
import { useAtom } from "jotai";
import { Paperclip, X, FileText } from "lucide-react";
import React from "react";

// Define the file type for water management plan
interface WaterManagementFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  uploadedAt: string;
}

// Create a Jotai atom to store water management plan data
export const waterManagementPlanDataAtom = atomWithStorage('waterManagementPlanData', {
  planDescription: '',
  lastUpdated: '',
  files: [] as WaterManagementFile[]
});

interface WaterManagementPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: any) => void;
}

export const WaterManagementPlanDialog = React.memo(({
  open,
  onOpenChange,
  onSave
}: WaterManagementPlanDialogProps) => {
  const { currentAmphure, currentProvince } = useStationData();
  const [waterManagementData, setWaterManagementData] = useAtom(waterManagementPlanDataAtom);
  
  // Local state for form values
  const [planDescription, setPlanDescription] = useState<string>(waterManagementData.planDescription || '');
  const [files, setFiles] = useState<WaterManagementFile[]>(waterManagementData.files || []);
  
  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setPlanDescription(waterManagementData.planDescription || '');
      setFiles(waterManagementData.files || []);
    }
  }, [open, waterManagementData]);
  
  // Handle file upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).map(file => {
        // In a real application, you would upload the file to a server here
        // and get back a URL to the uploaded file
        return {
          id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          size: file.size,
          type: file.type,
          url: URL.createObjectURL(file), // This is temporary and will be revoked when the page is unloaded
          uploadedAt: new Date().toISOString()
        };
      });
      
      setFiles(prevFiles => [...prevFiles, ...newFiles]);
    }
  }, []);
  
  // Handle file removal
  const handleFileRemove = useCallback((fileId: string) => {
    setFiles(prevFiles => prevFiles.filter(file => file.id !== fileId));
  }, []);
  
  // Format file size for display
  const formatFileSize = useMemo(() => (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }, []);
  
  // Handle save button click
  const handleSave = useCallback(() => {
    const newData = {
      planDescription,
      files,
      lastUpdated: new Date().toISOString()
    };
    
    // Update the atom
    setWaterManagementData(newData);
    
    // Call the onSave callback
    onSave(newData);
    
    // Close the dialog
    onOpenChange(false);
  }, [planDescription, files, setWaterManagementData, onSave, onOpenChange]);
  
  // Handle input changes
  const handlePlanDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPlanDescription(e.target.value);
  }, []);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col bg-white p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-semibold text-[#17254D]">เพิ่มข้อมูลแผนการบริหารจัดการน้ำ</DialogTitle>
        </DialogHeader>
        
        <div className="p-6 pt-4 overflow-y-auto">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="planDescription" className="text-sm font-medium text-[#475569]">
                รายละเอียดแผนการบริหารจัดการน้ำ
              </Label>
              <Textarea
                id="planDescription"
                value={planDescription}
                onChange={handlePlanDescriptionChange}
                className="min-h-[150px] border-[#E2E8F0] focus:border-[#42A5F5] focus:ring-[#42A5F5]"
                placeholder="กรอกรายละเอียดแผนการบริหารจัดการน้ำในพื้นที่..."
              />
            </div>
            
            {/* File upload section */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-[#475569]">
                เอกสารแนบ
              </Label>
              
              {/* File list */}
              {files.length > 0 && (
                <div className="space-y-2 mb-3">
                  {files.map(file => (
                    <div 
                      key={file.id} 
                      className="flex items-center justify-between bg-[#F8FAFC] p-3 rounded-md border border-[#E2E8F0]"
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
                      <button 
                        onClick={() => handleFileRemove(file.id)}
                        className="text-[#64748B] hover:text-[#475569]"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* File upload button */}
              <div className="flex items-center">
                <Label 
                  htmlFor="file-upload" 
                  className="flex items-center gap-2 bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0] rounded-md py-2 px-3 cursor-pointer"
                >
                  <Paperclip className="h-4 w-4" />
                  เพิ่มไฟล์
                </Label>
                <Input
                  id="file-upload"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="px-6 py-4 flex justify-between items-center w-full border-t border-[#E2E8F0]">
          <div className="text-sm text-[#64748B]">
            {currentAmphure && currentProvince ? 
              `พื้นที่: ${currentAmphure} ${currentProvince}` : 
              'ไม่ระบุตำแหน่ง'}
          </div>
          <div className="flex space-x-2">
            <DialogClose asChild>
              <Button variant="outline" className="border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#475569]">
                ยกเลิก
              </Button>
            </DialogClose>
            <Button 
              onClick={handleSave}
              className="bg-[#42A5F5] hover:bg-[#1E88E5] text-white"
            >
              บันทึกข้อมูล
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

WaterManagementPlanDialog.displayName = 'WaterManagementPlanDialog';

export default WaterManagementPlanDialog; 