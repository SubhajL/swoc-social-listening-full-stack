import { CategoryName, SubCategories } from "@/types/processed-post";
import { IrrigationOfficeFilter } from "./IrrigationOfficeFilter";
import { SubCategoryFilter } from "./SubCategoryFilter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface FilterPanelProps {
  selectedCategory: CategoryName | null;
  onCategoryChange: (category: CategoryName | null) => void;
  selectedSubCategory: string | null;
  onSubCategoryChange: (subCategory: string | null) => void;
  selectedProvince: string | null;
  onProvinceChange: (province: string | null) => void;
  selectedOffice: string | null;
  onOfficeChange: (office: string | null) => void;
  provinces: string[];
}

export function FilterPanel({
  selectedCategory,
  onCategoryChange,
  selectedSubCategory,
  onSubCategoryChange,
  selectedProvince,
  onProvinceChange,
  selectedOffice,
  onOfficeChange,
  provinces
}: FilterPanelProps) {
  return (
    <div className="space-y-6 p-6 bg-white rounded-lg shadow">
      {/* Categories and Subcategories */}
      {Object.values(CategoryName).map((category) => (
        <div key={category} className="space-y-2">
          <h3 className="text-sm font-medium">{category}</h3>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id={`${category}-all`}
                checked={selectedCategory === category}
                onCheckedChange={(checked) => onCategoryChange(checked ? category : null)}
              />
              <label htmlFor={`${category}-all`} className="text-sm">ทั้งหมด</label>
            </div>
            {SubCategories[category].slice(1).map((subCategory) => (
              <div key={subCategory} className="flex items-center space-x-2 pl-6">
                <Checkbox 
                  id={`${category}-${subCategory}`}
                  checked={selectedSubCategory === subCategory}
                  onCheckedChange={(checked) => onSubCategoryChange(checked ? subCategory : null)}
                />
                <label htmlFor={`${category}-${subCategory}`} className="text-sm">{subCategory}</label>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Province Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium">จังหวัด</label>
        <Select
          value={selectedProvince || ""}
          onValueChange={(value) => onProvinceChange(value || null)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="เลือกจังหวัด" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">ทั้งหมด</SelectItem>
            {provinces.map((province) => (
              <SelectItem key={province} value={province}>
                {province}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Irrigation Office Filter */}
      <IrrigationOfficeFilter
        selectedOffice={selectedOffice}
        onOfficeChange={onOfficeChange}
      />
    </div>
  );
} 