import pino from 'pino';

// Get log level from environment variable, default to 'info'
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Create logger instance with environment-aware configuration
export const logger = pino({
  level: LOG_LEVEL,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname',
      translateTime: 'SYS:standard',
      // Only show message and additional fields for non-debug levels
      messageFormat: LOG_LEVEL === 'debug' 
        ? '{msg}'
        : '{msg} {additional fields: {rest}}'
    }
  }
});

// Log initial configuration
if (LOG_LEVEL === 'debug') {
  logger.debug('Logger initialized in DEBUG mode');
} else {
  logger.info('Logger initialized with level:', LOG_LEVEL);
} 