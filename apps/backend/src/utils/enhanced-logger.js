// Enhanced logger utility for detailed diagnostics in sync jobs
import winston from 'winston';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

// Ensure logs directory exists
const ensureLogDir = () => {
  const logDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  return logDir;
};

// Create a formatter for object data that masks sensitive values
const maskSensitiveData = (data) => {
  if (!data || typeof data !== 'object') return data;
  
  const masked = { ...data };
  
  // List of keys that might contain sensitive data
  const sensitiveKeys = [
    'password', 'token', 'apiKey', 'secret', 'auth', 'credential', 'jwt',
    'key', 'eid', 'private', 'session', 'cookie'
  ];
  
  Object.keys(masked).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
      masked[key] = '[REDACTED]';
    } else if (typeof masked[key] === 'object' && masked[key] !== null) {
      masked[key] = maskSensitiveData(masked[key]);
    }
  });
  
  return masked;
};

// Detailed formatter for sync jobs
const detailedFormat = winston.format.printf(({ level, message, timestamp, jobType, sessionId, component, operation, duration, data, error, ...rest }) => {
  // Format the log message
  let logMessage = `[${timestamp}] [${sessionId || 'NO_SESSION'}] [${jobType || 'UNKNOWN'}] [${level.toUpperCase()}]`;
  
  if (component) logMessage += ` [${component}]`;
  if (operation) logMessage += ` [${operation}]`;
  
  logMessage += `: ${message}`;
  
  if (duration) {
    logMessage += ` (${duration}ms)`;
  }
  
  // Format error object if present
  if (error) {
    if (typeof error === 'object') {
      logMessage += `\nError: ${error.message || 'Unknown error'}`;
      if (error.stack) {
        logMessage += `\nStack: ${error.stack}`;
      }
    } else {
      logMessage += `\nError: ${error}`;
    }
  }
  
  // Format data object if present
  if (data) {
    try {
      const safeData = maskSensitiveData(data);
      logMessage += `\nData: ${JSON.stringify(safeData, null, 2)}`;
    } catch (err) {
      logMessage += `\nData: [Error serializing data: ${err.message}]`;
    }
  }
  
  // Add any remaining fields
  if (Object.keys(rest).length > 0) {
    try {
      const safeRest = maskSensitiveData(rest);
      logMessage += `\nMetadata: ${JSON.stringify(safeRest, null, 2)}`;
    } catch (err) {
      logMessage += `\nMetadata: [Error serializing metadata: ${err.message}]`;
    }
  }
  
  return logMessage;
});

/**
 * Creates an enhanced logger with additional context and methods
 * @param {Object} options Configuration options
 * @param {string} options.jobType - Type of job (e.g., 'THAIWATER_SYNC', 'TMD_SYNC')
 * @param {string} options.filename - Log file name
 * @param {boolean} options.isScheduled - Whether this is a scheduled run or manual
 * @returns {Object} Enhanced logger instance
 */
