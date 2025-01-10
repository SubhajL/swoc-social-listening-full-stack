import Map from "@/components/Map";
import { MapSectionProps } from "@/types/complaint";

const MAPBOX_TOKEN = "pk.eyJ1Ijoic3ViaGFqIiwiYSI6ImNtNHdtdHYzMzBmY3AyanBwdW5nMmNpenAifQ.M6zea2D_TLnke3L7iwBUFg";

export const MapSection = ({
  complaints,
  isLoading,
  selectedCategories,
  selectedProvince
}: MapSectionProps) => {
  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex-1 p-4">
      <div className="h-full rounded-lg overflow-hidden border border-gray-200">
        <Map 
          token={MAPBOX_TOKEN}
          selectedCategories={selectedCategories}
          selectedProvince={selectedProvince}
        />
      </div>
    </div>
  );
};