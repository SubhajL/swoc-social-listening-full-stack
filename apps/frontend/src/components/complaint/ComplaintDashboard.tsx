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
  const [selectedOffice, setSelectedOffice] = useState<string | null>(null);
  const [categoryStates, setCategoryStates] = useState<CategoryState>({
    "การรายงานและแจ้งเหตุ": false,
    "การขอการสนับสนุน": false,
    "การขอข้อมูล": false,
    "ข้อเสนอแนะ": false
  });

  const { data: complaints, isLoading } = useComplaints({
    categories: selectedCategories,
    province: selectedProvince,
    office: selectedOffice
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

  const handleOfficeChange = (office: string) => {
    const selectedOffice = office === "ทั้งหมด" ? null : office;
    setSelectedOffice(selectedOffice);
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
          selectedOffice={selectedOffice}
        />
        <FilterSection
          categoryStates={categoryStates}
          onCategoryChange={handleCategoryChange}
          onProvinceChange={handleProvinceChange}
          onOfficeChange={handleOfficeChange}
        />
      </div>

      <DashboardNavigation />
    </div>
  );
};

export default ComplaintDashboard;