export const createEnhancedLogger = (options) => {
  const { jobType, filename, isScheduled = false } = options;
  const sessionId = uuidv4(); // Generate unique session ID
  const startTime = Date.now();
  const logDir = ensureLogDir();
  
  // Determine execution context
  const executionContext = isScheduled ? 'SCHEDULED' : 'MANUAL';
  
  // Create the logger instance
  const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      detailedFormat
    ),
    defaultMeta: {
      jobType,
      sessionId,
      executionContext,
      hostname: os.hostname(),
      pid: process.pid
    },
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({
        filename: path.join(logDir, filename),
        maxsize: 10485760, // 10MB
        maxFiles: 10,
        tailable: true
      }),
      new winston.transports.File({
        filename: path.join(logDir, 'all-sync-jobs.log'),
        maxsize: 10485760, // 10MB
        maxFiles: 10,
        tailable: true
      })
    ]
  });
  
  // Create a wrapper that preserves the original Winston logger methods
  const enhancedLogger = {
    // Explicitly forward the Winston logging methods
    error: (message, meta) => logger.error(message, meta),
    warn: (message, meta) => logger.warn(message, meta),
    info: (message, meta) => logger.info(message, meta),
    debug: (message, meta) => logger.debug(message, meta),
    verbose: (message, meta) => logger.verbose(message, meta),
    
    // Log environment information at startup
    logEnvironment: () => {
      const env = {
        NODE_ENV: process.env.NODE_ENV,
        NODE_VERSION: process.version,
        PLATFORM: process.platform,
        ARCH: process.arch,
        MEMORY: {
          total: Math.round(os.totalmem() / (1024 * 1024)) + 'MB',
          free: Math.round(os.freemem() / (1024 * 1024)) + 'MB',
        },
        CPU_COUNT: os.cpus().length,
        WORKING_DIR: process.cwd(),
        USER: process.env.USER || process.env.USERNAME,
        PID: process.pid,
        PPID: process.ppid,
      };
      
      logger.info('Job started with environment context', {
        component: 'Environment',
        operation: 'Initialize',
        data: env
      });
    },
    
    // Log API request details
    logApiRequest: (endpoint, method, params) => {
      logger.debug('API request', {
        component: 'API',
        operation: `${method} ${endpoint}`,
        data: { endpoint, method, params }
      });
    },
    
    // Log API response details
    logApiResponse: (endpoint, status, responseData, startTimeMs) => {
      const duration = Date.now() - startTimeMs;
      
      // Determine appropriate log level based on status code
      let logLevel = 'info';
      if (status >= 400) logLevel = 'warn';
      if (status >= 500) logLevel = 'error';
      
      logger[logLevel](`API response received: ${status}`, {
        component: 'API',
        operation: 'Response',
        duration,
        data: {
          endpoint,
          status,
          responseSize: JSON.stringify(responseData).length,
          sampleData: Array.isArray(responseData) ? 
            (responseData.length > 0 ? responseData[0] : {}) : 
            responseData
        }
      });
      
      // Log counts if it's an array
      if (Array.isArray(responseData)) {
        logger.info(`Received ${responseData.length} records from API`, {
          component: 'API',
          operation: 'DataCount'
        });
      }
    },
    
    // Log database operation details
    logDbOperation: (operation, query, params, startTimeMs) => {
      const duration = Date.now() - startTimeMs;
      logger.debug(`Database ${operation}`, {
        component: 'Database',
        operation,
        duration,
        data: { 
          query: query.substring(0, 500) + (query.length > 500 ? '...' : ''),
          paramCount: params ? params.length : 0
        }
      });
    },
    
    // Log database result details
    logDbResult: (operation, result, startTimeMs) => {
      const duration = Date.now() - startTimeMs;
      let rowCount = 0;
      
      if (result && typeof result === 'object') {
        if (Array.isArray(result)) {
          rowCount = result.length;
        } else if (result.rowCount !== undefined) {
          rowCount = result.rowCount;
        }
      }
      
      logger.info(`Database ${operation} completed`, {
        component: 'Database',
        operation,
        duration,
        data: { rowCount }
      });
    },
    
    // Log an error with full context
    logError: (message, error, component, operation) => {
      logger.error(message, {
        component,
        operation,
        error
      });
    },
    
    // Log data processing information
    logProcessing: (stage, recordCount, details) => {
      logger.info(`Processing ${stage}`, {
        component: 'DataProcessing',
        operation: stage,
        data: {
          recordCount,
          ...details
        }
      });
    },
    
    // Log memory usage
    logMemoryUsage: (operation) => {
      const memUsage = process.memoryUsage();
      logger.debug('Memory usage', {
        component: 'Resources',
        operation,
        data: {
          rss: Math.round(memUsage.rss / (1024 * 1024)) + 'MB',
          heapTotal: Math.round(memUsage.heapTotal / (1024 * 1024)) + 'MB',
          heapUsed: Math.round(memUsage.heapUsed / (1024 * 1024)) + 'MB',
          external: Math.round((memUsage.external || 0) / (1024 * 1024)) + 'MB'
        }
      });
    },
    
    // Log job completion
    logCompletion: (success, stats) => {
      const duration = Date.now() - startTime;
      
      const logMethod = success ? 'info' : 'error';
      logger[logMethod](`Job ${success ? 'completed successfully' : 'failed'}`, {
        component: 'JobControl',
        operation: 'Completion',
        duration,
        data: {
          ...stats,
          durationSeconds: Math.round(duration / 1000),
          executionContext
        }
      });
      
      // Log final memory usage
      enhancedLogger.logMemoryUsage('Completion');
    },
    
    // Get current session ID
    getSessionId: () => sessionId
  };
  
  return enhancedLogger;
}; 