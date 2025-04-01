import { Router } from 'express';
import { pool } from '../lib/db';
import { logger } from '../utils/logger';

const router = Router();

interface Reservoir {
  id: number;
  sequence_number: string | null;
  irrigation_office: string | null;
  reservoir_name: string | null;
  river_basin: string | null;
  river_name: string | null;
  amphure: string | null;
  province: string | null;
  normal_storage_capacity: string | null;
  minimum_storage_capacity: string | null;
  type: string | null;
  reservoir_id?: string | null;
}

interface ReservoirData {
  id: number;
  reservoir_id: string;
  reservoir_name: string;
  storage: number | null;
  dead_storage: number | null;
  volume: number | null;
  inflow: number | null;
  outflow: number | null;
  date: string;
  type: string;
  data_source: string;
  created_at: string;
  updated_at: string;
}

router.get('/', async (req, res) => {
  const amphure = typeof req.query.amphure === 'string' ? req.query.amphure : undefined;
  const province = typeof req.query.province === 'string' ? req.query.province : undefined;

  logger.info('🔍 Fetching reservoirs', {
    filterCriteria: amphure ? `amphure=${amphure}` : province ? `province=${province}` : 'none',
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });

  try {
    // Query from reservoir_locations table directly instead of reservoir table
    let query = `
      SELECT *
      FROM reservoir_locations
      WHERE 1=1
    `;

    const values: string[] = [];
    let paramCount = 1;

    if (amphure) {
      query += ` AND amphure = $${paramCount}`;
      values.push(amphure);
      paramCount++;
    } else if (province) {
      query += ` AND province ILIKE $${paramCount}`;
      values.push(`%${province}%`);
      paramCount++;
    }

    query += ` ORDER BY id`;

    const { rows } = await pool.query(query, values);

    logger.info('✅ Successfully processed reservoirs from reservoir_locations', {
      totalReservoirs: rows.length,
      filterCriteria: amphure ? `amphure=${amphure}` : province ? `province=${province}` : 'none',
      timestamp: new Date().toISOString()
    });

    res.json({
      reservoirs: rows,
      total: rows.length,
    });
  } catch (error) {
    logger.error('❌ Failed to fetch reservoirs', {
      error: error instanceof Error ? error.message : 'Unknown error',
      filterCriteria: amphure ? `amphure=${amphure}` : province ? `province=${province}` : 'none',
      origin: req.headers.origin,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({ 
      error: 'Failed to fetch reservoirs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Fetches the latest reservoir data from the reservoir_data table
 * Can be filtered by reservoir_id or reservoir_name
 */
router.get('/data', async (req, res) => {
  const reservoirId = typeof req.query.reservoir_id === 'string' ? req.query.reservoir_id : undefined;
  const reservoirName = typeof req.query.reservoir_name === 'string' ? req.query.reservoir_name : undefined;
  
  logger.info('🔍 Fetching reservoir data', {
    filterCriteria: reservoirId ? `reservoir_id=${reservoirId}` : reservoirName ? `reservoir_name=${reservoirName}` : 'none',
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });

  try {
    // Query to get the most recent data for each reservoir
    let query = `
      WITH latest_data AS (
        SELECT 
          DISTINCT ON (rd.reservoir_id) 
          rd.id,
          rd.reservoir_id,
          rd.reservoir_name,
          rd.storage,
          rd.dead_storage,
          rd.volume,
          rd.inflow,
          rd.outflow,
          rd.date,
          rd.type as type,
          CASE 
            WHEN rl.reservoir_name LIKE '%เขื่อน%' THEN 'dam'
            WHEN rl.reservoir_name LIKE '%อ่างเก็บน้ำ%' THEN 'reservoir'
            ELSE 'reservoir'
          END as data_source,
          rd.created_at,
          rd.updated_at
        FROM 
          reservoir_data rd
        LEFT JOIN
          reservoir_locations rl ON rd.reservoir_id = rl.reservoir_id
        WHERE 1=1
    `;

    const values: any[] = [];
    let paramCount = 1;

    if (reservoirId) {
      query += ` AND rd.reservoir_id = $${paramCount}`;
      values.push(reservoirId);
      paramCount++;
    }

    if (reservoirName) {
      query += ` AND rd.reservoir_name ILIKE $${paramCount}`;
      values.push(`%${reservoirName}%`);
      paramCount++;
    }

    query += `
        ORDER BY 
          rd.reservoir_id, 
          rd.date DESC,
          rd.updated_at DESC
      )
      SELECT * FROM latest_data
      ORDER BY reservoir_name
    `;

    const { rows } = await pool.query(query, values);

    logger.info('✅ Successfully processed reservoir data', {
      totalRecords: rows.length,
      filterCriteria: reservoirId ? `reservoir_id=${reservoirId}` : reservoirName ? `reservoir_name=${reservoirName}` : 'none',
      timestamp: new Date().toISOString()
    });

    res.json({
      reservoir_data: rows,
      total: rows.length,
    });
  } catch (error) {
    logger.error('❌ Failed to fetch reservoir data', {
      error: error instanceof Error ? error.message : 'Unknown error',
      filterCriteria: reservoirId ? `reservoir_id=${reservoirId}` : reservoirName ? `reservoir_name=${reservoirName}` : 'none',
      origin: req.headers.origin,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({ 
      error: 'Failed to fetch reservoir data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 