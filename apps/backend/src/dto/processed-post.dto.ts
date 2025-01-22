import { z } from 'zod';
import { CategoryName } from '../models/processed-post.js';

export const LocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().optional(),
  source: z.enum(['coordinates', 'address', 'both']),
  tumbon: z.string().optional(),
  amphure: z.string().optional(),
  province: z.string().optional(),
});

export const ProcessedPostSchema = z.object({
  processed_post_id: z.number(),
  text: z.string(),
  category_name: z.nativeEnum(CategoryName),
  sub1_category_name: z.string(),
  profile_name: z.string(),
  post_date: z.date(),
  post_url: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  tumbon: z.string(),
  amphure: z.string(),
  province: z.string()
});

export type ProcessedPostDTO = z.infer<typeof ProcessedPostSchema>; 