import { z } from "zod";
import { ComplaintStatus } from "@/types/api/complaint";

// Coordinates validation schema
export const CoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

// Base complaint validation schema
export const ComplaintSchema = z.object({
  issue: z.string().min(1, "ประเด็นข้อร้องเรียนจำเป็นต้องระบุ")
    .max(500, "ประเด็นข้อร้องเรียนต้องไม่เกิน 500 ตัวอักษร"),
  category: z.string().min(1, "ประเภทข้อร้องเรียนจำเป็นต้องระบุ"),
  reporter: z.string().min(1, "ข้อมูลผู้ร้องเรียนจำเป็นต้องระบุ"),
  date: z.string().datetime(),
  link: z.string().url().optional(),
  coordinates: CoordinatesSchema,
  location: z.string().min(1, "ที่อยู่จำเป็นต้องระบุ"),
  status: z.nativeEnum(ComplaintStatus).default(ComplaintStatus.PENDING),
});

// Search params validation
export const SearchParamsSchema = z.object({
  searchTerm: z.string().optional(),
  categories: z.array(z.string()).optional(),
  province: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z.nativeEnum(ComplaintStatus).optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
});