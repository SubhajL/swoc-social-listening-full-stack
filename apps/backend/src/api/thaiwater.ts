import { Router } from 'express';
import { logger } from '../utils/logger';
import { getRainfallData } from '../services/thaiwater/thaiwater.service';

const router = Router();

// Debug middleware for all Thaiwater routes
router.use((req, res, next) => {
  logger.info('[ThaiWater Route] Incoming request', {
    method: req.method,
    path: req.path,
    query: req.query,
    timestamp: new Date().toISOString()
  });
  next();
});

/**
 * GET /api/thaiwater/rainfall
 * 
 * Fetches rainfall data from ThaiWater API
 */
router.get('/rainfall', async (req, res) => {
  try {
    logger.info('[ThaiWater Route] Handling rainfall data request', {
      timestamp: new Date().toISOString()
    });

    const response = await getRainfallData();
    
    logger.info('[ThaiWater Route] API response', {
      success: response.success,
      dataCount: response.data?.length || 0,
      hasError: !!response.error,
      timestamp: new Date().toISOString()
    });

    if (!response.success) {
      logger.warn('[ThaiWater Route] Failed to fetch rainfall data', {
        error: response.error,
        debug: response.debug,
        timestamp: new Date().toISOString()
      });

      return res.status(500).json({
        success: false,
        error: response.error || 'Failed to fetch rainfall data',
        debug: response.debug
      });
    }

    return res.json(response);

  } catch (error) {
    logger.error('[ThaiWater Route] Error handling rainfall data request', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      debug: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
  }
});

export default router; 