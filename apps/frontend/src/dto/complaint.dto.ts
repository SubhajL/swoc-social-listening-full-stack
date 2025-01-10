import { z } from "zod";

// Base coordinates schema
const CoordinatesSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

// Base complaint schema
export const ComplaintDTO = z.object({
  issue: z.string().min(1, "ประเด็นข้อร้องเรียนจำเป็นต้องระบุ"),
  category: z.string().min(1, "ประเภทข้อร้องเรียนจำเป็นต้องระบุ"),
  reporter: z.string().min(1, "ข้อมูลผู้ร้องเรียนจำเป็นต้องระบุ"),
  date: z.string(),
  link: z.string().url().optional(),
  coordinates: CoordinatesSchema,
  location: z.string().min(1, "ที่อยู่จำเป็นต้องระบุ"),
});

export type CreateComplaintDTO = z.infer<typeof ComplaintDTO>;