import pg from 'pg';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '../../.env') });

const pool = new pg.Pool({
  user: process.env.DB_WRITE_USER,
  password: process.env.DB_WRITE_PASSWORD,
  host: process.env.DB_WRITE_HOST,
  port: parseInt(process.env.DB_WRITE_PORT || '5432'),
  database: process.env.DB_WRITE_DATABASE,
  ssl: process.env.DB_WRITE_SSL === 'true' ? {
    rejectUnauthorized: false
  } : undefined
});

async function checkPostCoordinates() {
  const client = await pool.connect();
  
  try {
    logger.info('Checking post coordinates...');

    // Check posts without coordinates but with location data
    const missingCoords = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE array_length(tumbon, 1) > 0) as has_tumbon,
        COUNT(*) FILTER (WHERE array_length(amphure, 1) > 0) as has_amphure,
        COUNT(*) FILTER (WHERE array_length(province, 1) > 0) as has_province
      FROM processed_posts
      WHERE (latitude IS NULL OR longitude IS NULL);
    `);

    logger.info('Posts missing coordinates:', {
      total: missingCoords.rows[0].total,
      withTumbon: missingCoords.rows[0].has_tumbon,
      withAmphure: missingCoords.rows[0].has_amphure,
      withProvince: missingCoords.rows[0].has_province
    });

    // Check posts with coordinates
    const withCoords = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE array_length(tumbon, 1) > 0) as has_tumbon,
        COUNT(*) FILTER (WHERE array_length(amphure, 1) > 0) as has_amphure,
        COUNT(*) FILTER (WHERE array_length(province, 1) > 0) as has_province
      FROM processed_posts
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
    `);

    logger.info('Posts with coordinates:', {
      total: withCoords.rows[0].total,
      withTumbon: withCoords.rows[0].has_tumbon,
      withAmphure: withCoords.rows[0].has_amphure,
      withProvince: withCoords.rows[0].has_province
    });

    // Sample some posts without coordinates
    const samplePosts = await client.query(`
      SELECT 
        processed_post_id,
        text,
        tumbon,
        amphure,
        province,
        latitude,
        longitude
      FROM processed_posts
      WHERE (latitude IS NULL OR longitude IS NULL)
        AND (
          array_length(tumbon, 1) > 0 OR 
          array_length(amphure, 1) > 0 OR 
          array_length(province, 1) > 0
        )
      LIMIT 5;
    `);

    if (samplePosts.rows.length > 0) {
      logger.info('Sample posts missing coordinates:');
      samplePosts.rows.forEach(post => {
        logger.info({
          id: post.processed_post_id,
          text: post.text.substring(0, 100) + '...',
          tumbon: post.tumbon,
          amphure: post.amphure,
          province: post.province
        });
      });
    }

  } catch (error) {
    logger.error('Error checking post coordinates:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the check
checkPostCoordinates().catch(error => {
  logger.error('Failed to check post coordinates:', error);
  process.exit(1);
}); 