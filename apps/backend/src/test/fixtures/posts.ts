import { ProcessedPost } from '../../types/processed-post.js';

export const mockPost: ProcessedPost = {
  processed_post_id: 123,
  text: 'Test complaint text',
  category_name: 'Test Category',
  sub1_category_name: 'Test Sub Category',
  profile_name: 'Test User',
  post_date: new Date('2024-01-19T00:00:00.000Z'),
  post_url: 'https://example.com/post',
  latitude: 13.7563,
  longitude: 100.5018,
  tumbon: ['Test Tumbon'],
  amphure: ['Test Amphure'],
  province: ['Test Province']
};

export const mockPosts: ProcessedPost[] = [mockPost]; 