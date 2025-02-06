import { z } from "zod";

// Base coordinates schema
const CoordinatesSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

// Base complaint schema
export const ComplaintDTO = z.object({
  id: z.number(),
  issue: z.string(),
  category: z.string(),
  reporter: z.string(),
  date: z.string(),
  link: z.string().optional(),
  coordinates: CoordinatesSchema.optional(),
  location: z.string().optional(),
  // Add validation for location arrays
  tumbon: z.array(z.string()).optional(),
  amphure: z.array(z.string()).optional(),
  province: z.array(z.string()).optional()
});

export type CreateComplaintDTO = z.infer<typeof ComplaintDTO>;