import { ProcessedPostDTO } from '../../types/processed-post.dto.js';
import { randomUUID } from 'crypto';

// Mock post data
export const mockPost: ProcessedPostDTO = {
  processed_post_id: randomUUID(),
  category_name: 'Test Category',
  sub1_category_name: 'Test Sub Category',
  location: {
    latitude: 13.7563,
    longitude: 100.5018,
    source: 'coordinates',
    tumbon: 'Test Tumbon',
    amphure: 'Test Amphure',
    province: 'Test Province'
  },
  status: 'unprocessed',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  nearest_sensor_id: randomUUID()
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