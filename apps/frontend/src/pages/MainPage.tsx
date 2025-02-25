import { useState, useEffect } from "react";
import { Map } from "@/components/Map";
import { FilterPanel } from "../components/filters/FilterPanel";
import { CategoryName, SubCategories } from "@/types/processed-post";
import { getMapboxToken } from "@/utils/mapbox";
import { DashboardHeader } from "@/components/complaint/DashboardHeader";
import DiamondIcon from "@/assets/icon/diamond.svg";
import SquareIcon from "@/assets/icon/square.svg";
import CircleIcon from "@/assets/icon/circle.svg";
import HexagonIcon from "@/assets/icon/hexagon.svg";

// Get Mapbox token from utility
const MAPBOX_TOKEN = getMapboxToken();

// This would typically come from an API
const PROVINCES = [
  "กรุงเทพมหานคร",
  "นนทบุรี",
  "ปทุมธานี",
  // ... add more provinces
];

// Get all subcategories for initial display
const getAllSubCategories = () => {
  const categories = [
    CategoryName.REPORT_INCIDENT,
    CategoryName.REQUEST_SUPPORT,
    CategoryName.REQUEST_INFO
  ];
  
  return categories.flatMap(category => 
    SubCategories[category].filter(sub => sub !== 'All')
  );
};

export function MainPage() {
  const [selectedCategories, setSelectedCategories] = useState<CategoryName[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [selectedAmphure, setSelectedAmphure] = useState<string | null>(null);
  const [selectedTumbon, setSelectedTumbon] = useState<string | null>(null);
  const [selectedOffice, setSelectedOffice] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [isLoading, setIsLoading] = useState(false);

  // Effect to handle filter changes
  useEffect(() => {
    const applyFilters = async () => {
      setIsLoading(true);
      try {
        // Here you would typically call your API with the filter values
        console.log('Applying filters:', {
          selectedCategories,
          dateRange,
          selectedProvince,
          selectedAmphure,
          selectedTumbon,
          selectedOffice
        });
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error('Error applying filters:', error);
      } finally {
        setIsLoading(false);
      }
    };

    applyFilters();
  }, [selectedCategories, dateRange, selectedProvince, selectedAmphure, selectedTumbon, selectedOffice]);

  // Log initial state for debugging
  useEffect(() => {
    console.log('Initial categories:', selectedCategories);
  }, []);

  const handleSubCategoryChange = (subCategory: CategoryName, checked: boolean) => {
    setSelectedCategories(prev => {
      const newState = checked 
        ? [...prev, subCategory]
        : prev.filter(sc => sc !== subCategory);
      console.log('Subcategory changed:', {
        subCategory,
        checked,
        previousState: prev,
        newState
      });
      return newState;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      
      {/* Main Content */}
      <div className="container-fluid">
        {/* Frame with Content */}
        <div className="relative -mt-[1px]">
          {/* Frame Content */}
          <div className="bg-[#EBF5FF] min-h-[calc(100vh-80px)]">
            {/* Page Title */}
            <div className="px-12 pt-6 pb-6">
              <h1 className="text-xl font-semibold text-[#17254D]">ระบบจัดการข้อมูลสื่อสังคมออนไลน์</h1>
            </div>
            
            <div className="px-12 pt-0 pb-6">
              <div className="flex gap-8">
                {/* Filter Panel */}
                <aside className="w-[450px]">
                  <div className="bg-white rounded-lg border border-[#E2E8F0]">
                    <FilterPanel
                      selectedCategories={selectedCategories}
                      setSelectedCategories={setSelectedCategories}
                      selectedProvince={selectedProvince}
                      setSelectedProvince={setSelectedProvince}
                      selectedOffice={selectedOffice}
                      setSelectedOffice={setSelectedOffice}
                      onDateRangeChange={setDateRange}
                      isLoading={isLoading}
                    />
                  </div>
                </aside>

                {/* Map Panel */}
                <main className="flex-1">
                  <div className="bg-white rounded-lg border border-[#E2E8F0] h-full flex flex-col">
                    <div className="flex-1 relative">
                      <Map
                        token={MAPBOX_TOKEN}
                        selectedCategories={selectedCategories}
                        selectedProvince={selectedProvince}
                        selectedAmphure={selectedAmphure}
                        selectedTumbon={selectedTumbon}
                        selectedOffice={selectedOffice}
                      />
                    </div>
                    
                    {/* Category summary - Redesigned */}
                    <div className="p-4 border-t border-[#E2E8F0] bg-white rounded-b-lg">
                      <div className="flex items-center justify-around px-4">
                        <div className="flex items-center gap-2">
                          <div className="bg-red-50 p-1.5 rounded-full">
                            <img src={DiamondIcon} alt="Report" className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-medium text-gray-700 whitespace-nowrap">การรายงานและแจ้งเหตุ</span>
                          <span className="text-sm font-bold text-black ml-1.5">100</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="bg-green-50 p-1.5 rounded-full">
                            <img src={SquareIcon} alt="Support" className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-medium text-gray-700 whitespace-nowrap">การขอการสนับสนุน</span>
                          <span className="text-sm font-bold text-black ml-1.5">100</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="bg-yellow-50 p-1.5 rounded-full">
                            <img src={CircleIcon} alt="Info" className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-medium text-gray-700 whitespace-nowrap">การขอข้อมูล</span>
                          <span className="text-sm font-bold text-black ml-1.5">100</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="bg-orange-50 p-1.5 rounded-full">
                            <img src={HexagonIcon} alt="Suggestion" className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-medium text-gray-700 whitespace-nowrap">ข้อเสนอแนะ</span>
                          <span className="text-sm font-bold text-black ml-1.5">100</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </main>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
