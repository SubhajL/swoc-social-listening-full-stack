import request from 'supertest';
import { app } from '../../../app.js';
import pkg from 'pg';
import type { Pool as PoolType } from 'pg';
const { Pool } = pkg;

describe('Posts API Integration', () => {
  let pool: PoolType;

  beforeAll(async () => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  it('should create and fetch a post', async () => {
    // First create a post
    const post = {
      category_name: 'Test Category',
      sub1_category_name: 'Test Sub Category',
      location: {
        latitude: 13.7563,
        longitude: 100.5018,
        source: 'coordinates' as const
      },
      status: 'unprocessed' as const
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