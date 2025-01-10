import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

interface FilterCardProps {
  name: string;
  isChecked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export const FilterCard = ({ name, isChecked, onCheckedChange }: FilterCardProps) => {
  return (
    <Card className="p-4">
      <h3 className="font-medium mb-3">{name}</h3>
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox 
            id={`${name}-all`}
            checked={isChecked}
            onCheckedChange={() => onCheckedChange(!isChecked)}
          />
          <label htmlFor={`${name}-all`} className="text-sm">
            ทั้งหมด
          </label>
        </div>
      </div>
    </Card>
  );
};
