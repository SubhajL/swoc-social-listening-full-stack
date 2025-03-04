import { Link, useNavigate } from "react-router-dom";
import { Bell, Settings } from "lucide-react";
import logo1 from "@/assets/logo1.png";
import logo2 from "@/assets/logo2.png";
import { UserAvatar } from "./UserAvatar";

interface AppHeaderProps {
  showNavigation?: boolean;
  activeTab?: 'dashboard' | 'response' | 'report';
}

export const AppHeader = ({ showNavigation = true, activeTab = 'dashboard' }: AppHeaderProps) => {
  const navigate = useNavigate();

  const handleSettingsClick = () => {
    navigate('/system-setting');
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-12">
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
          <div className="flex items-center gap-1 pr-0">
            {/* Notification bell with indicator */}
            <div className="relative p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer">
              <Bell className="w-6 h-6 text-[#334155]" />
              <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></div>
            </div>
            
            {/* Settings */}
            <div 
              className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer"
              onClick={handleSettingsClick}
            >
              <Settings className="w-6 h-6 text-[#334155]" />
            </div>
            
            {/* User Avatar */}
            <UserAvatar className="ml-1" />
          </div>
        </div>

        {/* Navigation tabs */}
        {showNavigation && (
          <div className="flex mt-2">
            <nav className="flex items-center border-b border-[#E2E8F0] whitespace-nowrap">
              <Link 
                to="/dashboard" 
                className={`px-4 py-1 text-base whitespace-nowrap ${
                  activeTab === 'dashboard' 
                    ? 'text-[#17254D] border-b-2 border-[#42A5F5] font-medium -mb-[0px]'
                    : 'text-[#6B7280] hover:text-[#17254D]'
                }`}
              >
                ระบบจัดการข้อมูลสื่อสังคมออนไลน์
              </Link>
              <Link 
                to="/response" 
                className={`px-4 py-1 text-base whitespace-nowrap ${
                  activeTab === 'response'
                    ? 'text-[#17254D] border-b-2 border-[#42A5F5] font-medium -mb-[0px]'
                    : 'text-[#6B7280] hover:text-[#17254D]'
                }`}
              >
                ระบบตอบประเด็นข้อร้องเรียน
              </Link>
              <Link 
                to="/dashboard" 
                className={`px-4 py-1 text-base whitespace-nowrap ${
                  activeTab === 'report'
                    ? 'text-[#17254D] border-b-2 border-[#42A5F5] font-medium -mb-[0px]'
                    : 'text-[#6B7280] hover:text-[#17254D]'
                }`}
              >
                ระบบแสดงผลข้อมูลและสรุปผลผู้บริหาร
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}; 