import { http, HttpResponse } from 'msw';
import { mockPost } from '../test/fixtures/posts.js';

export const handlers = [
  http.get('/api/posts/unprocessed', () => {
    return HttpResponse.json({ data: [mockPost] });
  }),
  
  http.get('/api/posts/:id', ({ params }) => {
    return HttpResponse.json({
      data: { ...mockPost, processed_post_id: params.id }
    });
  })
]; 