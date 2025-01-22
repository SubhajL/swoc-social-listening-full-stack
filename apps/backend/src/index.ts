import { app } from './app.js';
import { createServer } from 'node:http';
import { setupWebSocket } from './websocket/index.js';
import { logger } from './utils/logger.js';
import { DatabaseHealthService } from './services/database-health.service.js';
import { readPool } from './lib/db.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Validate database setup before starting the server
    const healthService = new DatabaseHealthService(readPool);
    await healthService.validateDatabaseSetup();

    const httpServer = createServer(app);
    const io = setupWebSocket(httpServer);

    // Make io available to the request object
    app.set('io', io);

    httpServer.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });

    // Handle server shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM signal received: closing HTTP server');
      httpServer.close(() => {
        logger.info('HTTP server closed');
        readPool.end();
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 
