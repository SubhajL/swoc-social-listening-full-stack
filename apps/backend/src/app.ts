import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/error-handler.js';
import { createPostsRouter } from './api/posts/index.js';
import telemetryStationsRouter from './api/telemetry-stations.js';
import { ProcessedPostService } from './services/processed-post.service.js';
import { pool } from './lib/db.js';
import { logger } from './utils/logger.js';
import { Server } from 'socket.io';

const app = express();

// Ensure CORS is the first middleware
app.use(cors({
  origin: true, // Enable all origins temporarily for debugging
  credentials: true
}));

// Basic middleware
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`📥 Incoming Request`, {
    method: req.method,
    url: req.url,
    origin: req.headers.origin,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });

  // Ensure CORS headers are present
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    logger.info('👋 Handling OPTIONS request', {
      origin: req.headers.origin,
      timestamp: new Date().toISOString()
    });
    return res.status(204).end();
  }

  next();
});

// Initialize services and routes
export const initializeServices = async (io: Server) => {
  const processedPostService = new ProcessedPostService(pool, io);
  await processedPostService.initialize();
  logger.info('🚀 Services initialized successfully');

  const postsRouter = createPostsRouter(processedPostService);
  
  // Register routes
  app.use('/api/posts', postsRouter);
  app.use('/api/monitoring-stations', telemetryStationsRouter);
  
  logger.info('📍 API routes registered', {
    routes: ['/api/posts', '/api/monitoring-stations'],
    timestamp: new Date().toISOString()
  });

  return { processedPostService };
};

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Handle CORS errors specifically
  if (err.name === 'CORSError') {
    logger.error('🚫 CORS Error:', {
      origin: req.headers.origin,
      method: req.method,
      path: req.path,
      error: err.message,
      timestamp: new Date().toISOString()
    });
    return res.status(403).json({
      error: 'CORS Error',
      message: 'Cross-Origin Request Blocked',
      details: err.message
    });
  }

  // Log all other errors
  logger.error('❌ Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  next(err);
});

// Final error handler
app.use(errorHandler);

export { app }; 