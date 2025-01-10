import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

export const DashboardNavigation = () => {
  return (
    <div className="bg-white p-4 border-t">
      <div className="max-w-5xl mx-auto flex justify-between items-center">
        <Button variant="ghost" className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
            <Settings className="w-6 h-6 text-blue-600" />
          </div>
          <span className="text-xs">ระบบจัดการข้อมูล</span>
        </Button>
        <Button variant="ghost" className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
            <Settings className="w-6 h-6 text-blue-600" />
          </div>
          <span className="text-xs">ระบบตอบประเด็น</span>
        </Button>
        <Button variant="ghost" className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
            <Settings className="w-6 h-6 text-blue-600" />
          </div>
          <span className="text-xs">ระบบแสดงผลข้อมูล</span>
        </Button>
        <Button variant="ghost" className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
            <Settings className="w-6 h-6 text-blue-600" />
          </div>
          <span className="text-xs">การตั้งค่าช่วงวันที่</span>
        </Button>
      </div>
    </div>
  );
};