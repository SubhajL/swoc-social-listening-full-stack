import { z } from "zod";
import { ComplaintDTO } from "@/dto/complaint.dto";

// Base interfaces
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Complaint {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  type?: string;
  province?: string;
  postId?: string;
  link?: string;
}

// Processed social media post
export interface ProcessedPost {
  id: string;
  platform: string;
  content: string;
  postDate: string;
  author: string;
  processed: boolean;
  type?: string;
  province?: string;
  postId?: string;
  link?: string;
}

// Extended complaint with organization info
export interface ComplaintWithOrganization extends Complaint {
  organizationId: string;
  organizationName: string;
}

// Extended processed post with organization info
export interface ProcessedPostWithOrganization extends ProcessedPost {
  organizationId: string;
  organizationName: string;
}

// Response interfaces
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

// Component props interfaces
export interface CategoryState {
  [key: string]: boolean;
}

export interface FilterSectionProps {
  categoryStates: CategoryState;
  onCategoryChange: (category: string) => void;
  onProvinceChange: (province: string) => void;
  onOfficeChange: (office: string) => void;
}

export interface MapSectionProps {
  complaints: any[]; // TODO: Define proper type
  isLoading: boolean;
  selectedCategories: string[];
  selectedProvince: string | null;
  selectedAmphure?: string | null;
  selectedTumbon?: string | null;
  selectedOffice?: string | null;
}

// Validation type
export type ComplaintValidation = z.infer<typeof ComplaintDTO>;

// Sample data
export const sampleComplaints: Complaint[] = [
  {
    id: "1",
    content: "น้ำท่วมเชียงราย",
    createdAt: "2024-09-10T00:00:00",
    updatedAt: "2024-09-10T00:00:00",
    status: "รอดำเนินการ",
    type: "แจ้งเหตุ",
    province: "เชียงใหม่",
    postId: "https://example.com/complaint/1",
    link: "https://example.com/complaint/1"
  }
];