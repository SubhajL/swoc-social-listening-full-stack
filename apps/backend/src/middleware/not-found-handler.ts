import { Request, Response } from 'express';
import { logger } from '../utils/logger';

/**
 * Middleware to handle 404 Not Found errors
 */
export function notFoundHandler(req: Request, res: Response): void {
  logger.warn('404 Not Found', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
  
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `The requested resource at ${req.url} was not found`
  });
} 