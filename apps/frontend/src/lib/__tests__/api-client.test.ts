/// <reference types="vitest" />
import { describe, it, expect } from 'vitest';
import { apiClient } from '../api-client';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { mockPost } from '../../test/fixtures/posts';

describe('API Client', () => {
  const mockPostResponse = {
    data: {
      processed_post_id: 123,
      category_name: 'Test Category',
      sub1_category_name: 'Test Sub Category',
      latitude: 13.7563,
      longitude: 100.5018,
      tumbon: 'Test Tumbon',
      amphure: 'Test Amphure',
      province: 'Test Province',
      post_date: new Date().toISOString(),
      post_url: 'https://example.com/post',
      text: 'Test complaint text',
      profile_name: 'Test User'
    }
  };

  describe('getUnprocessedPosts', () => {
    it('should fetch unprocessed posts', async () => {
      server.use(
        http.get('/api/posts/unprocessed', () => {
          return HttpResponse.json({ data: [mockPostResponse.data] });
        })
      );

      const posts = await apiClient.getUnprocessedPosts();
      expect(posts).toHaveLength(1);
      expect(posts[0].processed_post_id).toBe(123);
    });
  });

  describe('getPostById', () => {
    it('should fetch a post by id', async () => {
      const id = '123';
      server.use(
        http.get(`/api/posts/${id}`, () => {
          return HttpResponse.json({ data: mockPostResponse.data });
        })
      );

      const post = await apiClient.getPostById(id);
      expect(post.processed_post_id).toBe(123);
    });
  });
}); 