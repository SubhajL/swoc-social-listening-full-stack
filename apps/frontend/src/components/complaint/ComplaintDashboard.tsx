import { useState } from "react";
import { useComplaints } from "@/hooks/useComplaints";
import { CategoryState } from "@/types/complaint";
import { FilterSection } from "./FilterSection";
import { MapSection } from "./MapSection";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardNavigation } from "./DashboardNavigation";

const ComplaintDashboard = () => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [categoryStates, setCategoryStates] = useState<CategoryState>({
    "ข้อร้องเรียน": false,
    "การสนับสนุน": false,
    "การขอข้อมูล": false
  });

  const { data: complaints, isLoading } = useComplaints({
    categories: selectedCategories,
    province: selectedProvince
  });

  const handleCategoryChange = (category: string) => {
    setCategoryStates(prev => {
      const newState = { ...prev, [category]: !prev[category] };
      const selectedCats = Object.entries(newState)
        .filter(([_, isSelected]) => isSelected)
        .map(([cat]) => cat);
      setSelectedCategories(selectedCats);
      return newState;
    });
  };

  const handleProvinceChange = (thaiProvince: string) => {
    const englishProvince = thaiProvince === "ทุกจังหวัด" ? null : thaiProvince;
    setSelectedProvince(englishProvince);
  };

  return (
    <div className="min-h-screen bg-[#F0F8FF] flex flex-col">
      <DashboardHeader />
      
      <div className="flex-1 flex">
        <MapSection 
          complaints={complaints}
          isLoading={isLoading}
          selectedCategories={selectedCategories}
          selectedProvince={selectedProvince}
        />
        <FilterSection
          categoryStates={categoryStates}
          onCategoryChange={handleCategoryChange}
          onProvinceChange={handleProvinceChange}
        />
      </div>

      <DashboardNavigation />
    </div>
  );
};

export default ComplaintDashboard;