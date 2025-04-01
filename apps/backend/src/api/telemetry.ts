import express from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { getTelemetryData, getStationList, getTelemetryDataByTimeRange } from '../services/telemetry/telemetry.service';
import { checkMaeTangStations } from '../services/debug/mae-tang-checker';
import pkg from 'pg';
const { Pool } = pkg;

// Initialize database connection pool with credentials from .env
const debugPool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

const router = express.Router();

// Validation schema for query parameters
const TelemetryQuerySchema = z.object({
  station_id: z.string(),
  start_time: z.string().optional(),
  end_time: z.string().optional()
});

/**
 * GET /api/telemetry/stations
 * 
 * Fetches list of available telemetry stations
 * Searches for stations by amphure first, then by province if no results found for amphure
 */
router.get('/stations', async (req, res) => {
  // Add backend log in the /stations route
  console.log('📡 Received GET /api/telemetry/stations');
  
  try {
    const { amphure, province } = req.query;
    
    // Log detailed query information
    console.log('[Backend] Telemetry stations request details:', {
      query: req.query,
      amphure: amphure ? {
        value: String(amphure),
        type: typeof amphure,
        length: String(amphure).length,
        hexEncoded: Buffer.from(String(amphure)).toString('hex')
      } : undefined,
      province: province ? {
        value: String(province),
        type: typeof province,
        length: String(province).length,
        hexEncoded: Buffer.from(String(province)).toString('hex')
      } : undefined,
      path: req.path,
      url: req.url,
      originalUrl: req.originalUrl,
      timestamp: new Date().toISOString()
    });

    // Log the raw query parameters for debugging
    logger.info('Fetching telemetry stations list with parameters', 'TelemetryAPI', {
      rawAmphure: amphure,
      rawProvince: province,
      amphureType: typeof amphure,
      provinceType: typeof province,
      headers: req.headers,
      timestamp: new Date().toISOString(),
      client_ip: req.ip,
      user_agent: req.get('user-agent')
    });

    // Ensure parameters are strings or undefined
    const amphureStr = amphure ? String(amphure) : undefined;
    const provinceStr = province ? String(province) : undefined;
    
    logger.info('Normalized parameters for database query', 'TelemetryAPI', {
      amphureStr,
      provinceStr,
      amphureEncoded: amphureStr ? encodeURIComponent(amphureStr) : undefined,
      provinceEncoded: provinceStr ? encodeURIComponent(provinceStr) : undefined,
      amphureCharCodes: amphureStr ? Array.from(amphureStr).map(c => c.charCodeAt(0)) : [],
      provinceCharCodes: provinceStr ? Array.from(provinceStr).map(c => c.charCodeAt(0)) : []
    });
    
    if (!amphureStr && !provinceStr) {
      logger.warn('Request missing both amphure and province parameters', 'TelemetryAPI', {
        timestamp: new Date().toISOString(),
        client_ip: req.ip
      });
      
      return res.status(400).json({
        success: false,
        error: 'Missing location parameters',
        message: 'Either amphure or province parameter is required'
      });
    }
    
    logger.info('Fetching telemetry stations with location search strategy', 'TelemetryAPI', {
      amphure: amphureStr,
      province: provinceStr,
      strategy: amphureStr ? 'amphure-first-then-province-fallback' : 'province-only',
      timestamp: new Date().toISOString()
    });
    
    const response = await getStationList(amphureStr, provinceStr);

    if (!response.success) {
      logger.error('Failed to fetch station list from database', 'TelemetryAPI', {
        error: response.error,
        amphure: amphureStr,
        province: provinceStr
      });
      
      return res.status(500).json(response);
    }

    logger.info('Station search results', 'TelemetryAPI', {
      totalStations: response.data.length,
      amphure: amphureStr,
      province: provinceStr,
      firstStationSample: response.data.length > 0 ? {
        id: response.data[0].id,
        station_id: response.data[0].station_id,
        station_name: response.data[0].station_name,
        amphure: (response.data[0] as any).amphure,
        province: (response.data[0] as any).province
      } : null,
      timestamp: new Date().toISOString()
    });

    // Add cache control headers - station list can be cached longer
    res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    // Include location info in the response
    return res.json({
      ...response,
      location: {
        amphure: amphureStr,
        province: provinceStr
      }
    });
  } catch (error) {
    logger.error('Failed to fetch station list', 'TelemetryAPI', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      amphure: req.query.amphure,
      province: req.query.province
    });

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch station list',
      details: error instanceof Error ? error.message : 'Unknown error',
      retry_after: 60 // Suggest client retry after 60 seconds
    });
  }
});

