import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { fileURLToPath } from 'url';

const { Pool } = pg;

async function createAmphureTable() {
  logger.info('[CreateAmphureTable] Starting amphure table creation process...');
  
  const pool = new Pool({
    user: process.env.DB_USER || 'swoc-uat-ssl-user',
    password: process.env.DB_PASSWORD || 'c3dc7c8f659dd84f76b37057a37d75d2',
    host: process.env.DB_HOST || 'ec2-18-143-195-184.ap-southeast-1.compute.amazonaws.com',
    port: parseInt(process.env.DB_PORT || '15434'),
    database: process.env.DB_NAME || 'swoc-uat-ssl',
    ssl: {
      rejectUnauthorized: false
    }
  });

  let client = null;

  try {
    logger.info('[CreateAmphureTable] Connecting to database...');
    client = await pool.connect();
    logger.info('[CreateAmphureTable] Connected successfully');

    // Check if PostGIS is installed
    logger.info('[CreateAmphureTable] Checking PostGIS installation...');
    const checkResult = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'postgis'
      );
    `);

    if (!checkResult.rows[0].exists) {
      logger.error('[CreateAmphureTable] PostGIS extension is not installed. Please install it first.');
      throw new Error('PostGIS extension is not installed. Please install it first.');
    }

    logger.info('[CreateAmphureTable] PostGIS is installed, proceeding with table creation');

    // Read the SQL file
    const sqlFilePath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'create_amphure_table.sql');
    const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');

    // Execute the SQL script
    logger.info('[CreateAmphureTable] Executing SQL script to create amphure table...');
    await client.query(sqlScript);
    logger.info('[CreateAmphureTable] SQL script executed successfully');

    // Check if the table was created
    const tableCheckResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'amphure'
      );
    `);

    if (tableCheckResult.rows[0].exists) {
      logger.info('[CreateAmphureTable] amphure table created successfully');
      
      // Check if the geometry column was added
      const geomCheckResult = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'amphure' 
          AND column_name = 'geom'
        );
      `);
      
      if (geomCheckResult.rows[0].exists) {
        logger.info('[CreateAmphureTable] geom column added successfully');
      } else {
        logger.warn('[CreateAmphureTable] geom column was not added');
      }
    } else {
      logger.error('[CreateAmphureTable] Failed to create amphure table');
      throw new Error('Failed to create amphure table');
    }

    // Populate the table from existing amphures table if it exists
    logger.info('[CreateAmphureTable] Checking if amphures table exists for migration...');
    const amphuresTableCheckResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'amphures'
      );
    `);

    if (amphuresTableCheckResult.rows[0].exists) {
      logger.info('[CreateAmphureTable] amphures table exists, migrating data...');
      
      // Migrate data from amphures to amphure
      await client.query(`
        INSERT INTO amphure (amphure_name, province_name, amphure_code, province_code)
        SELECT 
          name_th AS amphure_name,
          (SELECT name_th FROM provinces WHERE id = province_id) AS province_name,
          id AS amphure_code,
          province_id AS province_code
        FROM amphures;
      `);
      
      // Create buffer polygons around the points
      await client.query(`
        UPDATE amphure a
        SET geom = ST_Buffer(
          ST_SetSRID(
            ST_MakePoint(
              (SELECT longitude FROM amphures WHERE id = a.amphure_code),
              (SELECT latitude FROM amphures WHERE id = a.amphure_code)
            ),
            4326
          ),
          0.05 -- Approximately 5km buffer
        );
      `);
      
      // Count the number of rows migrated
      const countResult = await client.query('SELECT COUNT(*) FROM amphure;');
      logger.info(`[CreateAmphureTable] Migrated ${countResult.rows[0].count} rows from amphures to amphure`);
    } else {
      logger.warn('[CreateAmphureTable] amphures table does not exist, skipping migration');
      logger.warn('[CreateAmphureTable] You will need to populate the amphure table manually');
    }

    logger.info('[CreateAmphureTable] Process completed successfully');

  } catch (error) {
    logger.error('[CreateAmphureTable] Error during amphure table creation:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      logger.error('[CreateAmphureTable] Stack trace:', error.stack);
    }
    throw error;
  } finally {
    if (client) {
      client.release();
      logger.info('[CreateAmphureTable] Database client released');
    }
    await pool.end();
    logger.info('[CreateAmphureTable] Database connection closed');
  }
}

// Run the script if executed directly
// Using ESM module detection instead of require.main
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  createAmphureTable().catch((error) => {
    logger.error('[CreateAmphureTable] Script failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  });
}

// Export for use in other scripts
export { createAmphureTable }; 