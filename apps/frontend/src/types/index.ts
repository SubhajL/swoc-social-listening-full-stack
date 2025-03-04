export interface Location {
  amphure?: string;
  province?: string;
}

export interface BaseComplaint {
  id: string;
  type: string;
  status: string;
  severity: number;
  province?: string | string[];
  amphure?: string[];
  content?: string;
  text?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  organizationId?: string;
  organizationName?: string;
  platform?: string;
  author?: string;
  processed?: boolean;
  postDate?: string;
  location?: Location;
  processed_post_id?: number;
  category_name?: string;
  sub1_category_name?: string;
  profile_name?: string;
  post_date?: Date;
  post_url?: string;
  latitude?: number;
  longitude?: number;
  tumbon?: string[];
  coordinate_source?: string;
}

export interface ProcessedPost extends BaseComplaint {
  processed_post_id: number;
  category_name: string;
  profile_name: string;
  post_date: Date;
  post_url: string;
  latitude: number;
  longitude: number;
  tumbon: string[];
  coordinate_source: string;
}

export interface ComplaintWithOrganization extends BaseComplaint {
  organizationId: string;
  organizationName: string;
  location: Location;
} 