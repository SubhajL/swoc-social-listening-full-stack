import { Request, Response } from 'express';
import { getLatestRainfallData, getRainfallDataByLocation } from '../services/thaiwater/thaiwater-db.service';
import { logger } from '../utils/logger';

/**
 * GET /api/thaiwater/rainfall
 * Fetches rainfall data for a specific station or location
 */
export async function getRainfallDataHandler(req: Request, res: Response): Promise<void> {
  try {
    const { station_id, amphure, province } = req.query;
    const pool = req.app.locals.pool;
    
    // If station_id is provided, fetch data for that specific station
    if (station_id) {
      const stationId = parseInt(station_id as string, 10);
      
      if (isNaN(stationId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid station_id parameter'
        });
        return;
      }
      
      const data = await getLatestRainfallData(stationId, pool);
      
      if (!data) {
        res.status(404).json({
          success: false,
          error: 'No data found for the specified station'
        });
        return;
      }
      
      res.json({
        success: true,
        data
      });
      return;
    }
    
    // If amphure or province is provided, fetch data for that location
    if (amphure || province) {
      const data = await getRainfallDataByLocation(
        amphure as string | undefined,
        province as string | undefined,
        pool
      );
      
      res.json({
        success: true,
        data,
        count: data.length
      });
      return;
    }
    
    // If no parameters are provided, return an error
    res.status(400).json({
      success: false,
      error: 'Missing required parameters: station_id or amphure/province'
    });
    
  } catch (error) {
    logger.error('[ThaiWaterController] Error handling rainfall data request', {
      error: error instanceof Error ? error.message : String(error),
      query: req.query,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

/**
 * GET /api/thaiwater/stations
 * Fetches all ThaiWater stations, optionally filtered by location
 */
export async function getStationsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { amphure, province } = req.query;
    const pool = req.app.locals.pool;
    
    let query = `
      SELECT 
        tele_station_id, 
        tele_station_name, 
        tele_station_name_th, 
        tele_station_lat, 
        tele_station_long, 
        tele_station_type,
        province,
        amphure,
        tambon
      FROM thaiwater_tele_stations
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (amphure) {
      params.push(amphure);
      query += ` AND amphure = $${params.length}`;
    }
    
    if (province) {
      params.push(province);
      query += ` AND province = $${params.length}`;
    }
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      stations: result.rows,
      count: result.rows.length
    });
    
  } catch (error) {
    logger.error('[ThaiWaterController] Error handling stations request', {
      error: error instanceof Error ? error.message : String(error),
      query: req.query,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
} 