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
    let query = `
      SELECT *
      FROM reservoir
      WHERE 1=1
    `;

    const values: string[] = [];
    let paramCount = 1;

    if (amphure) {
      query += ` AND amphure = $${paramCount}`;
      values.push(amphure);
      paramCount++;
    } else if (province) {
      query += ` AND province = $${paramCount}`;
      values.push(province);
      paramCount++;
    }

    query += ` ORDER BY sequence_number ASC NULLS LAST`;

    const { rows } = await pool.query(query, values);

    logger.info('✅ Successfully processed reservoirs', {
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

export default router; 