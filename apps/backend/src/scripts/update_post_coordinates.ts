import pg from 'pg';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '../../.env') });

const pool = new Pool({
  user: process.env.DB_WRITE_USER,
  password: process.env.DB_WRITE_PASSWORD,
  host: process.env.DB_WRITE_HOST,
  port: parseInt(process.env.DB_WRITE_PORT || '5432'),
  database: process.env.DB_WRITE_DATABASE,
  ssl: process.env.DB_WRITE_SSL === 'true' ? {
    rejectUnauthorized: false
  } : undefined
});

interface QueryResultRow {
  message?: string;
  [key: string]: unknown;
}

async function updatePostCoordinates() {
  const client = await pool.connect();
  
  try {
    logger.info('Starting post coordinates update...');
    
    // Create temporary table for updates
    await client.query(`
      CREATE TEMP TABLE post_updates AS
      WITH location_hierarchy AS (
        SELECT 
          pp.processed_post_id,
          COALESCE(
            -- Try tumbon first
            (
              SELECT jsonb_build_object('lat', t.latitude, 'lng', t.longitude, 'source', 'tumbon')
              FROM tumbons t
              WHERE t.name_th = ANY(pp.tumbon)
                AND t.latitude IS NOT NULL 
                AND t.longitude IS NOT NULL
              LIMIT 1
            ),
            -- Then try amphure
            (
              SELECT jsonb_build_object('lat', a.latitude, 'lng', a.longitude, 'source', 'amphure')
              FROM amphures a
              WHERE a.name_th = ANY(pp.amphure)
                AND a.latitude IS NOT NULL 
                AND a.longitude IS NOT NULL
              LIMIT 1
            ),
            -- Finally try province
            (
              SELECT jsonb_build_object('lat', p.latitude, 'lng', p.longitude, 'source', 'province')
              FROM provinces p
              WHERE p.name_th = ANY(pp.province)
                AND p.latitude IS NOT NULL 
                AND p.longitude IS NOT NULL
              LIMIT 1
            )
          ) as location_data
        FROM processed_posts pp
        WHERE (pp.latitude IS NULL OR pp.longitude IS NULL)
          AND (
            array_length(pp.tumbon, 1) > 0 OR 
            array_length(pp.amphure, 1) > 0 OR 
            array_length(pp.province, 1) > 0
          )
      )
      SELECT 
        processed_post_id,
        (location_data->>'lat')::numeric as latitude,
        (location_data->>'lng')::numeric as longitude,
        location_data->>'source' as source
      FROM location_hierarchy
      WHERE location_data IS NOT NULL;
    `);

    // Get update summary
    const summaryResult = await client.query(`
      SELECT 
        source,
        COUNT(*) as count
      FROM post_updates
      GROUP BY source
      ORDER BY count DESC;
    `);

    logger.info('Update summary:');
    summaryResult.rows.forEach(row => {
      logger.info(`- ${row.source}: ${row.count} posts`);
    });

    // Perform the update
    const updateResult = await client.query(`
      UPDATE processed_posts pp
      SET 
        latitude = pu.latitude,
        longitude = pu.longitude
      FROM post_updates pu
      WHERE pp.processed_post_id = pu.processed_post_id
      RETURNING pp.processed_post_id;
    `);

    logger.info(`Total posts updated: ${updateResult.rowCount}`);

    // Drop temporary table
    await client.query('DROP TABLE post_updates;');
    
    logger.info('Post coordinates update completed successfully');
  } catch (error) {
    logger.error('Error updating post coordinates:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the update
updatePostCoordinates().catch(error => {
  logger.error('Failed to update post coordinates:', error);
  process.exit(1);
}); 