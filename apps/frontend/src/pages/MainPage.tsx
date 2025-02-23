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
    <div className="flex flex-col h-screen">
      {/* Header */}
      <DashboardHeader />

      {/* Main content area */}
      <div className="flex flex-1">
        {/* Left sidebar - Filter panel */}
        <div className="w-80 border-r border-gray-200 bg-gray-50 flex flex-col h-full">
          <div className="flex-1 overflow-y-auto">
            <FilterPanel
              selectedCategories={selectedCategories}
              setSelectedCategories={setSelectedCategories}
              selectedProvince={selectedProvince}
              setSelectedProvince={setSelectedProvince}
              selectedOffice={selectedOffice}
              setSelectedOffice={setSelectedOffice}
              provinces={PROVINCES}
              onDateRangeChange={(range) => {
                setDateRange(range);
                console.log('Date range updated:', range);
              }}
            />
          </div>
        </div>

        {/* Main map area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1">
            <Map
              token={MAPBOX_TOKEN}
              selectedCategories={selectedCategories}
              selectedProvince={selectedProvince}
              selectedAmphure={selectedAmphure}
              selectedTumbon={selectedTumbon}
              selectedOffice={selectedOffice}
            />
          </div>
          {/* Message category summary */}
          <div className="h-20 bg-white border-t border-gray-200 p-4 flex items-center justify-around">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>การรายงานและแจ้งเหตุ 100</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>การขอการสนับสนุน 100</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span>การขอข้อมูล 100</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span>ข้อเสนอแนะ 100</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
