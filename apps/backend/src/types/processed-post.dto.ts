export type LocationSource = 'coordinates' | 'address';
export type CoordinateSource = 'direct' | 'cache_direct' | 'cache_inherited';

export interface Location {
  latitude: number;
  longitude: number;
  source: LocationSource;
  tumbon?: string;
  amphure?: string;
  province?: string;
}

export interface ProcessedPostDTO {
  processed_post_id: number;
  text: string;
  category_name: string;
  sub1_category_name: string;
  profile_name: string;
  post_date: string;  // ISO string for API
  post_url: string;
  latitude: number;
  longitude: number;
  tumbon: string[];
  amphure: string[];
  province: string[];
  replied_post: boolean;
  replied_date?: string;  // ISO string for API
  replied_by?: string;
  coordinate_source: CoordinateSource;  // Required field
} 