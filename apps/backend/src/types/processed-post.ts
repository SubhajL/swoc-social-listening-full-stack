import { Location, PostStatus } from './processed-post.dto.js';

export interface ProcessedPost {
  processed_post_id: string;
  category_name: string;
  sub1_category_name: string;
  location: Location;
  status: PostStatus;
  created_at: Date;    // Date for internal use
  updated_at: Date;    // Date for internal use
  nearest_sensor_id?: string;
} 