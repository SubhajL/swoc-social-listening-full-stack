import { CategoryName, SubCategories } from "@/types/processed-post";
import { IrrigationOfficeFilter } from "./IrrigationOfficeFilter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useEffect } from "react";

interface FilterPanelProps {
  selectedSubCategories: string[];
  onSubCategoryChange: (subCategory: string, checked: boolean) => void;
  selectedProvince: string | null;
  onProvinceChange: (province: string | null) => void;
  selectedOffice: string | null;
  onOfficeChange: (office: string | null) => void;
  provinces: string[];
}

export function FilterPanel({
  selectedSubCategories,
  onSubCategoryChange,
  selectedProvince,
  onProvinceChange,
  selectedOffice,
  onOfficeChange,
  provinces
}: FilterPanelProps) {
  // Helper function to check if all subcategories in a category are selected (excluding "ทั้งหมด")
  const isAllSelected = (category: CategoryName) => {
    const subs = SubCategories[category].filter(sub => sub !== 'ทั้งหมด');
    return subs.every(sub => selectedSubCategories.includes(sub));
  };

  // Helper function to handle "All" checkbox changes for a specific category
  const handleAllChange = (category: CategoryName, checked: boolean) => {
    const subs = SubCategories[category].filter(sub => sub !== 'ทั้งหมด');
    if (checked) {
      // Add all subcategories that aren't already selected
      subs.forEach(sub => {
        if (!selectedSubCategories.includes(sub)) {
          onSubCategoryChange(sub, true);
        }
      });
    } else {
      // Remove all subcategories from this category
      subs.forEach(sub => {
        if (selectedSubCategories.includes(sub)) {
          onSubCategoryChange(sub, false);
        }
      });
    }
  };

  // Get the first subcategory for each category (excluding "ทั้งหมด")
  const getFirstSubCategory = (category: CategoryName) => {
    const subs = SubCategories[category].filter(sub => sub !== 'ทั้งหมด');
    return subs[0] || null;
  };

  return (
    <div className="p-4">
      <div className="space-y-6">
        {/* Only show the three main categories */}
        {[CategoryName.REPORT_INCIDENT, CategoryName.REQUEST_SUPPORT, CategoryName.REQUEST_INFO].map((category) => {
          const firstSubCategory = getFirstSubCategory(category);
          return (
            <div key={category} className="bg-white rounded-lg p-4 shadow-sm">
              <h3 className="text-base font-semibold text-gray-900 mb-4">{category}</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id={`${category}-all`}
                    checked={isAllSelected(category)}
                    onCheckedChange={(checked) => handleAllChange(category, checked === true)}
                    className="border-gray-300"
                  />
                  <label htmlFor={`${category}-all`} className="text-sm font-medium text-gray-700">ทั้งหมด</label>
                </div>
                {firstSubCategory && (
                  <div className="flex items-center space-x-2 ml-6">
                    <Checkbox 
                      id={firstSubCategory}
                      checked={selectedSubCategories.includes(firstSubCategory)}
                      onCheckedChange={(checked) => onSubCategoryChange(firstSubCategory, checked === true)}
                      className="border-gray-300"
                    />
                    <label htmlFor={firstSubCategory} className="text-sm text-gray-600">{firstSubCategory}</label>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-4">จังหวัด</h3>
          <Select
            value={selectedProvince || "all"}
            onValueChange={(value) => onProvinceChange(value === "all" ? null : value)}
          >
            <SelectTrigger aria-label="จังหวัด" className="w-full">
              <SelectValue placeholder="จังหวัด" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทั้งหมด</SelectItem>
              {provinces.map((province) => (
                <SelectItem key={province} value={province}>
                  {province}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <IrrigationOfficeFilter
          selectedOffice={selectedOffice}
          onOfficeChange={onOfficeChange}
        />
      </div>
    </div>
  );
} 