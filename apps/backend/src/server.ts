import { app, initializeServices } from './app';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 3000;

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

const startServer = async () => {
  try {
    await initializeServices(io);
    
    httpServer.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`, {
        port: PORT,
        env: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      });
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
    process.exit(1);
  }
};

startServer(); 