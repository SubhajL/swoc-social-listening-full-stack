import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/error-handler.js';
import { createPostsRouter } from './api/posts/index.js';
import { ProcessedPostService } from './services/processed-post.service.js';
import { pool } from './lib/db.js';
import { logger } from './utils/logger.js';
import { Server } from 'socket.io';

const app = express();

app.use(cors());
app.use(express.json());

// Initialize services
export const initializeServices = async (io: Server) => {
  const processedPostService = new ProcessedPostService(pool, io);
  await processedPostService.initialize();
  logger.info('Services initialized successfully');

  // Create router with initialized service
  const postsRouter = createPostsRouter(processedPostService);
  app.use('/api/posts', postsRouter);

  return { processedPostService };
};

// Error handling
app.use(errorHandler);

export { app }; 