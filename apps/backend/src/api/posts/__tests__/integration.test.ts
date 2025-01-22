import request from 'supertest';
import { app } from '../../../app.js';
import pkg from 'pg';
import type { Pool as PoolType } from 'pg';
const { Pool } = pkg;
import { mockPost } from '../../../test/fixtures/posts.js';
import { mockPool } from '../../../test/mocks/db.js';
import { mockProcessedPostService } from '../../../test/mocks/processed-post.service.js';

jest.mock('pg');
jest.mock('../../../services/processed-post.service.js', () => ({
  ProcessedPostService: jest.fn().mockImplementation(() => mockProcessedPostService)
}));

describe('Posts API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProcessedPostService.createPost.mockResolvedValue({
      ...mockPost,
      processed_post_id: '123'
    });
    mockProcessedPostService.getPostById.mockResolvedValue({
      ...mockPost,
      processed_post_id: '123'
    });
  });

  beforeAll(async () => {
    // No need to connect to real DB
  });

  it('should create and fetch a post', async () => {
    // First create a post
    const post = {
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

    const createResponse = await request(app)
      .post('/api/posts')
      .send(post)
      .expect(201);

    const postId = createResponse.body.data.processed_post_id;

    // Then fetch it
    const getResponse = await request(app)
      .get(`/api/posts/${postId}`)
      .expect(200);

    expect(getResponse.body.data).toMatchObject({
      ...post,
      processed_post_id: postId
    });
  });
}); 