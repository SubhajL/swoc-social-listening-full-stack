import request from 'supertest';
import { app } from '../../../app.js';
import { Pool } from 'pg';
import { ProcessedPostService } from '../../../services/processed-post.service.js';
import { mockPool } from '../../../test/mocks/db.js';
import { mockPost } from '../../../test/fixtures/posts.js';
import { mockProcessedPostService } from '../../../test/mocks/processed-post.service.js';

jest.mock('../../../services/processed-post.service.js', () => ({
  ProcessedPostService: jest.fn().mockImplementation(() => mockProcessedPostService)
}));

describe('Posts API Routes', () => {
  let pool: Pool;
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    pool = new Pool();
    mockProcessedPostService.getUnprocessedPosts.mockResolvedValue([mockPost]);
    mockProcessedPostService.getPostById.mockResolvedValue(mockPost);
    mockProcessedPostService.getPostsByLocation.mockResolvedValue([mockPost]);
    mockProcessedPostService.createPost.mockResolvedValue(mockPost);
  });

  describe('GET /api/posts/unprocessed', () => {
    it('should return unprocessed posts', async () => {
      const mockPosts = [{
        processed_post_id: '123',
        category_name: 'Test Category',
        sub1_category_name: 'Test Sub Category',
        location: {
          latitude: 13.7563,
          longitude: 100.5018,
          source: 'coordinates' as const
        },
        status: 'unprocessed' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }];

      // Mock service response
      mockProcessedPostService.getUnprocessedPosts.mockResolvedValueOnce(mockPosts);

      const response = await request(app)
        .get('/api/posts/unprocessed')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        data: mockPosts
      });
    });

    it('should handle errors', async () => {
      // Mock service error
      mockProcessedPostService.getUnprocessedPosts.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/posts/unprocessed')
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).toEqual({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch unprocessed posts'
        }
      });
    });
  });

  describe('GET /api/posts/:id', () => {
    it('should return a post by ID', async () => {
      const mockPost = {
        processed_post_id: '123',
        category_name: 'Test Category',
        sub1_category_name: 'Test Sub Category',
        location: {
          latitude: 13.7563,
          longitude: 100.5018,
          source: 'coordinates' as const
        },
        status: 'unprocessed' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Mock service response
      mockProcessedPostService.getPostById.mockResolvedValueOnce(mockPost);

      const response = await request(app)
        .get('/api/posts/123')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        data: mockPost
      });
    });

    it('should handle not found error', async () => {
      // Mock service error
      mockProcessedPostService.getPostById.mockRejectedValueOnce(new Error('Post not found'));

      const response = await request(app)
        .get('/api/posts/nonexistent')
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).toEqual({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch post'
        }
      });
    });
  });

  describe('GET /api/posts/location', () => {
    it('should return posts by location', async () => {
      const mockPosts = [{
        processed_post_id: '123',
        category_name: 'Test Category',
        sub1_category_name: 'Test Sub Category',
        location: {
          latitude: 13.7563,
          longitude: 100.5018,
          source: 'coordinates' as const
        },
        status: 'unprocessed' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }];

      mockProcessedPostService.getPostsByLocation.mockResolvedValueOnce(mockPosts);

      const response = await request(app)
        .get('/api/posts/location?latitude=13.7563&longitude=100.5018&radius=5')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        data: mockPosts
      });
    });
  });
}); 