import { http, HttpResponse } from 'msw';
import { mockPost } from '../test/fixtures/posts.js';

export const handlers = [
  http.get('/api/posts/unprocessed', () => {
    return HttpResponse.json({
      data: [mockPost]
    });
  })
]; 