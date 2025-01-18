import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { IrrigationOffices } from "@/types/processed-post";

interface IrrigationOfficeSelectProps {
  onOfficeChange: (office: string) => void;
}

export const IrrigationOfficeSelect = ({ onOfficeChange }: IrrigationOfficeSelectProps) => {
  return (
    <Card className="p-4">
      <h3 className="font-medium mb-3">สำนักงานชลประทาน</h3>
      <Select onValueChange={onOfficeChange}>
        <SelectTrigger>
          <SelectValue placeholder="เลือกสำนักงานชลประทาน" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ทั้งหมด">ทั้งหมด</SelectItem>
          {IrrigationOffices.map((office) => (
            <SelectItem key={office} value={office}>
              {office}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Card>
  );
}; 