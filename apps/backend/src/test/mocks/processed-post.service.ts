import { mockPost } from '../fixtures/posts.js';
import { Server } from 'socket.io';
import { Pool } from 'pg';

export const mockProcessedPostService = {
  getUnprocessedPosts: jest.fn(),
  getPostById: jest.fn(),
  getPostsByLocation: jest.fn(),
  createPost: jest.fn()
};

export class ProcessedPostServiceMock {
  constructor(pool: Pool, io: Server) {}
  
  getUnprocessedPosts = mockProcessedPostService.getUnprocessedPosts;
  getPostById = mockProcessedPostService.getPostById;
  getPostsByLocation = mockProcessedPostService.getPostsByLocation;
  createPost = mockProcessedPostService.createPost;
} 