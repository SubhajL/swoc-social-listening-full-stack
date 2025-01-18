import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoryName, SubCategories } from "@/types/processed-post";

interface SubCategoryFilterProps {
  category: CategoryName | null;
  selectedSubCategory: string | null;
  onSubCategoryChange: (subCategory: string | null) => void;
}

export function SubCategoryFilter({ 
  category, 
  selectedSubCategory, 
  onSubCategoryChange 
}: SubCategoryFilterProps) {
  if (!category) return null;

  const subCategories = SubCategories[category];

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">หมวดหมู่ย่อย</label>
      <Select
        value={selectedSubCategory || ""}
        onValueChange={(value) => onSubCategoryChange(value || null)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="เลือกหมวดหมู่ย่อย" />
        </SelectTrigger>
        <SelectContent>
          {subCategories.map((subCategory) => (
            <SelectItem key={subCategory} value={subCategory}>
              {subCategory}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
} 