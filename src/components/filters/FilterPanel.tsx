import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CategoryName, SubCategories } from '@/types/processed-post';

interface FilterPanelProps {
  selectedSubCategories: string[];
  onSubCategoryChange: (subCategory: string, checked: boolean) => void;
  provinces: string[];
  selectedProvince: string | null;
  onProvinceChange: (province: string | null) => void;
  selectedOffice: string | null;
  onOfficeChange: (office: string | null) => void;
}

export function FilterPanel({
  selectedSubCategories,
  onSubCategoryChange,
  provinces,
  selectedProvince,
  onProvinceChange,
  selectedOffice,
  onOfficeChange,
}: FilterPanelProps) {
  return (
    <div className="p-4">
      <div className="space-y-4">
        {Object.values(CategoryName).map((category) => (
          <div key={category} className="bg-white rounded-lg p-4">
            <h3 className="text-base font-medium mb-4">{category}</h3>
            <div className="flex items-center space-x-2 mb-2">
              <Checkbox
                id={`${category}-all`}
                checked={SubCategories[category].every(subCategory => selectedSubCategories.includes(subCategory))}
                onCheckedChange={(checked) => {
                  SubCategories[category].forEach(subCategory => {
                    onSubCategoryChange(subCategory, checked as boolean);
                  });
                }}
              />
              <label htmlFor={`${category}-all`} className="text-sm">
                ทั้งหมด
              </label>
            </div>
            {SubCategories[category].map((subCategory) => (
              <div key={subCategory} className="flex items-center space-x-2 mb-2">
                <Checkbox
                  id={subCategory}
                  checked={selectedSubCategories.includes(subCategory)}
                  onCheckedChange={(checked) => onSubCategoryChange(subCategory, checked as boolean)}
                />
                <label htmlFor={subCategory} className="text-sm">
                  {subCategory}
                </label>
              </div>
            ))}
          </div>
        ))}
        <div className="bg-white rounded-lg p-4">
          <h3 className="text-base font-medium mb-4">จังหวัด</h3>
          <Select value={selectedProvince || "all"} onValueChange={(value) => onProvinceChange(value === "all" ? null : value)}>
            <SelectTrigger aria-label="จังหวัด">
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
      </div>
    </div>
  );
} 