import { Router } from 'express';
import { pool } from '../lib/db';
import { logger } from '../utils/logger';

const router = Router();

interface RainStation {
  id: number;
  sequence_number: string | null;
  station_id: string | null;
  station_name: string | null;
  code: string | null;
  irrigation_office: string | null;
  river_basin: string | null;
  river_name: string | null;
  amphure: string | null;
  province: string | null;
}

interface RainStationWithMeasurements extends RainStation {
  // These will be populated from another source later
  water_level: number;
  flow_rate: number;
  rainfall_3d: number;
  rainfall_7d: number;
}

router.get('/', async (req, res) => {
  const amphure = typeof req.query.amphure === 'string' ? req.query.amphure : undefined;
  const province = typeof req.query.province === 'string' ? req.query.province : undefined;
  
  logger.info('🔍 Rain Station Query Started', {
    amphure,
    province,
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
  
  try {
    let query = `
      SELECT 
        id,
        sequence_number,
        station_id, 
        station_name, 
        code, 
        irrigation_office,
        river_basin,
        river_name,
        amphure, 
        province
      FROM rain_station
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (amphure) {
      query += ` AND amphure = $${params.length + 1}`;
      params.push(amphure);
      logger.info(`🎯 Filtering by amphure: ${amphure}`);
    }
    
    if (province) {
      query += ` AND province = $${params.length + 1}`;
      params.push(province);
      logger.info(`🎯 Filtering by province: ${province}`);
    }
    
    logger.debug('📝 Executing query', { query, params });
    const { rows } = await pool.query<RainStation>(query, params);

    // Group stations by amphure for better logging
    const stationsByAmphure = rows.reduce((acc: Record<string, number>, station: RainStation) => {
      acc[station.amphure || 'unknown'] = (acc[station.amphure || 'unknown'] || 0) + 1;
      return acc;
    }, {});

    logger.info('📊 Query Results Summary', { 
      totalStations: rows.length,
      stationsByAmphure,
      province: rows[0]?.province || province,
      timestamp: new Date().toISOString()
    });

    // Detailed station logging
    logger.debug('📍 Station Details', {
      stations: rows.map((station: RainStation) => ({
        id: station.station_id,
        name: station.station_name,
        location: `${station.amphure}, ${station.province}`,
      }))
    });
    
    // TODO: In a real implementation, we would fetch real-time measurements
    // from a telemetry system or another data source. For now, we'll return mock data.
    const stations: RainStationWithMeasurements[] = rows.map((station: RainStation) => ({
      ...station,
      water_level: Math.random() * 10, // Mock water level between 0-10 meters
      flow_rate: Math.random() * 100,  // Mock flow rate between 0-100 m³/s
      rainfall_3d: Math.random() * 50,  // Mock 3-day rainfall between 0-50 mm
      rainfall_7d: Math.random() * 100, // Mock 7-day rainfall between 0-100 mm
    }));

    logger.info('✅ Successfully processed rain stations', {
      totalStations: stations.length,
      filterCriteria: amphure ? `amphure=${amphure}` : province ? `province=${province}` : 'none',
      timestamp: new Date().toISOString()
    });

    res.json({
      stations,
      total: stations.length,
    });
  } catch (error) {
    logger.error('❌ Failed to fetch rain stations', {
      error: error instanceof Error ? error.message : 'Unknown error',
      filterCriteria: amphure ? `amphure=${amphure}` : province ? `province=${province}` : 'none',
      origin: req.headers.origin,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({ 
      error: 'Failed to fetch rain stations',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 