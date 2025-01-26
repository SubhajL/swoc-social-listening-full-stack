import pg from 'pg';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend .env
config({ path: path.resolve(__dirname, '../../.env') });

async function checkAmphuresEncoding() {
  logger.info('Starting amphures encoding check...');

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

    // Check amphures data with province info
    const amphures = await pool.query(`
      SELECT 
        a.id, 
        a.name_th, 
        a.name_en,
        p.name_th as province_th,
        p.name_en as province_en,
        octet_length(a.name_th) as thai_bytes,
        char_length(a.name_th) as thai_chars
      FROM amphures_new a
      JOIN provinces_new p ON a.province_id = p.id
      ORDER BY a.province_id, a.id
      LIMIT 50
    `);

    logger.info('\nChecking amphures data (showing first 50 records):');
    amphures.rows.forEach(row => {
      logger.info(`ID: ${row.id}`);
      logger.info(`Thai name: ${row.name_th}`);
      logger.info(`English name: ${row.name_en}`);
      logger.info(`Province: ${row.province_th} (${row.province_en})`);
      logger.info(`Bytes/Chars ratio: ${row.thai_bytes}/${row.thai_chars}`);
      logger.info('---');
    });

    // Get some statistics
    const stats = await pool.query(`
      SELECT 
        MIN(octet_length(name_th)) as min_bytes,
        MAX(octet_length(name_th)) as max_bytes,
        MIN(char_length(name_th)) as min_chars,
        MAX(char_length(name_th)) as max_chars,
        COUNT(*) as total_records
      FROM amphures_new
    `);

    logger.info('\nAmphures encoding statistics:');
    logger.info(`Total records: ${stats.rows[0].total_records}`);
    logger.info(`Min bytes: ${stats.rows[0].min_bytes}`);
    logger.info(`Max bytes: ${stats.rows[0].max_bytes}`);
    logger.info(`Min chars: ${stats.rows[0].min_chars}`);
    logger.info(`Max chars: ${stats.rows[0].max_chars}`);

  } catch (error) {
    logger.error('Error during amphures encoding check:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
checkAmphuresEncoding().catch(error => {
  logger.error('Script failed:', error);
  process.exit(1);
}); 