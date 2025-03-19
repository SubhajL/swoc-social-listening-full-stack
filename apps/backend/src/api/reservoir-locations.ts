import { Router } from 'express';
import { pool } from '../lib/db';
import { logger } from '../utils/logger';

const router = Router();

interface ReservoirLocation {
  id: number;
  reservoir_name: string;
  reservoir_lat?: string;
  reservoir_long?: string;
  agency_id?: number;
  ground_level?: number;
  left_bank?: number;
  right_bank?: number;
  is_warning?: boolean;
  province?: string;
  amphure?: string;
  tambon?: string;
  created_at?: string;
  updated_at?: string;
  data_source?: string;
  reservoir_id?: string;
}

/**
 * GET /api/reservoir-locations
 * Fetches reservoir locations from the PostgreSQL database
 * Can be filtered by amphure and/or province
 */
router.get('/', async (req, res) => {
  const amphure = typeof req.query.amphure === 'string' ? req.query.amphure : undefined;
  const province = typeof req.query.province === 'string' ? req.query.province : undefined;

  logger.info('🔍 Fetching reservoir locations', {
    filterCriteria: amphure ? `amphure=${amphure}` : province ? `province=${province}` : 'none',
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });

  try {
    let query = `
      SELECT *
      FROM reservoir_locations
      WHERE 1=1
    `;

    const values: string[] = [];
    let paramCount = 1;

    if (amphure) {
      query += ` AND amphure ILIKE $${paramCount}`;
      values.push(`%${amphure}%`);
      paramCount++;
    }

    if (province) {
      query += ` AND province ILIKE $${paramCount}`;
      values.push(`%${province}%`);
      paramCount++;
    }

    query += ` ORDER BY id`;

    const { rows } = await pool.query(query, values);

    logger.info('✅ Successfully fetched reservoir locations', {
      totalLocations: rows.length,
      filterCriteria: amphure ? `amphure=${amphure}` : province ? `province=${province}` : 'none',
      timestamp: new Date().toISOString()
    });

    res.json({
      locations: rows,
      total: rows.length,
    });
  } catch (error) {
    logger.error('❌ Failed to fetch reservoir locations', {
      error: error instanceof Error ? error.message : 'Unknown error',
      filterCriteria: amphure ? `amphure=${amphure}` : province ? `province=${province}` : 'none',
      origin: req.headers.origin,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({ 
      error: 'Failed to fetch reservoir locations',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 