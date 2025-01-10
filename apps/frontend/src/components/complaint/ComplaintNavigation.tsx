import { Button } from "@/components/ui/button";
import { Settings, FileText, BarChart3, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

export const ComplaintNavigation = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t py-4">
      <div className="container mx-auto">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <Link to="/">
            <Button variant="ghost" className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Settings className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-xs">ระบบจัดการข้อมูล</span>
            </Button>
          </Link>

          <Button variant="ghost" className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-xs">ระบบตอบประเด็น</span>
          </Button>

          <Button variant="ghost" className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-xs">ระบบแสดงผลข้อมูล</span>
          </Button>

          <Button variant="ghost" className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-xs">การตั้งค่าช่วงวันที่</span>
          </Button>
        </div>
      </div>
    </div>
  );
};