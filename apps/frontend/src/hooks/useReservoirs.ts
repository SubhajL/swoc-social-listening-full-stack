import { useQuery } from "@tanstack/react-query";
import { ReservoirResponse } from "@/types/reservoir";
import { API_ENDPOINTS, buildUrl, createApiError } from "@/lib/api";

const fetchReservoirs = async (
  amphure?: string,
  province?: string
): Promise<ReservoirResponse> => {
  // Log the request attempt
  console.info("[useReservoirs] Fetching reservoirs", {
    amphure,
    province,
    url: buildUrl(API_ENDPOINTS.RESERVOIRS, { amphure, province }),
    timestamp: new Date().toISOString()
  });

  try {
    const response = await fetch(
      buildUrl(API_ENDPOINTS.RESERVOIRS, { amphure, province })
    );
    
    if (!response.ok) {
      console.error("[useReservoirs] API request failed", {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        timestamp: new Date().toISOString()
      });
      throw createApiError(`Failed to fetch reservoirs: ${response.statusText}`, response);
    }
    
    const data = await response.json();
    console.info("[useReservoirs] Data received", {
      totalReservoirs: data.total,
      timestamp: new Date().toISOString()
    });
    return data;
  } catch (error) {
    console.error("[useReservoirs] Error fetching data", {
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

export const useReservoirs = (amphure?: string, province?: string) => {
  return useQuery({
    queryKey: ['reservoirs', amphure, province],
    queryFn: () => fetchReservoirs(amphure, province),
    enabled: Boolean(amphure || province),
  });
}; 