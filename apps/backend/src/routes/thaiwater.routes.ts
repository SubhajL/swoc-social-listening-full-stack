import express from 'express';
import { Pool } from 'pg';
import { ThaiWaterController } from '../controllers/thaiwater.controller';

/**
 * Initialize ThaiWater routes
 */
export function initThaiWaterRoutes(pool: Pool): express.Router {
  const router = express.Router();
  const thaiWaterController = new ThaiWaterController(pool);

  /**
   * @route GET /api/thaiwater/rainfall
   * @desc Get rainfall data with filters
   * @access Public
   */
  router.get('/rainfall', thaiWaterController.getRainfall);

  /**
   * @route GET /api/thaiwater/stations
   * @desc Get telemetry stations with filters
   * @access Public
   */
  router.get('/stations', thaiWaterController.getStations);

  /**
   * @route GET /api/thaiwater/statistics
   * @desc Get rainfall statistics
   * @access Public
   */
  router.get('/statistics', thaiWaterController.getStatistics);

  return router;
} 