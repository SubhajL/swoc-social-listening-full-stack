import { useState } from 'react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface RainDataSourceSelectorProps {
  className?: string;
}

const RainDataSourceSelector = ({ className }: RainDataSourceSelectorProps) => {
  const [selectedSource, setSelectedSource] = useState<string>("all");

  return (
    <div className={className}>
      <RadioGroup
        defaultValue="all"
        value={selectedSource}
        onValueChange={setSelectedSource}
        className="flex flex-col space-y-1"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="all" id="all" />
          <Label htmlFor="all">ทุกแหล่งข้อมูล</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="tmd" id="tmd" />
          <Label htmlFor="tmd">กรมอุตุนิยมวิทยา (TMD)</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="hii" id="hii" />
          <Label htmlFor="hii">สถาบันสารสนเทศทรัพยากรน้ำ (HII)</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="thaiwater" id="thaiwater" />
          <Label htmlFor="thaiwater">ThaiWater</Label>
        </div>
      </RadioGroup>
    </div>
  );
};

export default RainDataSourceSelector; 