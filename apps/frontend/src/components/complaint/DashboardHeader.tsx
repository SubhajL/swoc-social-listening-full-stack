import { Link } from "react-router-dom";
import { Bell, Settings } from "lucide-react";
import logo1 from "@/assets/logo1.png";
import logo2 from "@/assets/logo2.png";

export const DashboardHeader = () => {
  return (
    <header className="bg-white shadow-sm">
      {/* Top Navigation */}
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between mb-4">
          {/* Left section - Logos */}
          <div className="flex items-center gap-4">
            <img 
              src={logo1} 
              alt="Royal Irrigation Department Logo" 
              className="h-12 w-auto object-contain"
            />
            <img 
              src={logo2} 
              alt="SWOC Logo" 
              className="h-12 w-auto object-contain"
            />
          </div>

          {/* Right section - Icons */}
          <div className="flex items-center gap-2">
            {/* Notification bell with indicator */}
            <div className="relative p-2 hover:bg-gray-100 rounded-lg cursor-pointer">
              <Bell className="w-5 h-5 text-[#334155]" />
              <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></div>
            </div>
            
            {/* Settings */}
            <div className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer">
              <Settings className="w-5 h-5 text-[#334155]" />
            </div>
            
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center text-sm font-medium text-[#0F172B]">
              CN
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex items-center -mb-[1px]">
          <Link 
            to="/" 
            className="px-6 py-3 text-[#17254D] border-b-2 border-[#42A5F5] font-medium text-sm"
          >
            ระบบจัดการข้อมูลสื่อสังคมออนไลน์
          </Link>
          <Link 
            to="/response" 
            className="px-6 py-3 text-[#6B7280] hover:text-[#17254D] text-sm"
          >
            ระบบตอบประเด็นข้อร้องเรียน
          </Link>
          <Link 
            to="/dashboard" 
            className="px-6 py-3 text-[#6B7280] hover:text-[#17254D] text-sm"
          >
            ระบบแสดงผลข้อมูลและสรุปผลผู้บริหาร
          </Link>
        </nav>
      </div>
    </header>
  );
};