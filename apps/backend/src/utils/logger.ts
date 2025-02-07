import pino from 'pino';

// Create a logger instance with custom configuration
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
  base: {
    env: process.env.NODE_ENV,
  },
  // Add timestamp to all logs
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
});

// Log initial configuration
if (process.env.LOG_LEVEL === 'debug') {
  logger.debug('Logger initialized in DEBUG mode');
} else {
  logger.info('Logger initialized with level:', process.env.LOG_LEVEL);
} 