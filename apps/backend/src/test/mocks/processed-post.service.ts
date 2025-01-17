import { ProcessedPostDTO } from '../../types/processed-post.dto.js';

// Mock post data
export const mockPost: ProcessedPostDTO = {
  processed_post_id: '123e4567-e89b-12d3-a456-426614174000',
  category_name: 'Test Category',
  sub1_category_name: 'Test Sub Category',
  location: {
    latitude: 13.7563,
    longitude: 100.5018,
    source: 'coordinates' as const
  },
  status: 'unprocessed' as const,
  created_at: new Date('2024-01-19T00:00:00.000Z').toISOString(),
  updated_at: new Date('2024-01-19T00:00:00.000Z').toISOString()
};

// Mock service implementation
export const mockProcessedPostService = {
  getUnprocessedPosts: jest.fn(),
  getPostById: jest.fn(),
  getPostsByLocation: jest.fn(),
  createPost: jest.fn(),
  updateBatchProgress: jest.fn(),
  startBatch: jest.fn(),
  completeBatch: jest.fn()
}; 