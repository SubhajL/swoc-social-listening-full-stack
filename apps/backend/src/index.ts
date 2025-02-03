import { app, initializeServices } from './app.js';
import { createServer } from 'node:http';
import { setupWebSocket } from './websocket/index.js';
import { logger } from './utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3000;
const httpServer = createServer(app);
const io = setupWebSocket(httpServer);

// Make io available to the request object
app.set('io', io);

// Initialize services before starting the server
const startServer = async () => {
  try {
    await initializeServices(io);
    
    httpServer.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer(); 
