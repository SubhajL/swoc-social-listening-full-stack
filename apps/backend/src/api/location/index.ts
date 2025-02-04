import express from 'express';
import { LocationCacheService } from '../../services/location-cache.service.js';
import { logger } from '../../utils/logger.js';

export const createLocationRouter = (locationCacheService: LocationCacheService) => {
  const router = express.Router();

  // Get cache statistics
  router.get('/cache/stats', async (req, res) => {
    try {
      const stats = locationCacheService.getCacheStats();
      res.json({
        data: stats
      });
    } catch (error) {
      logger.error('Error fetching cache stats:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch cache statistics'
        }
      });
    }
  });

  return router;
}; 