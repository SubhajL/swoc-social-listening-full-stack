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

  const renderCategory = (category: CategoryName, title: string) => (
    <div key={category} className="bg-white rounded-xl p-6">
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox 
            id={`${category}-all`}
            checked={isAllSelected(category)}
            onCheckedChange={(checked) => handleAllChange(category, checked === true)}
            className="h-5 w-5 rounded-sm border-gray-300"
          />
          <label htmlFor={`${category}-all`} className="text-lg font-medium">{title}</label>
        </div>
        <div className="ml-7 space-y-3">
          {SubCategories[category]
            .filter(sub => sub !== 'All')
            .map(subCategory => (
              <div key={subCategory} className="flex items-center space-x-2">
                <Checkbox
                  id={`${category}-${subCategory}`}
                  checked={selectedSubCategories.includes(subCategory)}
                  onCheckedChange={(checked) => onSubCategoryChange(subCategory, checked === true)}
                  className="h-4 w-4 rounded-sm border-gray-300"
                />
                <label htmlFor={`${category}-${subCategory}`} className="text-base text-gray-600">{subCategory}</label>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );

  // Temporary debug logging
  console.log('FilterPanel render:', {
    categories: Object.keys(SubCategories),
    subcategoriesExample: SubCategories[CategoryName.REPORT_INCIDENT],
    selectedSubCategories
  });

  return (
    <div className="flex flex-col space-y-6 p-4">
      <div className="space-y-2">
        {renderCategory(CategoryName.REPORT_INCIDENT, "การรายงานและแจ้งเหตุ")}
        {renderCategory(CategoryName.REQUEST_SUPPORT, "การขอการสนับสนุน")}
        {renderCategory(CategoryName.REQUEST_INFO, "การขอข้อมูล")}
        {renderCategory(CategoryName.SUGGESTION, "ข้อเสนอแนะ")}
      </div>

      {/* Date Range */}
      <div className="bg-white rounded-xl p-6">
        <h3 className="text-lg font-medium mb-4">การตั้งค่าช่วงวันที่</h3>
        <div className="flex items-center space-x-3">
          <div className="flex-1">
            <input type="date" className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
          </div>
          <span className="text-gray-500">-</span>
          <div className="flex-1">
            <input type="date" className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
          </div>
        </div>
      </div>

      {/* Province Selection */}
      <div className="bg-[#8B5CF6] text-white rounded-xl p-6">
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
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-medium mb-4">สำนักงานชลประทาน</h3>
        <IrrigationOfficeFilter
          selectedOffice={selectedOffice}
          onOfficeChange={onOfficeChange}
        />
      </div>
    </div>
  );
} 
