import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import pkg from 'pg';
const { Pool } = pkg;
import { ProcessedPostService } from './services/processed-post.service.js';
import { LocationCacheService } from './services/location-cache.service.js';
import { createPostsRouter } from './api/posts/index.js';
import { createLocationRouter } from './api/location/index.js';
import { logger } from './utils/logger.js';
import dotenv from 'dotenv';

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

    app.use(express.json());
    app.use('/api/posts', createPostsRouter(processedPostService));
    app.use('/api/location', createLocationRouter(locationCacheService));

    const port = process.env.PORT || 3000;
    httpServer.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
    }).on('error', (err) => {
      logger.error(`Error during server startup: ${err}`);
      process.exit(1);
    });
  } catch (error) {
    logger.error(`Error during server startup: ${error}`);
    process.exit(1);
  }
};

startServer(); 
