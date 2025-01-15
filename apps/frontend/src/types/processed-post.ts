export interface ProcessedPostDTO {
  processed_post_id: string;
  category_name: string;
  sub1_category_name: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
    source: 'coordinates' | 'address' | 'both';
    tumbon?: string;
    amphure?: string;
    province?: string;
  };
  status: 'unprocessed' | 'processing' | 'resolved';
  created_at: Date;
  updated_at: Date;
  nearest_sensor_id?: string;
} 