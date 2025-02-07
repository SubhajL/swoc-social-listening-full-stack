import { Router } from 'express';
import { pool } from '../config/db';

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
    } else if (province) {
      query += ` AND province = $${params.length + 1}`;
      params.push(province);
    }
    
    const { rows } = await pool.query<TelemetryStation>(query, params);
    
    // TODO: In a real implementation, we would fetch real-time water level and flow rate data
    // from a telemetry system or another data source. For now, we'll return mock data.
    const stations: TelemetryStationWithMeasurements[] = rows.map(station => ({
      ...station,
      water_level: Math.random() * 10, // Mock water level between 0-10 meters
      flow_rate: Math.random() * 100,  // Mock flow rate between 0-100 m³/s
    }));

    res.json({
      stations,
      total: stations.length,
    });
  } catch (error) {
    console.error('Error fetching telemetry stations:', error);
    res.status(500).json({ error: 'Failed to fetch telemetry stations' });
  }
});

export default router; 