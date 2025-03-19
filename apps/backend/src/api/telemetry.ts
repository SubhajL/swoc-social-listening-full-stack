import express from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { getTelemetryData, testTelemetryService, getStationList } from '../services/rid-telemetry/telemetry.service';
import type { TelemetryError } from '../services/rid-telemetry/types';

const router = express.Router();

// Validation schema for query parameters
const TelemetryQuerySchema = z.object({
  station_id: z.string()
});

/**
 * GET /api/telemetry/:station_id
 * 
 * Fetches telemetry data for a specific station
 */
router.get('/:station_id', async (req, res) => {
  try {
    const { station_id } = req.params;
    
    if (!station_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: station_id'
      });
    }
    
    logger.info('Fetching telemetry data for station', 'TelemetryAPI', {
      station_id,
      timestamp: new Date().toISOString(),
      client_ip: req.ip,
      user_agent: req.get('user-agent')
    });
    
    // Format date in Thai Buddhist calendar format (dd/MM/yyyy)
    // Use Thai timezone (UTC+7)
    const now = new Date();
    // Adjust for Thai timezone (UTC+7)
    const thaiTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    const buddhistYear = thaiTime.getFullYear() + 543;
    const time_start = `${thaiTime.getDate().toString().padStart(2, '0')}/${(thaiTime.getMonth() + 1).toString().padStart(2, '0')}/${buddhistYear}`;

    logger.info('Using Thai date format for telemetry request', 'TelemetryAPI', {
      station_id,
      thaiDate: time_start,
      utcTime: now.toISOString()
    });

    // Get telemetry data with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Telemetry API request timed out')), 15000);
    });
    
    const dataPromise = getTelemetryData({
      stationid: station_id,
      timestart: time_start
    });
    
    // Race the data promise against the timeout
    const telemetryData = await Promise.race([dataPromise, timeoutPromise]) as Awaited<typeof dataPromise>;

    logger.info('Successfully fetched telemetry data', 'TelemetryAPI', {
      station_id,
      dataPoints: Array.isArray(telemetryData.data) ? telemetryData.data.length : 0,
      timestamp: new Date().toISOString()
    });

    // Add cache control headers
    res.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
    return res.json(telemetryData);
  } catch (error) {
    // Check if it's a timeout error
    if (error instanceof Error && error.message === 'Telemetry API request timed out') {
      logger.error('Telemetry API request timed out', 'TelemetryAPI', {
        station_id: req.params.station_id,
        timeout: '15s'
      });
      
      return res.status(504).json({
        success: false,
        error: 'Gateway Timeout',
        details: 'The request to the telemetry service timed out. Please try again later.'
      });
    }
    
    logger.error('Failed to fetch telemetry data', 'TelemetryAPI', { 
      error: error instanceof Error ? error.message : String(error),
      station_id: req.params.station_id,
      stack: error instanceof Error ? error.stack : undefined
    });

    if (error instanceof Error && 'status' in error) {
      const telemetryError = error as TelemetryError;
      return res.status(telemetryError.status || 500).json({
        success: false,
        error: telemetryError.message,
        details: telemetryError.details
      });
    }

    // Return a more user-friendly error response
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      retry_after: 60 // Suggest client retry after 60 seconds
    });
  }
});

/**
 * GET /api/telemetry/test
 * Test endpoint that fetches data for a known valid station
 */
router.get('/test', async (req, res) => {
  try {
    logger.info('Testing telemetry endpoint', 'TelemetryAPI', {
      timestamp: new Date().toISOString(),
      client_ip: req.ip
    });
    
    // Set a timeout for the test request
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Test request timed out')), 10000);
    });
    
    const dataPromise = testTelemetryService();
    
    // Race the data promise against the timeout
    const telemetryData = await Promise.race([dataPromise, timeoutPromise]) as Awaited<typeof dataPromise>;

    logger.info('Test endpoint succeeded', 'TelemetryAPI', {
      response: telemetryData,
      timestamp: new Date().toISOString()
    });

    return res.json(telemetryData);
  } catch (error) {
    // Check if it's a timeout error
    if (error instanceof Error && error.message === 'Test request timed out') {
      logger.error('Telemetry test request timed out', 'TelemetryAPI', {
        timeout: '10s'
      });
      
      return res.status(504).json({
        success: false,
        error: 'Gateway Timeout',
        details: 'The test request to the telemetry service timed out. Please try again later.'
      });
    }
    
    logger.error('Test endpoint failed', 'TelemetryAPI', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return res.status(500).json({
      success: false,
      error: 'Telemetry test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      retry_after: 30 // Suggest client retry after 30 seconds
    });
  }
});

/**
 * GET /api/telemetry/stations
 * 
 * Fetches list of available telemetry stations
 */
router.get('/stations', async (req, res) => {
  try {
    logger.info('Fetching telemetry stations list', 'TelemetryAPI', {
      timestamp: new Date().toISOString(),
      client_ip: req.ip
    });
    
    // Use hydro ID 7 as it's used in test scripts
    const hydroId = '7';
    
    // Set a timeout for the stations request
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Stations request timed out')), 10000);
    });
    
    const dataPromise = getStationList(hydroId);
    
    // Race the data promise against the timeout
    const stationList = await Promise.race([dataPromise, timeoutPromise]) as Awaited<typeof dataPromise>;

    logger.info('Successfully fetched station list', 'TelemetryAPI', {
      totalStations: stationList.data?.length || 0,
      timestamp: new Date().toISOString()
    });

    // Add cache control headers - station list can be cached longer
    res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    return res.json(stationList);
  } catch (error) {
    // Check if it's a timeout error
    if (error instanceof Error && error.message === 'Stations request timed out') {
      logger.error('Telemetry stations request timed out', 'TelemetryAPI', {
        timeout: '10s'
      });
      
      return res.status(504).json({
        success: false,
        error: 'Gateway Timeout',
        details: 'The request to fetch station list timed out. Please try again later.'
      });
    }
    
    logger.error('Failed to fetch station list', 'TelemetryAPI', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch station list',
      details: error instanceof Error ? error.message : 'Unknown error',
      retry_after: 60 // Suggest client retry after 60 seconds
    });
  }
});

export default router; 