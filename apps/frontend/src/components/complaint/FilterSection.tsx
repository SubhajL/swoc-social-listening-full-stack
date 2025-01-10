import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { FilterCard } from "@/components/map/FilterCard";
import { ProvinceSelect } from "@/components/map/ProvinceSelect";
import { FilterSectionProps } from "@/types/complaint";

const categories = [
  { id: "complaints", name: "ข้อร้องเรียน" },
  { id: "support", name: "การสนับสนุน" },
  { id: "info", name: "การขอข้อมูล" }
] as const;

export const FilterSection = ({
  categoryStates,
  onCategoryChange,
  onProvinceChange
}: FilterSectionProps) => {
  return (
    <div className="w-80 p-4 space-y-4">
      {categories.map(({ name }) => (
        <FilterCard
          key={name}
          name={name}
          isChecked={categoryStates[name]}
          onCheckedChange={() => onCategoryChange(name)}
        />
      ))}

      <Card className="p-4">
        <h3 className="font-medium mb-3">การตั้งค่าช่วงวันที่</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="flex-1">
            <Calendar className="w-4 h-4 mr-2" />
            วันที่
          </Button>
          <span>-</span>
          <Button variant="outline" className="flex-1">
            <Calendar className="w-4 h-4 mr-2" />
            วันที่
          </Button>
        </div>
      </Card>

      <ProvinceSelect onProvinceChange={onProvinceChange} />
    </div>
  );
};