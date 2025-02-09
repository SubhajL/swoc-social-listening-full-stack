import { Router } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { getTelemetryData } from '../services/rid-telemetry/telemetry.service';
import type { TelemetryError } from '../services/rid-telemetry/types';

const router = Router();

// Type guard for error with response property
function isErrorWithResponse(error: unknown): error is Error & { 
  response?: { 
    status: number;
    statusText: string;
    data: unknown;
    headers: Record<string, string>;
    config?: {
      url?: string;
      method?: string;
      headers?: Record<string, string>;
      data?: unknown;
    }
  };
  code?: string;
} {
  return error instanceof Error && 
         (('response' in error && error.response !== undefined) || 
          ('code' in error && typeof error.code === 'string'));
}

// Validation schema for query parameters
const TelemetryQuerySchema = z.object({
  stationId: z.string(),
  timeStart: z.string().optional()
});

/**
 * GET /api/telemetry/test
 * Test endpoint that fetches data for a known valid station
 */
router.get('/test', async (req, res) => {
  try {
    const testStationId = 'TD01'; // Known valid station ID
    const timeStart = new Date().toLocaleDateString('th-TH');
    
    logger.info('Testing telemetry endpoint', 'TelemetryAPI', {
      stationId: testStationId,
      timeStart,
      timestamp: new Date().toISOString()
    });
    
    const telemetryData = await getTelemetryData({
      stationId: testStationId,
      timeStart
    });

    logger.info('Test endpoint succeeded', 'TelemetryAPI', {
      response: telemetryData,
      timestamp: new Date().toISOString()
    });

    return res.json(telemetryData);
  } catch (error: unknown) {
    logger.error('Test endpoint failed', 'TelemetryAPI', { 
      error,
      errorDetails: {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        code: isErrorWithResponse(error) ? error.code : undefined,
        response: isErrorWithResponse(error) ? {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers,
          config: {
            url: error.response?.config?.url,
            method: error.response?.config?.method,
            headers: error.response?.config?.headers,
            data: error.response?.config?.data
          }
        } : undefined
      },
      timestamp: new Date().toISOString()
    });
    
    if (error instanceof Error && 'status' in error) {
      const telemetryError = error as TelemetryError;
      return res.status(telemetryError.status || 500).json({
        success: false,
        error: telemetryError.message,
        details: telemetryError.details,
        timestamp: new Date().toISOString()
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
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
      const telemetryError = error as TelemetryError;
      return res.status(telemetryError.status || 500).json({
        success: false,
        error: telemetryError.message,
        details: telemetryError.details
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 