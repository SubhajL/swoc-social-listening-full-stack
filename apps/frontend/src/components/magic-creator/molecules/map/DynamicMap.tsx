import { useEffect, useState, lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryName } from "@/types/processed-post";

// Dynamically import Map component with lazy loading
const Map = lazy(() => import("@/components/Map"));

interface DynamicMapProps {
  token: string;
  selectedCategories: CategoryName[];
  selectedProvince: string | null;
  selectedAmphure?: string | null;
  selectedTumbon?: string | null;
  selectedOffice?: string | null;
  dateRange?: { start: string; end: string };
}

export const DynamicMap = ({ 
  token, 
  selectedCategories, 
  selectedProvince,
  selectedAmphure = null,
  selectedTumbon = null,
  selectedOffice = null,
  dateRange = { start: '', end: '' }
}: DynamicMapProps) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <Skeleton className="w-full h-full min-h-[400px] rounded-lg" />;
  }

  return (
    <Suspense fallback={<Skeleton className="w-full h-full min-h-[400px] rounded-lg" />}>
      <Map
        token={token}
        selectedCategories={selectedCategories}
        selectedProvince={selectedProvince}
        selectedAmphure={selectedAmphure}
        selectedTumbon={selectedTumbon}
        selectedOffice={selectedOffice}
        dateRange={dateRange}
      />
    </Suspense>
  );
};
