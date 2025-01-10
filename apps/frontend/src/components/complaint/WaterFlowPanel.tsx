import { Card } from "@/components/ui/card";
import { Layers } from "lucide-react";

export const WaterFlowPanel = () => {
  return (
    <div className="h-full">
      <div className="flex items-center gap-2 mb-4">
        <Layers className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-lg">แผนผังการส่งน้ำ</h2>
      </div>
      
      <Card className="p-4 h-[calc(100%-2rem)]">
        <div className="h-full bg-gray-100 rounded-lg flex items-center justify-center">
          <span className="text-muted">Water Flow Diagram</span>
        </div>
      </Card>
    </div>
  );
};