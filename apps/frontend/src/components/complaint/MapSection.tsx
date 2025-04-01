import Map from "@/components/Map";
import { MapSectionProps } from "@/types/complaint";
import { getMapboxToken } from "@/utils/mapbox";
import { CategoryName } from "@/types/processed-post";
import ErrorBoundary from "@/components/error-boundary/ErrorBoundary";
import MapError from "@/components/map/MapError";

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

  // Create a default date range for the last 30 days
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);
  
  const defaultDateRange = {
    start: thirtyDaysAgo.toISOString().split('T')[0], // Format as YYYY-MM-DD
    end: today.toISOString().split('T')[0] // Format as YYYY-MM-DD
  };

  // Convert string categories to CategoryName enum
  const categoryEnums = selectedCategories.map(cat => {
    // Find matching CategoryName or default to UNKNOWN
    const matchedCategory = Object.values(CategoryName).find(
      enumValue => enumValue === cat
    );
    return matchedCategory || CategoryName.UNKNOWN;
  });

  return (
    <div className="flex-1 p-4">
      <div className="h-full rounded-lg overflow-hidden border border-gray-200">
        <ErrorBoundary fallback={<MapError message="เกิดข้อผิดพลาดในการโหลดแผนที่" />}>
          <Map 
            token={getMapboxToken()}
            selectedCategories={categoryEnums}
            selectedProvince={selectedProvince}
            selectedAmphure={selectedAmphure}
            selectedTumbon={selectedTumbon}
            selectedOffice={selectedOffice}
            dateRange={defaultDateRange}
          />
        </ErrorBoundary>
      </div>
    </div>
  );
};