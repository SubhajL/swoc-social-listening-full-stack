import { Pool } from 'pg';
import { mockPost } from '../fixtures/posts.js';

export const mockPool = {
  connect: jest.fn().mockImplementation(() => ({
    query: jest.fn().mockImplementation((text, params) => {
      if (text.includes('SELECT * FROM processed_posts')) {
        return Promise.resolve({ rows: [mockPost] });
      }
      return Promise.resolve({ rows: [] });
    }),
    release: jest.fn()
  })),
  end: jest.fn()
} as unknown as Pool; 