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
  created_at: Date;    // Date for internal use
  updated_at: Date;    // Date for internal use
  nearest_sensor_id?: string;
} 