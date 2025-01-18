import { useState, useEffect } from "react";
import { Map } from "@/components/Map";
import { FilterPanel } from "../components/filters/FilterPanel";
import { CategoryName, SubCategories } from "@/types/processed-post";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

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
  // Initialize states
  const [selectedSubCategories, setSelectedSubCategories] = useState<string[]>(getAllSubCategories());
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [selectedOffice, setSelectedOffice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Effect to handle filter changes
  useEffect(() => {
    const applyFilters = async () => {
      setIsLoading(true);
      try {
        // Here you would typically call your API with the filter values
        console.log('Applying filters:', {
          selectedSubCategories,
          dateRange,
          selectedProvince,
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
  }, [selectedSubCategories, dateRange, selectedProvince, selectedOffice]);

  // Log initial state for debugging
  useEffect(() => {
    console.log('Initial subcategories:', selectedSubCategories);
  }, []);

  const handleSubCategoryChange = (subCategory: string, checked: boolean) => {
    setSelectedSubCategories(prev => {
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
    <div className="flex h-screen">
      {/* Main content area */}
      <div className="flex-1 p-6">
        <Map
          token={MAPBOX_TOKEN}
          selectedCategories={selectedSubCategories}
          selectedProvince={selectedProvince}
          selectedOffice={selectedOffice}
        />
      </div>

      {/* Right sidebar - Updated with better overflow handling */}
      <div className="w-80 border-l border-gray-200 bg-gray-50 flex flex-col h-full">
        <div className="flex-1 overflow-y-auto">
          <FilterPanel
            selectedSubCategories={selectedSubCategories}
            onSubCategoryChange={handleSubCategoryChange}
            selectedProvince={selectedProvince}
            onProvinceChange={setSelectedProvince}
            selectedOffice={selectedOffice}
            onOfficeChange={setSelectedOffice}
            provinces={PROVINCES}
            onDateRangeChange={(range) => {
              setDateRange(range);
              console.log('Date range updated:', range);
            }}
          />
        </div>
      </div>
    </div>
  );
} 
