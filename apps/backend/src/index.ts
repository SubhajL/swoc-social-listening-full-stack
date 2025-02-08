import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import pkg from 'pg';
const { Pool } = pkg;
import { ProcessedPostService } from './services/processed-post.service.js';
import { LocationCacheService } from './services/location-cache.service.js';
import { createPostsRouter } from './api/posts/index.js';
import { createLocationRouter } from './api/location/index.js';
import telemetryStationsRouter from './api/telemetry-stations.js';
import rainStationsRouter from './api/rain-stations.js';
import { logger } from './utils/logger.js';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer);

const pool = new Pool({
  user: process.env.DB_WRITE_USER,
  password: process.env.DB_WRITE_PASSWORD,
  host: process.env.DB_WRITE_HOST,
  port: parseInt(process.env.DB_WRITE_PORT || '5432'),
  database: process.env.DB_WRITE_DATABASE,
  ssl: {
    rejectUnauthorized: false
  }
});

const locationCacheService = new LocationCacheService(pool);
const processedPostService = new ProcessedPostService(pool, io);

// Make io available to the request object
app.set('io', io);

// Initialize services before starting the server
const startServer = async () => {
  try {
    await locationCacheService.initialize();
    await processedPostService.initialize();
    logger.info('Services initialized successfully');

    // Configure CORS first
    app.use(cors({
      origin: true, // Enable all origins temporarily for debugging
      credentials: true
    }));

    // Then other middleware
    app.use(express.json());

    // Request logging middleware
    app.use((req, res, next) => {
      logger.info(`📥 Incoming Request`, {
        method: req.method,
        url: req.url,
        origin: req.headers.origin,
        timestamp: new Date().toISOString()
      });
      next();
    });

    // Register routes
    app.use('/api/posts', createPostsRouter(processedPostService));
    app.use('/api/location', createLocationRouter(locationCacheService));
    app.use('/api/monitoring-stations', telemetryStationsRouter);
    app.use('/api/rain-stations', rainStationsRouter);

    logger.info('📍 API routes registered', {
      routes: ['/api/posts', '/api/location', '/api/monitoring-stations', '/api/rain-stations'],
      timestamp: new Date().toISOString()
    });

    const port = process.env.PORT || 3000;
    httpServer.listen(port, () => {
      logger.info(`🚀 Server is running on port ${port}`, {
        port,
        env: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      });
    }).on('error', (err) => {
      logger.error('❌ Error during server startup:', {
        error: err.message,
        timestamp: new Date().toISOString()
      });
      process.exit(1);
    });
  } catch (error) {
    logger.error('❌ Error during server startup:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
    process.exit(1);
  }
};

startServer(); 
