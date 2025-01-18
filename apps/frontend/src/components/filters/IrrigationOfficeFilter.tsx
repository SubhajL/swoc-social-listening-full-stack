import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IrrigationOffices, IrrigationOffice } from "@/types/processed-post";

interface IrrigationOfficeFilterProps {
  selectedOffice: string | null;
  onOfficeChange: (office: string | null) => void;
}

export function IrrigationOfficeFilter({ selectedOffice, onOfficeChange }: IrrigationOfficeFilterProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">สำนักงานชลประทาน</label>
      <Select
        value={selectedOffice || ""}
        onValueChange={(value) => onOfficeChange(value || null)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="เลือกสำนักงานชลประทาน" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">ทั้งหมด</SelectItem>
          {IrrigationOffices.map((office: IrrigationOffice) => (
            <SelectItem key={office} value={office}>
              {office}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
} 