import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Save } from "lucide-react";

interface UnsavedChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export const UnsavedChangesDialog = ({
  open,
  onOpenChange,
  onSave,
  onDiscard,
  onCancel,
}: UnsavedChangesDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-semibold text-[#17254D]">
            มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base text-[#475569]">
            คุณต้องการบันทึกการเปลี่ยนแปลงก่อนออกจากหน้านี้หรือไม่?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex justify-end space-x-2 mt-4">
          <AlertDialogCancel 
            onClick={onCancel}
            className="bg-white text-[#475569] border border-[#CBD5E1] hover:bg-gray-50"
          >
            ยกเลิก
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onDiscard}
            className="bg-white text-[#475569] border border-[#CBD5E1] hover:bg-gray-50"
          >
            ไม่บันทึก
          </AlertDialogAction>
          <AlertDialogAction 
            onClick={onSave}
            className="bg-[#42A5F5] text-white hover:bg-[#1E88E5] flex items-center"
          >
            <Save className="h-4 w-4 mr-2" />
            บันทึก
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}; 