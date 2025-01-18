import { useState } from "react";
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
          onCategoryChange={setSelectedCategory}
          selectedSubCategory={selectedSubCategory}
          onSubCategoryChange={setSelectedSubCategory}
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