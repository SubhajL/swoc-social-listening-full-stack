import { useState, useCallback, useEffect } from "react";
import { Map } from "@/components/Map";
import { FilterPanel } from "@/components/filters/FilterPanel";
import { CategoryName, SubCategories } from "@/types/processed-post";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// This would typically come from an API
const PROVINCES = [
  "กรุงเทพมหานคร",
  "นนทบุรี",
  "ปทุมธานี",
  // ... add more provinces
];

// Categories to show by default
const DEFAULT_CATEGORIES = [
  CategoryName.REPORT_INCIDENT,
  CategoryName.REQUEST_SUPPORT,
  CategoryName.REQUEST_INFO
];

// Get first subcategory for each category
const getFirstSubCategories = () => {
  return DEFAULT_CATEGORIES.map(category => {
    const subs = SubCategories[category].filter(sub => sub !== 'ทั้งหมด');
    return subs[0];
  }).filter(Boolean) as string[];
};

export function MainPage() {
  const [selectedSubCategories, setSelectedSubCategories] = useState<string[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [selectedOffice, setSelectedOffice] = useState<string | null>(null);

  // Initialize with first subcategory from each category
  useEffect(() => {
    setSelectedSubCategories(getFirstSubCategories());
  }, []);

  const handleSubCategoryChange = useCallback((subCategory: string, checked: boolean) => {
    setSelectedSubCategories(prev => {
      if (checked) {
        return [...prev, subCategory];
      } else {
        return prev.filter(sc => sc !== subCategory);
      }
    });
  }, []);

  return (
    <div className="flex h-screen">
      {/* Main content area */}
      <div className="flex-1 p-6">
        <Map
          token={MAPBOX_TOKEN}
          selectedCategories={[]} // No category selection needed
          selectedProvince={selectedProvince}
          selectedOffice={selectedOffice}
        />
      </div>

      {/* Right sidebar */}
      <div className="w-80 border-l border-gray-200">
        <FilterPanel
          selectedSubCategories={selectedSubCategories}
          onSubCategoryChange={handleSubCategoryChange}
          selectedProvince={selectedProvince}
          onProvinceChange={setSelectedProvince}
          selectedOffice={selectedOffice}
          onOfficeChange={setSelectedOffice}
          provinces={PROVINCES}
        />
      </div>
    </div>
  );
} 