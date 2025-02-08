export interface Reservoir {
  id: number;
  sequence_number: string | null;
  irrigation_office: string | null;
  reservoir_name: string | null;
  river_basin: string | null;
  river_name: string | null;
  amphure: string | null;
  province: string | null;
  normal_storage_capacity: string | null;  // in million cubic meters
  minimum_storage_capacity: string | null; // in million cubic meters
  type: string | null;
}

export interface ReservoirResponse {
  reservoirs: Reservoir[];
  total: number;
} 