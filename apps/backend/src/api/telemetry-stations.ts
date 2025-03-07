import { Router } from 'express';
import { pool } from '../lib/db';
import { logger } from '../utils/logger';

const router = Router();

interface TelemetryStation {
  id: number;
  station_id: string;
  station_name: string;
  code: string;
  irrigation_office: string;
  river_basin: string;
  river_name: string;
  amphure: string;
  province: string;
  bank_level_meters: string;
  capacity_cms: string;
  pole_center_msl: string;
}

interface TelemetryStationWithMeasurements extends TelemetryStation {
  water_level: number;
  flow_rate: number;
}

router.get('/', async (req, res) => {
  const { amphure, province } = req.query;
  
  logger.info('🔍 Telemetry Station Query Started', {
    amphure,
    province,
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
  
  try {
    let query = `
      SELECT 
        id,
        station_id, 
        station_name, 
        code, 
        irrigation_office,
        river_basin,
        river_name,
        amphure, 
        province,
        bank_level_meters,
        capacity_cms,
        pole_center_msl
      FROM telemetry_station
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (amphure) {
      query += ` AND amphure = $${params.length + 1}`;
      params.push(amphure);
      logger.info(`🎯 Filtering by amphure: ${amphure}`);
    } else if (province) {
      query += ` AND province = $${params.length + 1}`;
      params.push(province);
      logger.info(`🎯 Filtering by province: ${province}`);
    }
    
    logger.debug('📝 Executing query', { query, params });
    const { rows } = await pool.query<TelemetryStation>(query, params);

    // Log detailed station ID information from database
    logger.info('🔢 Station IDs from PostgreSQL', { 
      stationIds: rows.map(station => ({
        id: station.id,
        station_id: station.station_id,
        name: station.station_name
      }))
    });

    // Group stations by amphure for better logging
    const stationsByAmphure = rows.reduce((acc: Record<string, number>, station: TelemetryStation) => {
      acc[station.amphure] = (acc[station.amphure] || 0) + 1;
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
      stations: rows.map((station: TelemetryStation) => ({
        id: station.station_id,
        name: station.station_name,
        location: `${station.amphure}, ${station.province}`,
      }))
    });
    
    // TODO: In a real implementation, we would fetch real-time water level and flow rate data
    // from a telemetry system or another data source. For now, we'll return mock data.
    const stations: TelemetryStationWithMeasurements[] = rows.map((station: TelemetryStation) => ({
      ...station,
      water_level: Math.random() * 10, // Mock water level between 0-10 meters
      flow_rate: Math.random() * 100,  // Mock flow rate between 0-100 m³/s
    }));

    logger.info('✅ Successfully processed telemetry stations', {
      totalStations: stations.length,
      filterCriteria: amphure ? `amphure=${amphure}` : province ? `province=${province}` : 'none',
      timestamp: new Date().toISOString()
    });

    res.json({
      stations,
      total: stations.length,
    });
  } catch (error) {
    logger.error('❌ Failed to fetch telemetry stations', {
      error: error instanceof Error ? error.message : 'Unknown error',
      filterCriteria: amphure ? `amphure=${amphure}` : province ? `province=${province}` : 'none',
      origin: req.headers.origin,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({ 
      error: 'Failed to fetch telemetry stations',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 