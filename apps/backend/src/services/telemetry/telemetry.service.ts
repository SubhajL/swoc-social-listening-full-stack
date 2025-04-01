import pkg from 'pg';
const { Pool } = pkg;

import { logger } from '../../utils/logger';
import type { TelemetryResponse } from './types';

// Initialize database connection pool with credentials from .env
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

/**
 * Fetches telemetry data for a specific station from the database
 */
export async function getTelemetryData(stationId: string): Promise<TelemetryResponse> {
  try {
    logger.info('Fetching telemetry data from database', 'TelemetryService', {
      stationId,
      timestamp: new Date().toISOString()
    });

    // First query to check if the station exists and what its status is
    const stationQuery = `
      SELECT station_id, station_name, status 
      FROM telemetry_data_stations 
      WHERE station_id = $1
    `;
    
    const stationResult = await pool.query(stationQuery, [stationId]);
    
    if (stationResult.rows.length === 0) {
      logger.warn('Station not found in database', 'TelemetryService', { stationId });
      return {
        success: false,
        data: [],
        error: `Station with ID ${stationId} not found`
      };
    }
    
    // Log the station status
    const status = stationResult.rows[0].status;
    logger.info('Station status', 'TelemetryService', { 
      stationId, 
      status, 
      stationName: stationResult.rows[0].station_name 
    });

    const query = `
      SELECT s.*, d.*
      FROM telemetry_data_stations s
      LEFT JOIN telemetry_data d ON s.station_id = d.station_id
      WHERE s.station_id = $1
      AND d.reading_time >= NOW() - INTERVAL '24 hours'
      ORDER BY d.reading_time DESC
    `;

    const result = await pool.query(query, [stationId]);

    logger.info('Successfully fetched telemetry data from database', 'TelemetryService', {
      stationId,
      dataPoints: result.rows.length,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      data: result.rows
    };
  } catch (error) {
    logger.error('Failed to fetch telemetry data from database', 'TelemetryService', {
      error: error instanceof Error ? error.message : String(error),
      stationId
    });

    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Fetches list of all active telemetry stations with their latest readings
 * Searches by amphure first, and if no results are found, by province
 */
export async function getStationList(amphure?: string, province?: string): Promise<TelemetryResponse> {
  try {
    // Log received parameters (original)
    logger.info('[Debug] Received params - amphure:', amphure, "province:", province);

    // Normalize parameters to NFC form explicitly
    const normalizedAmphure = amphure ? amphure.normalize('NFC') : undefined;
    const normalizedProvince = province ? province.normalize('NFC') : undefined;
    
    // Log normalized parameters
    logger.info('[Debug] Normalized params - amphure:', normalizedAmphure, "province:", normalizedProvince);
    
    // Also inspect the binary representation for troubleshooting
    if (amphure) {
      logger.info('[Debug] Binary representation - original amphure:', 
        Buffer.from(amphure).toString('hex'));
      logger.info('[Debug] Binary representation - normalized amphure:', 
        Buffer.from(normalizedAmphure!).toString('hex'));
    }
    
    if (province) {
      logger.info('[Debug] Binary representation - original province:', 
        Buffer.from(province).toString('hex'));
      logger.info('[Debug] Binary representation - normalized province:', 
        Buffer.from(normalizedProvince!).toString('hex'));
    }
    
    logger.info('Fetching station list from database', 'TelemetryService', {
      amphure: normalizedAmphure, // Use normalized values for logging
      province: normalizedProvince, // Use normalized values for logging
      timestamp: new Date().toISOString()
    });

    // Base query remains the same
    const baseQuery = `
      SELECT s.*, d.water_level, d.flow_rate, d.reading_time
      FROM telemetry_data_stations s
      LEFT JOIN (
        SELECT DISTINCT ON (station_id) 
          station_id, water_level, flow_rate, reading_time
        FROM telemetry_data
        ORDER BY station_id, reading_time DESC
      ) d ON s.station_id = d.station_id
    `;
    
    // --- Start Refactored Query Logic ---
    let finalQuery = '';
    let params: string[] = [];
    let result;

    if (normalizedAmphure) {
      // Attempt to query by Amphure first
      finalQuery = `${baseQuery} WHERE s.amphure = $1 ORDER BY s.station_name`;
      params = [normalizedAmphure];
      logger.info('[TelemetryService] Attempting query by Amphure:', { query: finalQuery, params });
      result = await pool.query(finalQuery, params);
      logger.info('[TelemetryService] Amphure query result count:', result.rows.length);

      // If no results for Amphure AND Province is provided, try Province fallback
      if (result.rows.length === 0 && normalizedProvince) {
        logger.info('[TelemetryService] No results for Amphure, attempting fallback to Province:', { province: normalizedProvince });
        finalQuery = `${baseQuery} WHERE s.province = $1 ORDER BY s.station_name`;
        params = [normalizedProvince];
        logger.info('[TelemetryService] Attempting query by Province (fallback):', { query: finalQuery, params });
        result = await pool.query(finalQuery, params);
        logger.info('[TelemetryService] Province fallback query result count:', result.rows.length);
      }
    } else if (normalizedProvince) {
      // If only Province is provided, query by Province
      finalQuery = `${baseQuery} WHERE s.province = $1 ORDER BY s.station_name`;
      params = [normalizedProvince];
      logger.info('[TelemetryService] Attempting query by Province only:', { query: finalQuery, params });
      result = await pool.query(finalQuery, params);
      logger.info('[TelemetryService] Province query result count:', result.rows.length);
    } else {
      // If neither Amphure nor Province is provided, fetch all stations
      finalQuery = `${baseQuery} ORDER BY s.station_name`;
      params = [];
      logger.info('[TelemetryService] No location provided, fetching all stations:', { query: finalQuery });
      result = await pool.query(finalQuery, params);
      logger.info('[TelemetryService] All stations query result count:', result.rows.length);
    }
    // --- End Refactored Query Logic ---

    // Ensure result is defined (it should be after the refactored logic)
    if (!result) {
        logger.error('[TelemetryService] Query execution failed unexpectedly, result is undefined.');
        throw new Error('Failed to execute station query.');
    }

    return {
      success: true,
      data: result.rows
    };
  } catch (error) {
    logger.error('Failed to fetch station list from database', 'TelemetryService', {
      error: error instanceof Error ? error.message : String(error),
      amphure, // Log original amphure on error
      province // Log original province on error
    });

    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Fetches telemetry data for a specific station within a time range
 */
export async function getTelemetryDataByTimeRange(
  stationId: string,
  startTime: Date,
  endTime: Date
): Promise<TelemetryResponse> {
  try {
    logger.info('Fetching telemetry data by time range from database', 'TelemetryService', {
      stationId,
      startTime,
      endTime,
      timestamp: new Date().toISOString()
    });

    const query = `
      SELECT s.*, d.*
      FROM telemetry_data_stations s
      LEFT JOIN telemetry_data d ON s.station_id = d.station_id
      WHERE s.station_id = $1
      AND d.reading_time BETWEEN $2 AND $3
      ORDER BY d.reading_time DESC
    `;

    const result = await pool.query(query, [stationId, startTime, endTime]);

    logger.info('Successfully fetched telemetry data by time range from database', 'TelemetryService', {
      stationId,
      dataPoints: result.rows.length,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      data: result.rows
    };
  } catch (error) {
    logger.error('Failed to fetch telemetry data by time range from database', 'TelemetryService', {
      error: error instanceof Error ? error.message : String(error),
      stationId
    });

    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 