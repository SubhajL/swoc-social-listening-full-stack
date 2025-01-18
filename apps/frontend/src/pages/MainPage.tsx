import { useState, useCallback } from "react";
import { Map } from "@/components/Map";
import { FilterPanel } from "@/components/filters/FilterPanel";
import { CategoryName } from "@/types/processed-post";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// This would typically come from an API
const PROVINCES = [
  "กรุงเทพมหานคร",
  "นนทบุรี",
  "ปทุมธานี",
  // ... add more provinces
];

export function MainPage() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryName | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [selectedOffice, setSelectedOffice] = useState<string | null>(null);

  const handleCategoryChange = useCallback((category: CategoryName | null) => {
    if (category === selectedCategory) {
      // If clicking the same category, deselect it
      setSelectedCategory(null);
    } else {
      setSelectedCategory(category);
    }
    // Reset subcategory when category changes
    setSelectedSubCategory(null);
  }, [selectedCategory]);

  const handleSubCategoryChange = useCallback((subCategory: string | null) => {
    if (subCategory === selectedSubCategory) {
      // If clicking the same subcategory, deselect it
      setSelectedSubCategory(null);
    } else {
      setSelectedSubCategory(subCategory);
    }
  }, [selectedSubCategory]);

  return (
    <div className="flex h-screen">
      {/* Main content area */}
      <div className="flex-1 p-6">
        <Map
          token={MAPBOX_TOKEN}
          selectedCategories={selectedCategory ? [selectedCategory] : []}
          selectedProvince={selectedProvince}
          selectedOffice={selectedOffice}
        />
      </div>

      {/* Right sidebar */}
      <div className="w-80 border-l border-gray-200">
        <FilterPanel
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
          selectedSubCategory={selectedSubCategory}
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