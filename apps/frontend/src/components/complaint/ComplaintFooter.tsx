import { Button } from "@/components/ui/button";
import { FileText, Save } from "lucide-react";

export const ComplaintFooter = () => {
  return (
    <footer className="fixed bottom-[88px] left-0 right-0 bg-white p-4 border-t">
      <div className="container mx-auto">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <Button variant="outline" className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-green-500" />
            <span>เพิ่มเติมข้อมูล</span>
          </Button>

          <Button variant="outline" className="flex items-center gap-2">
            <span>เตรียมร่างเอกสาร</span>
            <Save className="w-4 h-4 text-green-500" />
          </Button>
        </div>
      </div>
    </footer>
  );
};