import { Link } from "react-router-dom";
import { Bell, Settings } from "lucide-react";
import logo1 from "@/assets/logo1.png";
import logo2 from "@/assets/logo2.png";

export const DashboardHeader = () => {
  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-6">
        {/* Top row - Logos and Icons */}
        <div className="flex items-center justify-between pt-3">
          {/* Left section - Logos */}
          <div className="flex items-center gap-4">
            <img 
              src={logo1} 
              alt="Royal Irrigation Department Logo" 
              className="h-20 w-auto object-contain"
            />
            <img 
              src={logo2} 
              alt="SWOC Logo" 
              className="h-20 w-auto object-contain"
            />
          </div>

          {/* Right section - Icons */}
          <div className="flex items-center gap-4">
            {/* Notification bell with indicator */}
            <div className="relative p-3 hover:bg-gray-100 rounded-lg cursor-pointer">
              <Bell className="w-7 h-7 text-[#334155]" />
              <div className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full"></div>
            </div>
            
            {/* Settings */}
            <div className="p-3 hover:bg-gray-100 rounded-lg cursor-pointer">
              <Settings className="w-7 h-7 text-[#334155]" />
            </div>
            
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center text-lg font-medium text-[#0F172B]">
              CN
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row - Navigation */}
      <div className="container-fluid mt-4">
        <div className="px-12">
          <div className="flex">
            {/* This empty div matches the width of the filter panel */}
            <div className="w-[520px]"></div>
            {/* Gap to match the layout */}
            <div className="w-8"></div>
            {/* Navigation tabs aligned with the Map */}
            <nav className="flex items-center border-b border-[#E2E8F0] whitespace-nowrap">
              <Link 
                to="/" 
                className="px-4 py-3 text-[#17254D] border-b-2 border-[#42A5F5] font-medium text-base -mb-[1px] whitespace-nowrap"
              >
                ระบบจัดการข้อมูลสื่อสังคมออนไลน์
              </Link>
              <Link 
                to="/response" 
                className="px-4 py-3 text-[#6B7280] hover:text-[#17254D] text-base whitespace-nowrap"
              >
                ระบบตอบประเด็นข้อร้องเรียน
              </Link>
              <Link 
                to="/dashboard" 
                className="px-4 py-3 text-[#6B7280] hover:text-[#17254D] text-base whitespace-nowrap"
              >
                ระบบแสดงผลข้อมูลและสรุปผลผู้บริหาร
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
};