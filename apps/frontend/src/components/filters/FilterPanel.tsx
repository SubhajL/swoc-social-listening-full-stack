import { useState, useEffect } from "react";
import { CategoryName, SubCategories } from "@/types/processed-post";
import { IrrigationOfficeFilter } from "./IrrigationOfficeFilter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface FilterPanelProps {
  selectedCategories: string[];
  setSelectedCategories: (categories: string[]) => void;
  selectedProvince: string | null;
  setSelectedProvince: (province: string | null) => void;
  selectedOffice: string | null;
  setSelectedOffice: (office: string | null) => void;
  provinces: string[];
  onDateRangeChange?: (range: { start: string; end: string }) => void;
}

export function FilterPanel({
  selectedCategories,
  setSelectedCategories,
  selectedProvince,
  setSelectedProvince,
  selectedOffice,
  setSelectedOffice,
  provinces,
  onDateRangeChange
}: FilterPanelProps) {
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });

  // Update parent component when date range changes
  useEffect(() => {
    if (onDateRangeChange) {
      onDateRangeChange(dateRange);
    }
  }, [dateRange, onDateRangeChange]);

  const isAllSelected = (category: CategoryName) => {
    const subcategories = SubCategories[category].filter(sub => sub !== 'All');
    const selectedCount = subcategories.filter(sub => 
      selectedCategories.includes(sub)
    ).length;
    return selectedCount === subcategories.length;
  };

  const handleAllChange = (category: CategoryName, checked: boolean) => {
    const subcategories = SubCategories[category].filter(sub => sub !== 'All');
    if (checked) {
      setSelectedCategories([...selectedCategories, ...subcategories]);
    } else {
      setSelectedCategories(selectedCategories.filter(cat => !subcategories.includes(cat)));
    }
  };

  const handleCategoryChange = (subCategory: string, checked: boolean) => {
    if (checked) {
      setSelectedCategories([...selectedCategories, subCategory]);
    } else {
      setSelectedCategories(selectedCategories.filter(cat => cat !== subCategory));
    }
  };

  const renderCategory = (category: CategoryName, title: string) => (
    <div key={category} className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox 
            id={`${category}-all`}
            checked={isAllSelected(category)}
            onCheckedChange={(checked) => handleAllChange(category, checked === true)}
            className="h-4 w-4 rounded-sm border-gray-300"
          />
          <label htmlFor={`${category}-all`} className="text-base">ทั้งหมด</label>
        </div>
        <div className="text-xl font-medium -mt-1 mb-2">{title}</div>
        <div className="ml-7 space-y-2 mt-2">
          {SubCategories[category]
            .filter(sub => sub !== 'All')
            .map(subCategory => (
              <div key={subCategory} className="flex items-center space-x-2">
                <Checkbox
                  id={`${category}-${subCategory}`}
                  checked={selectedCategories.includes(subCategory)}
                  onCheckedChange={(checked) => handleCategoryChange(subCategory, checked === true)}
                  className="h-4 w-4 rounded-sm border-gray-300"
                />
                <label htmlFor={`${category}-${subCategory}`} className="text-sm text-gray-700">{subCategory}</label>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col space-y-4 p-6 overflow-y-auto">
      <div className="space-y-4">
        {renderCategory(CategoryName.REPORT_INCIDENT, "การรายงานและแจ้งเหตุ")}
        {renderCategory(CategoryName.REQUEST_SUPPORT, "การขอการสนับสนุน")}
        {renderCategory(CategoryName.REQUEST_INFO, "การขอข้อมูล")}
        {renderCategory(CategoryName.SUGGESTION, "ข้อเสนอแนะ")}
      </div>

      {/* Date Range */}
      <div className="bg-white rounded-2xl p-6">
        <h3 className="text-lg font-medium mb-4">การตั้งค่าช่วงวันที่</h3>
        <div className="flex items-center space-x-3">
          <div className="flex-1">
            <input 
              type="date" 
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="เลือกวันที่"
            />
          </div>
          <span className="text-gray-500">-</span>
          <div className="flex-1">
            <input 
              type="date" 
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="เลือกวันที่"
            />
          </div>
        </div>
      </div>

      {/* Province Selection */}
      <div className="bg-[#8B5CF6] text-white rounded-2xl p-6" data-testid="province-select">
        <Select
          value={selectedProvince || "all"}
          onValueChange={(value) => setSelectedProvince(value === "all" ? null : value)}
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
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-medium mb-4">สำนักงานชลประทาน</h3>
        <IrrigationOfficeFilter
          selectedOffice={selectedOffice}
          onOfficeChange={setSelectedOffice}
        />
      </div>
    </div>
  );
} 
