import { IrrigationOffices } from "@/types/processed-post";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface IrrigationOfficeFilterProps {
  selectedOffice: string | null;
  onOfficeChange: (office: string | null) => void;
}

export function IrrigationOfficeFilter({
  selectedOffice,
  onOfficeChange,
}: IrrigationOfficeFilterProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">สำนักงานชลประทาน</label>
      <Select
        value={selectedOffice || "all"}
        onValueChange={(value) => onOfficeChange(value === "all" ? null : value)}
      >
        <SelectTrigger aria-label="สำนักงานชลประทาน">
          <SelectValue placeholder="เลือกสำนักงานชลประทาน" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">ทั้งหมด</SelectItem>
          {IrrigationOffices.map((office) => (
            <SelectItem key={office} value={office}>
              {office}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
} 