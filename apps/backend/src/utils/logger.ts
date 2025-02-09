import pino from 'pino';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create file stream
const logFile = fs.createWriteStream(path.join(logsDir, 'app.log'), { flags: 'a' });

// Create a logger instance with custom configuration
export const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    base: {
      env: process.env.NODE_ENV,
    },
    // Add timestamp to all logs
    timestamp: () => `,"time":"${new Date().toISOString()}"`,
  },
  pino.multistream([
    { stream: logFile },
    {
      level: 'info',
      stream: pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        }
      })
    }
  ])
);

// Log initial configuration
if (process.env.LOG_LEVEL === 'debug') {
  logger.debug('Logger initialized in DEBUG mode');
} else {
  logger.info('Logger initialized with level:', process.env.LOG_LEVEL);
} 