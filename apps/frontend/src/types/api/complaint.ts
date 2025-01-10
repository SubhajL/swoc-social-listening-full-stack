import { z } from "zod";

// Complaint Status
export enum ComplaintStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

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
  status: z.nativeEnum(ComplaintStatus).default(ComplaintStatus.PENDING),
});

export type CreateComplaintDTO = z.infer<typeof ComplaintDTO>;

export interface ComplaintEvent {
  type: 'created' | 'updated' | 'deleted' | 'status_changed';
  complaint: CreateComplaintDTO;
  timestamp: string;
}