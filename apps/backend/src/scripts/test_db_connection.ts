import { config } from 'dotenv';
import { logger } from '../utils/logger';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.resolve(__dirname, '../../.env') });
logger.info('Environment loaded');

const testDatabaseConnection = async () => {
  logger.info('Testing database connection...');
  
  // Log connection details (excluding sensitive info)
  logger.info('Database connection details:', {
    host: process.env.DB_WRITE_HOST,
    port: process.env.DB_WRITE_PORT,
    database: process.env.DB_WRITE_DATABASE,
    user: process.env.DB_WRITE_USER
  });
  
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
    logger.info('Connecting to database...');
    const client = await pool.connect();
    logger.info('Successfully connected to database');

    // Check current database
    const dbResult = await client.query('SELECT current_database() as db');
    logger.info('Connected to database:', dbResult.rows[0].db);

    // Check available tables
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    const tables = await client.query(tablesQuery);
    const tableNames = tables.rows.map(row => row.table_name);
    logger.info('Available tables:', tableNames);

    // Also check for "tambon" spelling
    const hasTumbons = tableNames.includes('tumbons');
    const hasTambon = tableNames.includes('tambon');
    const hasTambons = tableNames.includes('tambons');

    if (hasTumbons) {
      logger.info('Found table: tumbons');
    } else if (hasTambon) {
      logger.info('Found table: tambon');
    } else if (hasTambons) {
      logger.info('Found table: tambons');
    } else {
      logger.error('No variation of tumbon/tambon table found');
    }

    // Check if tumbons table exists and get its structure
    if (tableNames.includes('tumbons')) {
      logger.info('Tumbons table exists');
      
      const columnsQuery = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'tumbons'
        ORDER BY ordinal_position;
      `;
      const columns = await client.query(columnsQuery);
      logger.info('Tumbons table structure:', columns.rows);

      // Get data quality stats
      const statsQuery = `
        SELECT 
          COUNT(*) as total_count,
          COUNT(DISTINCT id) as unique_ids,
          COUNT(DISTINCT amphure_id) as unique_amphures,
          COUNT(*) FILTER (WHERE name_th IS NOT NULL) as with_thai_names,
          COUNT(*) FILTER (WHERE name_en IS NOT NULL) as with_english_names,
          COUNT(*) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL) as with_coordinates
        FROM tumbons;
      `;
      const stats = await client.query(statsQuery);
      logger.info('Tumbons table statistics:', stats.rows[0]);

      // Get sample tumbons
      const sampleQuery = `
        SELECT 
          t.id as tumbon_id,
          t.name_th as tumbon_name_th,
          t.name_en as tumbon_name_en,
          t.latitude,
          t.longitude,
          a.id as amphure_id,
          a.name_th as amphure_name_th,
          a.name_en as amphure_name_en,
          p.id as province_id,
          p.name_th as province_name_th,
          p.name_en as province_name_en
        FROM tumbons t 
        JOIN amphures a ON t.amphure_id = a.id 
        JOIN provinces p ON a.province_id = p.id 
        ORDER BY RANDOM()
        LIMIT 3;
      `;
      const sample = await client.query(sampleQuery);
      if (sample.rows.length > 0) {
        logger.info('Sample tumbons:', sample.rows);
      } else {
        logger.warn('No tumbons found in table');
      }
    } else {
      logger.error('Tumbons table does not exist');
    }

    client.release();
    await pool.end();
    logger.info('Database connection test completed');
  } catch (error) {
    logger.error('Error testing database connection:', {
      error,
      errorType: typeof error,
      errorKeys: Object.keys(error as object),
      errorString: String(error)
    });
    if (error instanceof Error) {
      logger.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    throw error;
  }
};

testDatabaseConnection().catch(error => {
  logger.error('Script failed:', error);
  process.exit(1);
}); 