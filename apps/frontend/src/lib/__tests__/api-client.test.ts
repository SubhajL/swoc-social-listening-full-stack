/// <reference types="vitest" />
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { apiClient } from '../api-client';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { CategoryName, ProcessedPost } from '@/types/processed-post';
import { server } from '../../mocks/server';

const mockPost: ProcessedPost = {
  processed_post_id: '123',
  category_name: CategoryName.REPORT_INCIDENT,
  sub1_category_name: 'อาคารชลประทานชำรุด',
  location: {
    latitude: 13.7563,
    longitude: 100.5018,
    source: 'coordinates'
  },
  status: 'unprocessed',
  created_at: '2024-01-18T00:00:00Z',
  updated_at: '2024-01-18T00:00:00Z'
};

describe('apiClient', () => {
  it('should fetch unprocessed posts', async () => {
    // Override the global handler for this test
    server.use(
      http.get('/api/posts/unprocessed', () => {
        return HttpResponse.json({
          data: [mockPost]
        });
      })
    );

    const posts = await apiClient.getUnprocessedPosts();
    expect(posts).toHaveLength(1);
    expect(posts[0].processed_post_id).toBe('123');
  });

  it('should fetch post by id', async () => {
    // Override the global handler for this test
    server.use(
      http.get('/api/posts/:id', ({ params }) => {
        const { id } = params;
        return HttpResponse.json({
          data: { ...mockPost, processed_post_id: id }
        });
      })
    );

    const post = await apiClient.getPostById('123');
    expect(post.processed_post_id).toBe('123');
  });
}); 