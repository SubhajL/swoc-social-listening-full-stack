import { ProcessedPostDTO } from '../../types/processed-post.dto.js';

// Mock post data
export const mockPost: ProcessedPostDTO = {
  processed_post_id: 1,
  text: 'Test post',
  category_name: 'Test category',
  sub1_category_name: 'Test subcategory',
  profile_name: 'Test profile',
  post_date: new Date().toISOString(),
  post_url: 'http://test.com',
  latitude: 13.7563,
  longitude: 100.5018,
  tumbon: ['Test tumbon'],
  amphure: ['Test amphure'],
  province: ['Test province'],
  replied_post: false,
  replied_date: undefined,
  replied_by: undefined,
  coordinate_source: 'direct'
};

export const mockPosts: ProcessedPostDTO[] = [mockPost];

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