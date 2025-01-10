import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { provinceMapping } from "@/utils/provinces";

interface ProvinceSelectProps {
  onProvinceChange: (province: string) => void;
}

export const ProvinceSelect = ({ onProvinceChange }: ProvinceSelectProps) => {
  const thaiProvinces = ["ทุกจังหวัด", ...Object.keys(provinceMapping).sort()];

  return (
    <Select onValueChange={onProvinceChange} defaultValue="ทุกจังหวัด">
      <SelectTrigger className="w-full bg-[#9b87f5] text-white">
        <SelectValue placeholder="จังหวัด" />
      </SelectTrigger>
      <SelectContent className="max-h-[300px] bg-[#9b87f5] border-none">
        {thaiProvinces.map((province) => (
          <SelectItem 
            key={province} 
            value={province}
            className="text-white hover:bg-[#7E69AB] focus:bg-[#7E69AB] cursor-pointer"
          >
            {province}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
