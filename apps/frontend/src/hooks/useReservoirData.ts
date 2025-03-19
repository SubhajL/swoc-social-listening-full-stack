import { useQuery } from "@tanstack/react-query";

export interface ReservoirData {
  id: number;
  reservoir_id: string;
  reservoir_name: string;
  storage: number | string;
  dead_storage: number | string;
  volume: number | string;
  inflow: number | string;
  outflow: number | string;
  date: string;
  type: string;
  data_source: string;
  created_at: string;
  updated_at: string;
}

export interface ReservoirDataResponse {
  reservoir_data: ReservoirData[];
}

/**
 * Fetches the latest reservoir data from the reservoir_data table
 * @param reservoirId Optional reservoir ID to filter by
 * @returns Query result with reservoir data
 */
const fetchReservoirData = async (reservoirId?: string): Promise<ReservoirDataResponse> => {
  if (!reservoirId) {
    console.warn('[fetchReservoirData] No reservoir ID provided');
    return { reservoir_data: [] };
  }
  
  console.log(`[fetchReservoirData] Attempting to fetch reservoir data:`, { reservoirId });
  
  try {
    // Update to use proper API path with reservoirId
    const url = new URL(`/api/reservoirs/data`, window.location.origin);
    
    if (reservoirId) {
      url.searchParams.append('reservoir_id', reservoirId);
    }
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error(`[fetchReservoirData] Error fetching reservoir data: ${response.status} ${response.statusText}`, errorData);
      throw new Error(`Failed to fetch reservoir data: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Log the shape and content of the data for debugging
    console.log(`[fetchReservoirData] Successfully fetched ${data.reservoir_data?.length || 0} reservoir data records`);
    
    // Print the types of numeric fields in the first record (if exists)
    if (data.reservoir_data && data.reservoir_data.length > 0) {
      const firstRecord = data.reservoir_data[0];
      console.log('[fetchReservoirData] Data types for first record:', {
        storage: typeof firstRecord.storage,
        dead_storage: typeof firstRecord.dead_storage,
        volume: typeof firstRecord.volume,
        inflow: typeof firstRecord.inflow,
        outflow: typeof firstRecord.outflow,
        storageValue: firstRecord.storage,
        deadStorageValue: firstRecord.dead_storage
      });
    }
    
    return data;
  } catch (error) {
    console.error('[fetchReservoirData] Error:', error);
    throw error;
  }
};

/**
 * Hook to fetch and manage reservoir data
 * @param reservoirId Optional reservoir ID to filter by
 * @returns Query result with reservoir data
 */
export const useReservoirData = (reservoirId?: string) => {
  return useQuery({
    queryKey: ['reservoirData', reservoirId],
    queryFn: () => fetchReservoirData(reservoirId),
    enabled: !!reservoirId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });
}; 