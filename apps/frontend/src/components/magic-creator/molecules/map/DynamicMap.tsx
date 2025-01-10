import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// Dynamically import Map component with no SSR
const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <Skeleton className="w-full h-full min-h-[400px] rounded-lg" />
  ),
});

interface DynamicMapProps {
  token: string;
  selectedCategories: string[];
  selectedProvince: string | null;
}

export const DynamicMap = ({ token, selectedCategories, selectedProvince }: DynamicMapProps) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <Skeleton className="w-full h-full min-h-[400px] rounded-lg" />;
  }

  return (
    <Map
      token={token}
      selectedCategories={selectedCategories}
      selectedProvince={selectedProvince}
    />
  );
};
