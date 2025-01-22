import { ProcessedPostDTO } from '../../types/processed-post.dto.js';

// Mock post data
export const mockPost: ProcessedPostDTO = {
  processed_post_id: 123,
  text: 'Test complaint text',
  category_name: 'Test Category',
  sub1_category_name: 'Test Sub Category',
  profile_name: 'Test User',
  post_date: new Date('2024-01-19T00:00:00.000Z').toISOString(),
  post_url: 'https://example.com/post',
  latitude: 13.7563,
  longitude: 100.5018,
  tumbon: ['Test Tumbon'],
  amphure: ['Test Amphure'],
  province: ['Test Province']
};

// Mock service implementation
export const mockProcessedPostService = {
  getUnprocessedPosts: jest.fn().mockResolvedValue([mockPost]),
  getPostById: jest.fn().mockResolvedValue(mockPost),
  getPostsByLocation: jest.fn().mockResolvedValue([mockPost]),
  createPost: jest.fn().mockResolvedValue(mockPost),
  updateBatchProgress: jest.fn(),
  startBatch: jest.fn(),
  completeBatch: jest.fn()
}; 