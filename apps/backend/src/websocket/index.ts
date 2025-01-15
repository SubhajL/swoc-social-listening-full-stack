import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { logger } from '../utils/logger.js';

export function setupWebSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:8080',
      methods: ['GET', 'POST'],
      credentials: true
    },
    allowEIO3: true
  });

  io.on('connection', (socket) => {
    logger.info('Client connected:', socket.id);

    // Handle real-time updates subscription
    socket.on('subscribe:posts', () => {
      socket.join('posts');
      logger.info('Client subscribed to posts:', socket.id);
    });

    socket.on('unsubscribe:posts', () => {
      socket.leave('posts');
      logger.info('Client unsubscribed from posts:', socket.id);
    });

    socket.on('disconnect', () => {
      logger.info('Client disconnected:', socket.id);
    });
  });

  return io;
}

export function emitPostUpdate(io: Server, post: any) {
  io.to('posts').emit('post:update', post);
}

export function emitBatchProgress(io: Server, progress: any) {
  io.to('posts').emit('batch:progress', progress);
} 