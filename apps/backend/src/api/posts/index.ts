import express from 'express';
import { ProcessedPostService } from '../../services/processed-post.service.js';
import { logger } from '../../utils/logger.js';
import { readPool } from '../../lib/db.js';

export const router = express.Router();

// Get the io instance from app settings
const getIo = (req: express.Request) => req.app.get('io');

// Create service instance with io
const createPostService = (req: express.Request) => {
  const io = getIo(req);
  return new ProcessedPostService(io);
};

// Test database connection
router.get('/test-connection', async (req, res) => {
  try {
    logger.info('Testing database connection...');
    const client = await readPool.connect();
    const result = await client.query('SELECT current_database(), current_user');
    client.release();
    
    logger.info('Database connection successful:', result.rows[0]);
    res.json({
      status: 'success',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Database connection test failed:', {
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        code: (error as any).code,
        stack: error instanceof Error ? error.stack : undefined
      } : error
    });
    res.status(500).json({
      error: {
        code: 'DATABASE_CONNECTION_ERROR',
        message: 'Failed to connect to database',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

// Get unprocessed posts
router.get('/unprocessed', async (req, res) => {
  try {
    logger.info('Attempting to fetch unprocessed posts');
    
    const postService = createPostService(req);
    const posts = await postService.getUnprocessedPosts();
    
    logger.info(`Successfully fetched ${posts.length} unprocessed posts`);
    res.json({
      data: posts
    });
  } catch (error) {
    logger.error('Error fetching unprocessed posts:', {
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        code: (error as any).code,
        stack: error instanceof Error ? error.stack : undefined,
        details: (error as any).details
      } : error
    });
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch unprocessed posts',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

// Get posts by location
router.get('/location', async (req, res) => {
  try {
    const postService = createPostService(req);
    const { latitude, longitude, radius } = req.query;
    const posts = await postService.getPostsByLocation(
      Number(latitude),
      Number(longitude),
      Number(radius)
    );
    res.json({
      data: posts
    });
  } catch (error) {
    logger.error('Error fetching posts by location:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch posts by location'
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