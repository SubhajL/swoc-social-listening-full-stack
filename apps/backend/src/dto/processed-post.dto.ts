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
  category_name: z.string(),
  sub1_category_name: z.string(),
  profile_name: z.string(),
  post_date: z.string(),
  post_url: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  tumbon: z.array(z.string()),
  amphure: z.array(z.string()),
  province: z.array(z.string()),
  replied_post: z.boolean(),
  replied_date: z.string().optional(),
  replied_by: z.string().optional(),
  coordinate_source: z.enum(['direct', 'cache_direct', 'cache_inherited'])
});

export type ProcessedPostDTO = z.infer<typeof ProcessedPostSchema>; 