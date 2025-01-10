import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { MapProps } from "@/types/map";

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <Skeleton className="w-full h-full min-h-[400px] rounded-lg" />
  ),
});

export const DynamicMap = ({ token, selectedCategories, selectedProvince }: MapProps) => {
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