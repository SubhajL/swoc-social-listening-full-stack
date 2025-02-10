import { Router } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { getTelemetryData, testTelemetryService } from '../services/rid-telemetry/telemetry.service';
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
  station_id: z.string()
});

/**
 * GET /api/telemetry/test
 * Test endpoint that fetches data for a known valid station
 */
router.get('/test', async (req, res) => {
  try {
    logger.info('Testing telemetry endpoint', 'TelemetryAPI', {
      timestamp: new Date().toISOString()
    });
    
    const telemetryData = await testTelemetryService();

    logger.info('Test endpoint succeeded', 'TelemetryAPI', {
      response: telemetryData,
      timestamp: new Date().toISOString()
    });

    return res.json(telemetryData);
  } catch (error: unknown) {
    // Enhanced error logging with proper typing
    interface ErrorDetails {
      name: string;
      message: string;
      stack?: string;
      status?: number;
      details?: unknown;
      timestamp: string;
      response?: {
        status?: number;
        statusText?: string;
        data?: unknown;
        headers?: Record<string, string>;
        config?: {
          url?: string;
          method?: string;
          headers?: Record<string, string>;
          data?: unknown;
        };
      };
      code?: string;
    }

    const errorDetails: ErrorDetails = {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    };

    // Handle TelemetryError properties
    if (error instanceof Error && 'status' in error) {
      const telemetryError = error as TelemetryError;
      errorDetails.status = telemetryError.status;
      errorDetails.details = telemetryError.details;
    }

    // Handle response properties
    if (isErrorWithResponse(error)) {
      errorDetails.response = {
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
      };
      errorDetails.code = error.code;
    }

    logger.error('Test endpoint failed', 'TelemetryAPI', { 
      error: errorDetails,
      timestamp: new Date().toISOString()
    });
    
    // Return detailed error response with all available information
    return res.status(errorDetails.status || 500).json({
      success: false,
      error: errorDetails.message || 'Telemetry test failed',
      details: {
        ...errorDetails,
        telemetryError: errorDetails.details,
        response: errorDetails.response,
        code: errorDetails.code,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/telemetry
 * 
 * Fetches telemetry data for a specific station
 * Query parameters:
 * - station_id: string (required)
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

    const { station_id } = result.data;
    const time_start = new Date().toLocaleDateString('th-TH'); // Format date in Thai calendar

    // Get telemetry data
    const telemetryData = await getTelemetryData({
      station_id,
      time_start
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