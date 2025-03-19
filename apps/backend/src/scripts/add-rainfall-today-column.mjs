// Script to add rainfall_today column to thaiwater_rainfall_data table
import pg from 'pg';
import dotenv from 'dotenv';
import winston from 'winston';

const { Pool } = pg;
const { createLogger, format, transports } = winston;

// Load environment variables
dotenv.config();

// Create logger
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console()
  ]
});

/**
 * Main function to add rainfall_today column
 */
async function addRainfallTodayColumn() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  const client = await pool.connect();
  
  try {
    logger.info('[Migration] Starting migration to add rainfall_today column');
    
    // Check if the new table already exists
    const checkNewTable = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'thaiwater_rainfall_data_new'
    `);
    
    if (checkNewTable.rows.length > 0) {
      logger.info('[Migration] Dropping existing thaiwater_rainfall_data_new table');
      await client.query('DROP TABLE IF EXISTS thaiwater_rainfall_data_new');
    }
    
    // Create new table with rainfall_today column
    logger.info('[Migration] Creating new table with rainfall_today column');
    await client.query(`
      CREATE TABLE thaiwater_rainfall_data_new (
        id SERIAL PRIMARY KEY,
        tele_station_id INTEGER NOT NULL,
        rainfall10m DECIMAL(10, 2),
        rainfall1h DECIMAL(10, 2),
        rainfall24h DECIMAL(10, 2),
        rainfall3h DECIMAL(10, 2),
        rainfall_today DECIMAL(10, 2),
        rainfall_datetime TIMESTAMP NOT NULL,
        data_source VARCHAR(10),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Copy data from old table to new table
    logger.info('[Migration] Copying data from old table to new table');
    await client.query(`
      INSERT INTO thaiwater_rainfall_data_new (
        id, 
        tele_station_id, 
        rainfall10m, 
        rainfall1h, 
        rainfall24h, 
        rainfall3h, 
        rainfall_datetime, 
        data_source, 
        created_at, 
        updated_at
      )
      SELECT 
        id, 
        tele_station_id, 
        rainfall10m, 
        rainfall1h, 
        rainfall24h, 
        rainfall3h, 
        rainfall_datetime, 
        data_source, 
        created_at, 
        updated_at
      FROM thaiwater_rainfall_data
    `);
    
    // Calculate rainfall_today for HII stations
    logger.info('[Migration] Calculating rainfall_today for HII stations');
    await client.query(`
      UPDATE thaiwater_rainfall_data_new
      SET rainfall_today = (
        SELECT COALESCE(SUM(rainfall1h), 0)
        FROM thaiwater_rainfall_data
        WHERE tele_station_id = thaiwater_rainfall_data_new.tele_station_id
        AND DATE_TRUNC('day', rainfall_datetime) = DATE_TRUNC('day', thaiwater_rainfall_data_new.rainfall_datetime)
      )
      WHERE data_source = 'HII'
    `);
    
    // Set rainfall_today to 0 for TMD stations
    logger.info('[Migration] Setting rainfall_today to 0 for TMD stations');
    await client.query(`
      UPDATE thaiwater_rainfall_data_new
      SET rainfall_today = 0
      WHERE data_source = 'TMD'
    `);
    
    // Create indexes on the new table
    logger.info('[Migration] Creating indexes on the new table');
    await client.query(`
      CREATE INDEX idx_thaiwater_rainfall_data_new_tele_station_id ON thaiwater_rainfall_data_new(tele_station_id)
    `);
    await client.query(`
      CREATE INDEX idx_thaiwater_rainfall_data_new_rainfall_datetime ON thaiwater_rainfall_data_new(rainfall_datetime)
    `);
    await client.query(`
      CREATE INDEX idx_thaiwater_rainfall_data_new_data_source ON thaiwater_rainfall_data_new(data_source)
    `);
    
    // Count records in both tables to verify
    const oldCount = await client.query('SELECT COUNT(*) FROM thaiwater_rainfall_data');
    const newCount = await client.query('SELECT COUNT(*) FROM thaiwater_rainfall_data_new');
    
    logger.info('[Migration] Data verification', {
      oldTableCount: oldCount.rows[0].count,
      newTableCount: newCount.rows[0].count
    });
    
    if (oldCount.rows[0].count !== newCount.rows[0].count) {
      logger.warn('[Migration] Record count mismatch between old and new tables');
    }
    
    logger.info('[Migration] Migration completed successfully');
    logger.info('[Migration] IMPORTANT: The new table is named "thaiwater_rainfall_data_new"');
    logger.info('[Migration] You need to manually rename the tables when ready:');
    logger.info('[Migration] 1. ALTER TABLE thaiwater_rainfall_data RENAME TO thaiwater_rainfall_data_old;');
    logger.info('[Migration] 2. ALTER TABLE thaiwater_rainfall_data_new RENAME TO thaiwater_rainfall_data;');
    
    return {
      success: true,
      message: 'Successfully added rainfall_today column',
      oldTableCount: oldCount.rows[0].count,
      newTableCount: newCount.rows[0].count
    };
    
  } catch (error) {
    logger.error('[Migration] Error adding rainfall_today column', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return {
      success: false,
      message: 'Failed to add rainfall_today column',
      error: error instanceof Error ? error.message : String(error)
    };
    
  } finally {
    // Release client back to pool
    client.release();
    await pool.end();
  }
}

// Run the migration function
addRainfallTodayColumn()
  .then((result) => {
    console.log('Migration completed:', result.success ? 'SUCCESS' : 'FAILED');
    if (result.oldTableCount && result.newTableCount) {
      console.log(`Old table count: ${result.oldTableCount}, New table count: ${result.newTableCount}`);
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error running migration:', error);
    process.exit(1);
  }); 