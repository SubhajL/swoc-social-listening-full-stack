import { CategoryName, SubCategories } from "@/types/processed-post";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SubCategoryFilterProps {
  category: CategoryName | null;
  selectedSubCategory: string | null;
  onSubCategoryChange: (subCategory: string | null) => void;
}

export function SubCategoryFilter({
  category,
  selectedSubCategory,
  onSubCategoryChange,
}: SubCategoryFilterProps) {
  if (!category) return null;

  // Filter out duplicate "ทั้งหมด" from the subcategories array
  const subcategories = SubCategories[category].filter((sub, index, arr) => {
    if (sub === 'ทั้งหมด') {
      return arr.indexOf(sub) === index;
    }
    return true;
  });

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">หมวดหมู่ย่อย</label>
      <Select
        value={selectedSubCategory || "all"}
        onValueChange={(value) => onSubCategoryChange(value === "all" ? null : value)}
      >
        <SelectTrigger aria-label="หมวดหมู่ย่อย">
          <SelectValue placeholder="เลือกหมวดหมู่ย่อย" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">ทั้งหมด</SelectItem>
          {subcategories.filter(sub => sub !== 'ทั้งหมด').map((subCategory) => (
            <SelectItem key={subCategory} value={subCategory}>
              {subCategory}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
} 