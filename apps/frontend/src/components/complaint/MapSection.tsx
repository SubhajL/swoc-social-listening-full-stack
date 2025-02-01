import Map from "@/components/Map";
import { MapSectionProps } from "@/types/complaint";
import { getMapboxToken } from "@/utils/mapbox";

export const MapSection = ({
  complaints,
  isLoading,
  selectedCategories,
  selectedProvince,
  selectedAmphure = null,
  selectedTumbon = null,
  selectedOffice = null
}: MapSectionProps) => {
  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex-1 p-4">
      <div className="h-full rounded-lg overflow-hidden border border-gray-200">
        <Map 
          token={getMapboxToken()}
          selectedCategories={selectedCategories}
          selectedProvince={selectedProvince}
          selectedAmphure={selectedAmphure}
          selectedTumbon={selectedTumbon}
          selectedOffice={selectedOffice}
        />
      </div>
    </div>
  );
};