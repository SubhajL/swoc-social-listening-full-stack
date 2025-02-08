import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Reservoir } from "@/types/reservoir";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface ReservoirCardProps {
  reservoir: Reservoir;
}

export const ReservoirCard = ({ reservoir }: ReservoirCardProps) => {
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{reservoir.reservoir_name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2">
            <Label>ความจุ รนก.</Label>
            <Input 
              value={reservoir.normal_storage_capacity ?? ''} 
              readOnly 
              className="max-w-[100px] h-8"
            />
            <span className="text-sm">ล้าน ลบ.ม.</span>
          </div>
          <div className="flex items-center gap-2">
            <Label>ความจุ รนก. ต่ำสุด</Label>
            <Input 
              value={reservoir.minimum_storage_capacity ?? ''} 
              readOnly 
              className="max-w-[100px] h-8"
            />
            <span className="text-sm">ล้าน ลบ.ม.</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 