import { Router } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { getTelemetryData } from '../services/rid-telemetry/telemetry.service';

const router = Router();

// Validation schema for query parameters
const TelemetryQuerySchema = z.object({
  stationId: z.string(),
  timeStart: z.string().optional()
});

/**
 * GET /api/telemetry
 * 
 * Fetches telemetry data for a specific station
 * Query parameters:
 * - stationId: string (required)
 * - timeStart: string (optional, format: dd/MM/yyyy in Buddhist calendar)
 */
router.get('/', async (req, res) => {
  try {
    // Validate query parameters
    const result = TelemetryQuerySchema.safeParse(req.query);
    if (!result.success) {
      logger.warn('Invalid telemetry request parameters', 'TelemetryAPI', {
        errors: result.error.errors
      });
      return res.status(400).json({
        error: 'Invalid request parameters',
        details: result.error.errors
      });
    }

    const { stationId, timeStart = new Date().toLocaleDateString('th-TH') } = result.data;

    // Get telemetry data
    const telemetryData = await getTelemetryData({
      stationId,
      timeStart
    });

    return res.json(telemetryData);
  } catch (error) {
    logger.error('Failed to fetch telemetry data', 'TelemetryAPI', { error });

    if (error instanceof Error && 'status' in error) {
      return res.status(error.status as number).json({
        error: error.message,
        details: (error as any).details
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 