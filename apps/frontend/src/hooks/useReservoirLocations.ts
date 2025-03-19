import { useQuery } from '@tanstack/react-query';
import { cleanLocationString } from '@/lib/location-utils';

export interface ReservoirLocation {
  id: number;
  reservoir_name: string;
  reservoir_lat?: string;
  reservoir_long?: string;
  agency_id?: number;
  ground_level?: number;
  left_bank?: number;
  right_bank?: number;
  is_warning?: boolean;
  province?: string;
  amphure?: string;
  tambon?: string;
  created_at?: string;
  updated_at?: string;
  data_source?: string;
  reservoir_id: string;
}

export interface ReservoirLocationsResponse {
  locations: ReservoirLocation[];
  total: number;
  error?: string;
}

/**
 * Fetches reservoir locations based on amphure and province
 * @param amphure Optional amphure name to filter by
 * @param province Optional province name to filter by
 * @returns Promise containing the reservoir locations
 */
export const fetchReservoirLocations = async (
  amphure?: string,
  province?: string
): Promise<ReservoirLocationsResponse> => {
  console.log(
    `[fetchReservoirLocations] Attempting to fetch reservoir locations:`,
    { amphure, province }
  );

  // Clean location strings for API request
  const cleanedAmphure = cleanLocationString(amphure);
  const cleanedProvince = cleanLocationString(province);
  
  console.log(
    `[fetchReservoirLocations] Using cleaned location values:`,
    { cleanedAmphure, cleanedProvince }
  );

  try {
    // Construct URL with query parameters
    const url = new URL(`${import.meta.env.VITE_API_URL}/api/reservoir-locations`);
    
    if (cleanedAmphure) {
      url.searchParams.append("amphure", cleanedAmphure);
    }
    
    if (cleanedProvince) {
      url.searchParams.append("province", cleanedProvince);
    }

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Failed to fetch reservoir locations: ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log(
      `[fetchReservoirLocations] Successfully fetched ${data.total} reservoir locations for:`,
      { cleanedAmphure, cleanedProvince }
    );

    return {
      locations: data.locations || [],
      total: data.total || 0
    };
  } catch (error) {
    console.error("Error fetching reservoir locations:", error);
    return {
      locations: [],
      total: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Hook to fetch and manage reservoir location data
 * @param amphure Optional amphure to filter by
 * @param province Optional province to filter by
 * @returns Query result with reservoir locations
 */
export const useReservoirLocations = (amphure?: string, province?: string) => {
  return useQuery({
    queryKey: ["reservoir_locations", cleanLocationString(amphure), cleanLocationString(province)],
    queryFn: () => fetchReservoirLocations(amphure, province),
    enabled: Boolean(amphure || province), // Only fetch if we have a location
    retry: 2,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}; 