/// <reference types="vitest" />
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { apiClient } from '../api-client.js';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { mockPost } from '../../test/fixtures/posts.js';

const server = setupServer(
  http.get('/api/posts/unprocessed', () => {
    return HttpResponse.json({
      data: [mockPost]
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('apiClient', () => {
  it('should fetch unprocessed posts', async () => {
    const posts = await apiClient.getUnprocessedPosts();
    expect(posts).toHaveLength(1);
    expect(posts[0].processed_post_id).toBe('123');
  });
}); 