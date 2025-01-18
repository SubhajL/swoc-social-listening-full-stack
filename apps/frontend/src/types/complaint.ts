import { z } from "zod";
import { ComplaintDTO } from "@/dto/complaint.dto";

// Base interfaces
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Complaint {
  id: number;
  issue: string;
  category: string;
  reporter: string;
  date: string;
  link?: string;
  coordinates: Coordinates;
  location: string;
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
  complaints?: Complaint[];
  isLoading: boolean;
  selectedCategories: string[];
  selectedProvince: string | null;
  selectedOffice: string | null;
}

// Validation type
export type ComplaintValidation = z.infer<typeof ComplaintDTO>;

// Sample data
export const sampleComplaints: Complaint[] = [
  {
    id: 1,
    issue: "น้ำท่วมเชียงราย",
    category: "แจ้งเหตุ",
    reporter: "ชาวบ้านเชียงราย",
    date: "2024-09-10",
    link: "https://example.com/complaint/1",
    coordinates: {
      lat: 18.7883,
      lng: 98.9853
    },
    location: "อ. เมือง จ. เชียงใหม่"
  }
];