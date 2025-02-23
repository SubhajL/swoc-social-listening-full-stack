import { useState, useEffect } from "react";
import { Map } from "@/components/Map";
import { FilterPanel } from "../components/filters/FilterPanel";
import { CategoryName, SubCategories } from "@/types/processed-post";
import { getMapboxToken } from "@/utils/mapbox";
import { DashboardHeader } from "@/components/complaint/DashboardHeader";

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
      
      {/* Page Title */}
      <div className="w-full bg-[#EBF5FF] py-4">
        <div className="container mx-auto px-6">
          <h1 className="text-xl font-medium text-[#17254D]">ระบบจัดการข้อมูลสื่อสังคมออนไลน์</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        {/* Frame with Label */}
        <div className="relative mt-6 pt-4">
          {/* Frame Label */}
          <div className="absolute -top-3 left-6 px-4 bg-[#EBF5FF] rounded-full">
            <span className="text-lg font-medium text-[#17254D]">ระบบจัดการข้อมูลสื่อสังคมออนไลน์</span>
          </div>

          {/* Frame Content */}
          <div className="bg-[#EBF5FF] rounded-lg p-6">
            <div className="flex gap-6">
              {/* Filter Panel */}
              <aside className="w-[520px]">
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
                  
                  {/* Category summary */}
                  <div className="p-4 border-t border-[#E2E8F0]">
                    <div className="flex items-center justify-around">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="text-sm text-gray-600">การรายงานและแจ้งเหตุ</span>
                        <span className="text-sm font-medium ml-1">100</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-sm text-gray-600">การขอการสนับสนุน</span>
                        <span className="text-sm font-medium ml-1">100</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <span className="text-sm text-gray-600">การขอข้อมูล</span>
                        <span className="text-sm font-medium ml-1">100</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500" />
                        <span className="text-sm text-gray-600">ข้อเสนอแนะ</span>
                        <span className="text-sm font-medium ml-1">100</span>
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
  );
} 
