import { mockPost } from '../fixtures/posts.js';
import { Server } from 'socket.io';
import { Pool } from 'pg';
import { ProcessedPostDTO } from '../../types/processed-post.dto.js';

// Create mock functions with proper typing
const getUnprocessedPosts = jest.fn<Promise<ProcessedPostDTO[]>, []>();
const getPostById = jest.fn<Promise<ProcessedPostDTO>, [string]>();
const getPostsByLocation = jest.fn<Promise<ProcessedPostDTO[]>, [number, number, number]>();
const createPost = jest.fn<Promise<ProcessedPostDTO>, [any]>();

// Export mock functions for direct use in tests
export const mockProcessedPostService = {
  getUnprocessedPosts,
  getPostById,
  getPostsByLocation,
  createPost
};

// Export mock class for service instantiation
export class ProcessedPostServiceMock {
  constructor(pool: Pool, io: Server) {}
  
  getUnprocessedPosts = getUnprocessedPosts;
  getPostById = getPostById;
  getPostsByLocation = getPostsByLocation;
  createPost = createPost;
}

// Set default mock implementations
getUnprocessedPosts.mockResolvedValue([mockPost]);
getPostById.mockResolvedValue(mockPost);
getPostsByLocation.mockResolvedValue([mockPost]);
createPost.mockResolvedValue(mockPost); 