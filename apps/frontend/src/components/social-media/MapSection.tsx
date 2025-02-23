import React from "react";
import DynamicMap from "@/components/lovable/molecules/map/DynamicMap";

export const MapSection: React.FC = () => {
  return (
    <div className="relative w-full h-[400px] bg-white rounded-lg shadow-sm">
      <DynamicMap />
    </div>
  );
};
