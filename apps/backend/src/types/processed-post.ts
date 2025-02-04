import { Location } from './processed-post.dto.js';
import { CoordinateSource } from './processed-post.dto';

export interface ProcessedPost {
  processed_post_id: number;
  post_id: string;
  platform: string;
  text: string;
  category_name: string;
  category_code: string;
  sub1_category_name: string;
  profile_name: string;
  post_date: Date;
  post_url: string;
  latitude: number;
  longitude: number;
  tumbon: string[];
  amphure: string[];
  province: string[];
  hashtag: string[];
  named_entities: string[];
  river_basin: string[];
  extracted_at: Date;
  replied_post: boolean;
  replied_date?: Date;
  replied_by?: string;
  // Additional fields from location query
  location_data?: {
    lat: number;
    lng: number;
  };
  final_latitude?: number;
  final_longitude?: number;
  coordinate_source?: CoordinateSource;
} 