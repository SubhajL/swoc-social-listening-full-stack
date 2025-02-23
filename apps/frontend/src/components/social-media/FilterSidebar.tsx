import React from "react";
import { FilterSection } from "@/types/social-media";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FilterSidebarProps {
  filters: FilterSection[];
  onFilterChange: (filterId: string, value: string) => void;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  onFilterChange,
}) => {
  return (
    <div className="w-64 bg-white p-4 border-r">
      <h2 className="text-lg font-semibold mb-4">ตัวกรอง</h2>
      <div className="space-y-4">
        {filters.map((section) => (
          <div key={section.id} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {section.title}
            </label>
            <Select
              onValueChange={(value) => onFilterChange(section.id, value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="เลือก..." />
              </SelectTrigger>
              <SelectContent>
                {section.options.map((option) => (
                  <SelectItem key={option.id} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
};
