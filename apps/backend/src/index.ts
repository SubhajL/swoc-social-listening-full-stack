/// <reference types="express" />
/// <reference types="morgan" />

import express, { Request, Response, NextFunction, Application } from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import pkg from 'pg';
const { Pool } = pkg;
import { ProcessedPostService } from './services/processed-post.service.js';
import { LocationCacheService } from './services/location-cache.service.js';
import { createPostsRouter } from './api/posts/index.js';
import { createLocationRouter } from './api/location/index.js';
import telemetryStationsRouter from './api/telemetry-stations.js';
import telemetryRouter from './api/telemetry.js';
import rainStationsRouter from './api/rain-stations.js';
import reservoirsRouter from './api/reservoirs.js';
import reservoirLocationsRouter from './api/reservoir-locations.js';
import thaiWaterRouter from './api/thaiwater.js';
import userAccountRouter from './routes/user-account.routes.js';
import authRouter from './routes/auth.routes.js';
import approvalRecordRouter from './routes/approval-record.routes.js';
import { logger } from './utils/logger.js';
import dotenv from 'dotenv';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';
import { exec } from 'child_process';
import morgan from 'morgan';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found-handler.js';
import { dirname } from 'path';
import fs from 'fs';

// Define SystemError interface for Node.js system errors
interface SystemError extends Error {
  code?: string;
  syscall?: string;
}

dotenv.config();

const app: Application = express();
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

// Add pool to app locals for use in routes
declare global {
  namespace Express {
    interface Application {
      locals: {
        pool: typeof pool;
      };
    }
  }
}

app.locals.pool = pool;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Clear any process running on the specified port
async function clearPort(port: number): Promise<void> {
  logger.info(`[Server] Clearing port ${port}`);
  
  try {
    // For macOS/Linux
    await new Promise((resolve, reject) => {
      exec(`lsof -i :${port} | grep LISTEN | awk '{print $2}' | xargs kill -9`, (error) => {
        // Ignore error as it might mean no process was found
        resolve(null);
      });
    });
    
    logger.info(`[Server] Successfully cleared port ${port}`);
  } catch (error) {
    logger.error(`[Server] Error clearing port ${port}:`, {
      error: error instanceof Error ? error.message : String(error)
    });
    // Continue anyway
  }
}

// Initialize services before starting the server
const startServer = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000', 10);
    
    // Clear port and stop scheduler before starting
    await clearPort(port);
    await startScheduler();
    
    logger.info('🔄 Initializing services...', {
      timestamp: new Date().toISOString()
    });

    try {
      await locationCacheService.initialize();
      logger.info('✅ Location cache service initialized', {
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('❌ Error initializing location cache service:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      throw error;
    }

    try {
      await processedPostService.initialize();
      logger.info('✅ Processed post service initialized', {
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('❌ Error initializing processed post service:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      throw error;
    }

    // Register routes
    app.use('/api/posts', createPostsRouter(processedPostService));
    app.use('/api/location', createLocationRouter(locationCacheService));
    app.use('/api/monitoring-stations', telemetryStationsRouter);
    app.use('/api/rain-stations', rainStationsRouter);
    app.use('/api/reservoirs', reservoirsRouter);
    app.use('/api/reservoir-locations', reservoirLocationsRouter);
    app.use('/api/telemetry', telemetryRouter);
    app.use('/api/thaiwater', thaiWaterRouter);
    app.use('/api/users', userAccountRouter);
    app.use('/api/auth', authRouter);
    app.use('/api/approval-records', approvalRecordRouter);

    // Add comprehensive health check endpoint
    app.get('/api/health', (req: Request, res: Response) => {
      res.status(200).json({ 
        status: 'ok', 
        message: 'API is healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        server: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          pid: process.pid
        }
      });
    });

    // Add a simple health check endpoint for the root API path
    app.all('/api', (req: Request, res: Response) => {
      res.status(200).json({ status: 'ok', message: 'API server is running' });
    });

    // Also handle the root API path with trailing slash
    app.all('/api/', (req: Request, res: Response) => {
      res.status(200).json({ status: 'ok', message: 'API server is running' });
    });

    logger.info('📍 API routes registered', {
      routes: [
        '/api',
        '/api/',
        '/api/posts', 
        '/api/location', 
        '/api/monitoring-stations', 
        '/api/rain-stations', 
        '/api/reservoirs',
        '/api/reservoir-locations',
        '/api/telemetry',
        '/api/thaiwater',
        '/api/users',
        '/api/auth',
        '/api/approval-records'
      ],
      timestamp: new Date().toISOString()
    });

    httpServer.listen(port, () => {
      logger.info(`🚀 Server is running on port ${port}`, {
        port,
        env: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      });
    }).on('error', (err: SystemError) => {
      logger.error('❌ Error during server startup:', {
        error: err.message,
        code: err.code,
        syscall: err.syscall,
        stack: err.stack,
        timestamp: new Date().toISOString()
      });
      process.exit(1);
    });
  } catch (error) {
    logger.error('❌ Error during server startup:', {
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack
      } : 'Unknown error',
      timestamp: new Date().toISOString()
    });
    process.exit(1);
  }
};

// Stop and restart the scheduler
async function startScheduler(): Promise<void> {
  // Get current file's directory path in ES modules
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  
  const schedulerScript = path.resolve(__dirname, 'scripts/schedule-data-sync.mjs');
  const stopScript = path.resolve(__dirname, 'scripts/stop-scheduler.sh');

  logger.info('[Scheduler] Stopping any existing scheduler processes');
  
  // First stop any existing scheduler
  try {
    await new Promise((resolve, reject) => {
      exec(`bash ${stopScript}`, (error, stdout, stderr) => {
        if (error && error.code !== 1) { // Ignore error code 1 which means no process found
          reject(error);
          return;
        }
        resolve(stdout);
      });
    });
    
    logger.info('[Scheduler] Successfully stopped existing scheduler processes');
    
    // Remove any existing lock file
    const lockFile = path.resolve(__dirname, '../.scheduler.lock');
    if (fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
      logger.info('[Scheduler] Removed existing lock file');
    }
  } catch (error) {
    logger.error('[Scheduler] Error stopping existing scheduler', {
      error: error instanceof Error ? error.message : String(error)
    });
    // Continue anyway to start new scheduler
  }

  // Start new scheduler
  logger.info('[Scheduler] Starting data sync scheduler', {
    scriptPath: schedulerScript,
    currentDir: __dirname
  });
  
  exec(`node ${schedulerScript}`, (error, stdout, stderr) => {
    if (error) {
      logger.error('[Scheduler] Error starting data sync scheduler', {
        error: error.message,
        stderr,
        scriptPath: schedulerScript
      });
      return;
    }
    
    if (stderr) {
      logger.warn('[Scheduler] Data sync scheduler produced stderr output', {
        stderr
      });
    }
    
    logger.info('[Scheduler] Data sync scheduler started successfully', {
      stdout
    });
  });
}

startServer(); 
