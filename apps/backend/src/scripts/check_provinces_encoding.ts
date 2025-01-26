import pg from 'pg';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend .env
config({ path: path.resolve(__dirname, '../../.env') });

async function checkProvincesEncoding() {
  logger.info('Starting provinces encoding check...');

  const pool = new pg.Pool({
    user: process.env.DB_WRITE_USER,
    password: process.env.DB_WRITE_PASSWORD,
    host: process.env.DB_WRITE_HOST,
    port: parseInt(process.env.DB_WRITE_PORT || '5432'),
    database: process.env.DB_WRITE_DATABASE,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Check database connection and encoding
    const encodingResult = await pool.query(`
      SELECT current_setting('client_encoding') as client_encoding,
             current_setting('server_encoding') as server_encoding
    `);
    logger.info('Database encoding settings:', encodingResult.rows[0]);

    // Check provinces data
    const provinces = await pool.query(`
      SELECT id, name_th, name_en, 
             octet_length(name_th) as thai_bytes,
             char_length(name_th) as thai_chars
      FROM provinces_new 
      ORDER BY id
    `);

    logger.info('\nChecking provinces data:');
    provinces.rows.forEach(row => {
      logger.info(`ID: ${row.id}`);
      logger.info(`Thai name: ${row.name_th}`);
      logger.info(`English name: ${row.name_en}`);
      logger.info(`Bytes/Chars ratio: ${row.thai_bytes}/${row.thai_chars}`);
      logger.info('---');
    });

  } catch (error) {
    logger.error('Error during provinces encoding check:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
checkProvincesEncoding().catch(error => {
  logger.error('Script failed:', error);
  process.exit(1);
}); 