import { useQuery } from "@tanstack/react-query";
import { cleanLocationString } from "@/lib/location-utils";

export interface Reservoir {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  capacity?: number;
  current_volume?: number;
  percent_full?: number;
  updated_at?: string;
}

export interface ReservoirsResponse {
  reservoirs: Reservoir[];
  error?: string;
}

export const fetchReservoirs = async (
  amphure?: string,
  province?: string
): Promise<ReservoirsResponse> => {
  console.log(
    `[fetchReservoirs] Attempting to fetch reservoirs for:`,
    { amphure, province }
  );
  
  // Clean location strings for API request
  const cleanedAmphure = cleanLocationString(amphure);
  const cleanedProvince = cleanLocationString(province);
  
  console.log(
    `[fetchReservoirs] Using cleaned location values:`,
    { cleanedAmphure, cleanedProvince }
  );

  try {
    // Construct URL with query parameters
    const url = new URL(`${import.meta.env.VITE_API_URL}/api/reservoirs`);
    
    if (cleanedAmphure) {
      url.searchParams.append("amphure", cleanedAmphure);
    }
    
    if (cleanedProvince) {
      url.searchParams.append("province", cleanedProvince);
    }

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Failed to fetch reservoirs: ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log(
      `[fetchReservoirs] Successfully fetched ${data.reservoirs.length} reservoirs for:`,
      { cleanedAmphure, cleanedProvince }
    );

    return {
      reservoirs: data.reservoirs,
    };
  } catch (error) {
    console.error("Error fetching reservoirs:", error);
    return {
      reservoirs: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const useReservoirs = (amphure?: string, province?: string) => {
  return useQuery({
    queryKey: ["reservoirs", cleanLocationString(amphure), cleanLocationString(province)],
    queryFn: () => fetchReservoirs(amphure, province),
    enabled: Boolean(amphure || province),
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}; 