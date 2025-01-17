export type LocationSource = 'coordinates' | 'address';

export type PostStatus = 'unprocessed' | 'processing' | 'processed';

export interface Location {
  latitude: number;
  longitude: number;
  source: LocationSource;
}

export interface ProcessedPostDTO {
  processed_post_id: string;
  category_name: string;
  sub1_category_name: string;
  location: Location;
  status: PostStatus;
  created_at: string;
  updated_at: string;
} 