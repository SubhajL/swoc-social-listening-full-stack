import express from 'express';
import { ProcessedPostService } from '../../services/processed-post.service.js';
import pkg from 'pg';
const { Pool } = pkg;
import { logger } from '../../utils/logger.js';

export const router = express.Router();

// Get the io instance from app settings
const getIo = (req: express.Request) => req.app.get('io');

// Create a pool instance
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Create service instance with pool and io
const createPostService = (req: express.Request) => {
  const io = getIo(req);
  return new ProcessedPostService(pool, io);
};

// Get unprocessed posts
router.get('/unprocessed', async (req, res) => {
  try {
    const postService = createPostService(req);
    const posts = await postService.getUnprocessedPosts();
    
    res.json({
      data: posts
    });
  } catch (error) {
    logger.error('Error fetching unprocessed posts:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch unprocessed posts'
      }
    });
  }
});

// Get post by ID
router.get('/:id', async (req, res) => {
  try {
    const postService = createPostService(req);
    const post = await postService.getPostById(req.params.id);
    
    res.json({
      data: post
    });
  } catch (error) {
    logger.error('Error fetching post:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch post'
      }
    });
  }
});

// Other routes... 