/**
 * GET /api/telemetry/debug/stations
 * Debug endpoint to get information about the telemetry_data_stations table
 * Only available in development mode
 */
router.get('/debug/stations', async (req, res) => {
  // Only allow this endpoint in development mode
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: 'Debug endpoints are not available in production'
    });
  }
  
  try {
    const { amphure, province, limit = '10' } = req.query;
    
    logger.info('Debug query for telemetry stations', 'TelemetryAPI', {
      amphure,
      province,
      limit,
      timestamp: new Date().toISOString()
    });
    
    // Execute raw query for debugging
    const query = `
      SELECT station_id, station_name, amphure, province, status, 
             encode(convert_to(amphure, 'UTF8'), 'hex') as amphure_hex
      FROM telemetry_data_stations
      WHERE 1=1
      ${amphure ? `AND amphure = '${String(amphure).replace(/'/g, "''")}'` : ''}
      ${province ? `AND province = '${String(province).replace(/'/g, "''")}'` : ''}
      LIMIT ${parseInt(String(limit)) || 10}
    `;
    
    const { rows } = await debugPool.query(query);
    
    // Get total stations count as well
    const countQuery = `
      SELECT COUNT(*) FROM telemetry_data_stations
      WHERE 1=1
      ${amphure ? `AND amphure = '${String(amphure).replace(/'/g, "''")}'` : ''}
      ${province ? `AND province = '${String(province).replace(/'/g, "''")}'` : ''}
    `;
    
    const countResult = await debugPool.query(countQuery);
    const totalCount = countResult.rows[0].count;
    
    return res.json({
      success: true,
      query: query,
      parameters: {
        amphure,
        province,
        limit
      },
      count: rows.length,
      totalMatchingStations: parseInt(totalCount),
      stations: rows,
      hexValues: {
        queryAmphure: amphure ? Buffer.from(String(amphure)).toString('hex') : null,
        queryProvince: province ? Buffer.from(String(province)).toString('hex') : null,
        normalizedQueryAmphure: amphure ? Buffer.from(String(amphure).normalize('NFC')).toString('hex') : null
      }
    });
  } catch (error) {
    logger.error('Debug query failed', 'TelemetryAPI', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return res.status(500).json({
      success: false,
      error: 'Debug query failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/telemetry/debug/mae-tang
 * Special debug endpoint for แม่แตง (Mae Tang) stations
 */
router.get('/debug/mae-tang', async (req, res) => {
  try {
    const results = await checkMaeTangStations();
    return res.json(results);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/telemetry/:station_id
 * 
 * Fetches telemetry data for a specific station
 */
router.get('/:station_id', async (req, res) => {
  try {
    const { station_id } = req.params;
    const { start_time, end_time } = req.query;
    
    if (!station_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: station_id'
      });
    }
    
    logger.info('Fetching telemetry data for station', 'TelemetryAPI', {
      station_id,
      start_time,
      end_time,
      timestamp: new Date().toISOString(),
      client_ip: req.ip,
      user_agent: req.get('user-agent')
    });

    let response;
    if (start_time && end_time) {
      // If time range is provided, fetch data for that range
      response = await getTelemetryDataByTimeRange(
        station_id,
        new Date(start_time as string),
        new Date(end_time as string)
      );
    } else {
      // Otherwise fetch last 24 hours of data
      response = await getTelemetryData(station_id);
    }

    if (!response.success) {
      return res.status(500).json(response);
    }

    logger.info('Successfully fetched telemetry data', 'TelemetryAPI', {
      station_id,
      dataPoints: response.data.length,
      timestamp: new Date().toISOString()
    });

    // Add cache control headers
    res.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
    return res.json(response);
  } catch (error) {
    logger.error('Failed to fetch telemetry data', 'TelemetryAPI', { 
      error: error instanceof Error ? error.message : String(error),
      station_id: req.params.station_id,
      stack: error instanceof Error ? error.stack : undefined
    });

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      retry_after: 60 // Suggest client retry after 60 seconds
    });
  }
});

/**
 * GET /api/telemetry/stations/filter
 * 
 * Fetches list of available telemetry stations filtered by amphure and province
 * Returns only stations that exactly match the provided location
 */
router.get('/stations/filter', async (req, res) => {
  try {
    const { amphure, province } = req.query;
    
    logger.info('Fetching telemetry stations with exact location filter', 'TelemetryAPI', {
      amphure,
      province,
      timestamp: new Date().toISOString()
    });
    
    // Ensure parameters are strings or undefined
    const amphureStr = amphure ? String(amphure) : undefined;
    const provinceStr = province ? String(province) : undefined;
    
    if (!amphureStr && !provinceStr) {
      return res.status(400).json({
        success: false,
        error: 'Missing location parameters',
        message: 'Either amphure or province parameter is required'
      });
    }
    
    // Query database directly for exact matches
    const queryParams = [];
    let queryConditions = [];
    
    if (amphureStr) {
      queryParams.push(amphureStr);
      queryConditions.push(`amphure = $${queryParams.length}`);
    }
    
    if (provinceStr) {
      queryParams.push(provinceStr);
      queryConditions.push(`province = $${queryParams.length}`);
    }
    
    const query = `
      SELECT 
        id,
        station_id,
        station_code,
        station_name,
        hydro_id,
        hydro_name,
        basin_id,
        basin_name,
        province,
        amphure,
        latitude,
        longitude,
        status
      FROM telemetry_data_stations
      WHERE ${queryConditions.join(' AND ')}
      ORDER BY station_name
    `;
    
    const client = await debugPool.connect();
    try {
      const result = await client.query(query, queryParams);
      
      logger.info('Station filter results', 'TelemetryAPI', {
        totalStations: result.rows.length,
        amphure: amphureStr,
        province: provinceStr,
        timestamp: new Date().toISOString()
      });
      
      // Add cache control headers
      res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      
      return res.json({
        success: true,
        data: result.rows,
        location: {
          amphure: amphureStr,
          province: provinceStr
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Failed to fetch filtered station list', 'TelemetryAPI', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      amphure: req.query.amphure,
      province: req.query.province
    });

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch filtered station list',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/telemetry/data/:stationId
 * 
 * Fetches telemetry data for a specific station
 */
router.get('/data/:stationId', async (req, res) => {
  try {
    const { stationId } = req.params;
    
    logger.info('Fetching telemetry data for station', 'TelemetryAPI', {
      stationId,
      timestamp: new Date().toISOString()
    });
    
    if (!stationId) {
      return res.status(400).json({
        success: false,
        error: 'Missing station ID',
        message: 'Station ID is required'
      });
    }
    
    const client = await debugPool.connect();
    try {
      // Query the latest telemetry data for this station
      const query = `
        SELECT 
          d.station_id,
          d.reading_time,
          d.water_level,
          d.flow_rate,
          s.station_name,
          s.province,
          s.amphure
        FROM telemetry_data d
        JOIN telemetry_data_stations s ON d.station_id = s.station_id
        WHERE d.station_id = $1
        ORDER BY d.reading_time DESC
        LIMIT 1
      `;
      
      const result = await client.query(query, [stationId]);
      
      if (result.rows.length === 0) {
        logger.warn('No telemetry data found for station', 'TelemetryAPI', {
          stationId,
          timestamp: new Date().toISOString()
        });
        
        return res.status(404).json({
          success: false,
          error: 'No data found',
          message: `No telemetry data found for station ${stationId}`
        });
      }
      
      // Add cache control headers - telemetry data should have a shorter cache time
      res.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
      
      return res.json({
        success: true,
        data: result.rows[0]
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Failed to fetch telemetry data', 'TelemetryAPI', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      stationId: req.params.stationId
    });

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch telemetry data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Export router
export default router; 