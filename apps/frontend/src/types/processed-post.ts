export interface ProcessedPost {
  processed_post_id: string;
  category_name: string;
  sub1_category_name: string;
  location: {
    latitude: number;
    longitude: number;
    source: 'coordinates' | 'address' | 'both';
    address?: string;
    tumbon?: string;
    amphure?: string;
    province?: string;
  };
  status: 'unprocessed' | 'processing' | 'resolved';
  created_at: string;
  updated_at: string;
  nearest_sensor_id?: string;
} 