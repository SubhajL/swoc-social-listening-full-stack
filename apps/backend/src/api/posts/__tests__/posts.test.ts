import request from 'supertest';
import { app } from '../../../app.js';
import { ProcessedPostService } from '../../../services/processed-post.service.js';
import { mockPost, mockProcessedPostService } from '../../../test/mocks/processed-post.service.js';
import { ProcessedPostDTO } from '../../../types/processed-post.dto.js';

// Mock ProcessedPostService
jest.mock('../../../services/processed-post.service.js');

describe('Posts API Routes', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Reset ProcessedPostService mock
    (ProcessedPostService as jest.Mock).mockImplementation(() => mockProcessedPostService);
  });

  describe('GET /api/posts/unprocessed', () => {
    it('should return unprocessed posts', async () => {
      const mockPosts = [mockPost];

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
      // Mock service response
      mockProcessedPostService.getPostById.mockResolvedValueOnce(mockPost);

      const response = await request(app)
        .get(`/api/posts/${mockPost.processed_post_id}`)
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
      const mockPosts = [mockPost];

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

  describe('POST /api/posts', () => {
    it('should create a new post', async () => {
      const newPost = {
        text: 'Test complaint text',
        category_name: 'Test Category',
        sub1_category_name: 'Test Sub Category',
        profile_name: 'Test User',
        post_date: new Date().toISOString(),
        post_url: 'https://example.com/post',
        latitude: 13.7563,
        longitude: 100.5018,
        tumbon: ['Test Tumbon'],
        amphure: ['Test Amphure'],
        province: ['Test Province']
      };

      mockProcessedPostService.createPost.mockImplementationOnce(async (data: typeof newPost) => ({
        ...data,
        processed_post_id: mockPost.processed_post_id
      }));

      const response = await request(app)
        .post('/api/posts')
        .send(newPost)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.data).toMatchObject(newPost);
      expect(mockProcessedPostService.createPost).toHaveBeenCalledWith(newPost);
    });

    it('should handle creation errors', async () => {
      const newPost = {
        text: 'Test complaint text',
        category_name: 'Test Category',
        sub1_category_name: 'Test Sub Category',
        profile_name: 'Test User',
        post_date: new Date().toISOString(),
        post_url: 'https://example.com/post',
        latitude: 13.7563,
        longitude: 100.5018,
        tumbon: ['Test Tumbon'],
        amphure: ['Test Amphure'],
        province: ['Test Province']
      };

      mockProcessedPostService.createPost.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .post('/api/posts')
        .send(newPost)
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).toEqual({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create post'
        }
      });
    });
  });
}); 