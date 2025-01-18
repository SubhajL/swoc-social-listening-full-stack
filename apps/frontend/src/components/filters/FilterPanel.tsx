import { CategoryName, SubCategories } from "@/types/processed-post";
import { IrrigationOfficeFilter } from "./IrrigationOfficeFilter";
import { SubCategoryFilter } from "./SubCategoryFilter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
      <div className="space-y-2">
        <label className="text-sm font-medium">หมวดหมู่</label>
        <Select
          value={selectedCategory || ""}
          onValueChange={(value) => onCategoryChange(value ? value as CategoryName : null)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="เลือกหมวดหมู่" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(CategoryName).map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedCategory && (
        <SubCategoryFilter
          category={selectedCategory}
          selectedSubCategory={selectedSubCategory}
          onSubCategoryChange={onSubCategoryChange}
        />
      )}

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

      <IrrigationOfficeFilter
        selectedOffice={selectedOffice}
        onOfficeChange={onOfficeChange}
      />
    </div>
  );
} 