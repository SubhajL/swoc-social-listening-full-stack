import { CategoryName, SubCategories } from "@/types/processed-post";
import { IrrigationOfficeFilter } from "./IrrigationOfficeFilter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

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
  const isAllSelected = (category: CategoryName) => {
    const subcategories = SubCategories[category].filter(sub => sub !== 'All');
    const selectedCount = subcategories.filter(sub => 
      selectedSubCategories.includes(sub)
    ).length;
    console.log(`Category ${category} selection status:`, {
      total: subcategories.length,
      selected: selectedCount
    });
    return selectedCount === subcategories.length;
  };

  // Simplified helper function - no conditions
  const handleAllChange = (category: CategoryName, checked: boolean) => {
    const subcategories = SubCategories[category].filter(sub => sub !== 'All');
    subcategories.forEach(sub => onSubCategoryChange(sub, checked));
  };

  // Render categories unconditionally
  const renderCategory = (category: CategoryName, title: string) => (
    <div key={category} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox 
            id={`${category}-all`}
            checked={isAllSelected(category)}
            onCheckedChange={(checked) => handleAllChange(category, checked === true)}
            className="h-5 w-5 border-2"
          />
          <label htmlFor={`${category}-all`} className="font-medium text-gray-700">{title}</label>
        </div>
        <div className="pl-6 space-y-2.5">
          {SubCategories[category]
            .filter(sub => sub !== 'All')
            .map(sub => (
              <div key={sub} className="flex items-center space-x-2">
                <Checkbox 
                  id={sub}
                  checked={selectedSubCategories.includes(sub)}
                  onCheckedChange={(checked) => onSubCategoryChange(sub, checked === true)}
                  className="h-4 w-4"
                />
                <label htmlFor={sub} className="text-sm text-gray-600">{sub}</label>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col space-y-4 p-4">
      {/* Render all categories unconditionally */}
      {renderCategory(CategoryName.REPORT_INCIDENT, "การรายงานและแจ้งเหตุ")}
      {renderCategory(CategoryName.REQUEST_SUPPORT, "การขอการสนับสนุน")}
      {renderCategory(CategoryName.REQUEST_INFO, "การขอข้อมูล")}

      {/* Province Selection */}
      <div className="bg-[#8B5CF6] text-white rounded-xl p-4">
        <Select
          value={selectedProvince || "all"}
          onValueChange={(value) => onProvinceChange(value === "all" ? null : value)}
        >
          <SelectTrigger className="bg-transparent border-none text-white text-lg font-medium">
            <SelectValue placeholder="ทุกจังหวัด" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกจังหวัด</SelectItem>
            {provinces.map((province) => (
              <SelectItem key={province} value={province}>
                {province}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Irrigation Office */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="text-xl font-medium mb-3 text-gray-900">สำนักงานชลประทาน</h3>
        <IrrigationOfficeFilter
          selectedOffice={selectedOffice}
          onOfficeChange={onOfficeChange}
        />
      </div>
    </div>
  );
} 
