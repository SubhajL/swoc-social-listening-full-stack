import express from 'express';
import { testTelemetryService } from '../services/rid-telemetry/telemetry.service';
import { logger } from '../utils/logger';

const router = express.Router();

// Test endpoint for telemetry service
router.get('/test', async (req, res) => {
  try {
    logger.info('Testing telemetry service', 'TelemetryRoutes', {
      timestamp: new Date().toISOString()
    });

    const result = await testTelemetryService();
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    logger.error('Error in telemetry test endpoint', 'TelemetryRoutes', {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router; 