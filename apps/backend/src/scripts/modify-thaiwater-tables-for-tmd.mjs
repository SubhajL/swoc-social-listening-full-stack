// Script to modify ThaiWater tables to accommodate TMD data
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
 * Modifies the ThaiWater tables to accommodate TMD data
 */
async function modifyThaiWaterTablesForTMD() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  logger.info('[ThaiWaterMigration] Starting migration to modify ThaiWater tables for TMD data');

  try {
    // Begin transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Modify tele_stations table to add data_source column
      logger.info('[ThaiWaterMigration] Modifying thaiwater_tele_stations table');
      
      // Check if data_source column already exists
      const checkStationsColumn = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'thaiwater_tele_stations' 
        AND column_name = 'data_source'
      `);
      
      if (checkStationsColumn.rows.length === 0) {
        // Add data_source column
        await client.query(`
          ALTER TABLE thaiwater_tele_stations 
          ADD COLUMN data_source VARCHAR(10)
        `);
        
        // Update existing records to set data_source = 'HII'
        await client.query(`
          UPDATE thaiwater_tele_stations 
          SET data_source = 'HII'
        `);
        
        logger.info('[ThaiWaterMigration] Added data_source column to thaiwater_tele_stations');
      } else {
        logger.info('[ThaiWaterMigration] data_source column already exists in thaiwater_tele_stations');
      }
      
      // Modify rainfall_data table to add rainfall3h and data_source columns
      logger.info('[ThaiWaterMigration] Modifying thaiwater_rainfall_data table');
      
      // Check if rainfall3h column already exists
      const checkRainfall3hColumn = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'thaiwater_rainfall_data' 
        AND column_name = 'rainfall3h'
      `);
      
      if (checkRainfall3hColumn.rows.length === 0) {
        // Add rainfall3h column
        await client.query(`
          ALTER TABLE thaiwater_rainfall_data 
          ADD COLUMN rainfall3h DECIMAL(10, 2)
        `);
        
        logger.info('[ThaiWaterMigration] Added rainfall3h column to thaiwater_rainfall_data');
      } else {
        logger.info('[ThaiWaterMigration] rainfall3h column already exists in thaiwater_rainfall_data');
      }
      
      // Check if data_source column already exists
      const checkRainfallDataSourceColumn = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'thaiwater_rainfall_data' 
        AND column_name = 'data_source'
      `);
      
      if (checkRainfallDataSourceColumn.rows.length === 0) {
        // Add data_source column
        await client.query(`
          ALTER TABLE thaiwater_rainfall_data 
          ADD COLUMN data_source VARCHAR(10)
        `);
        
        // Update existing records to set data_source = 'HII'
        await client.query(`
          UPDATE thaiwater_rainfall_data 
          SET data_source = 'HII'
        `);
        
        logger.info('[ThaiWaterMigration] Added data_source column to thaiwater_rainfall_data');
      } else {
        logger.info('[ThaiWaterMigration] data_source column already exists in thaiwater_rainfall_data');
      }
      
      // Create index for data_source on both tables
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_thaiwater_tele_stations_data_source 
        ON thaiwater_tele_stations(data_source)
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_thaiwater_rainfall_data_data_source 
        ON thaiwater_rainfall_data(data_source)
      `);
      
      logger.info('[ThaiWaterMigration] Created indexes for data_source columns');
      
      // Commit transaction
      await client.query('COMMIT');
      logger.info('[ThaiWaterMigration] Migration completed successfully');
      
    } catch (error) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      logger.error('[ThaiWaterMigration] Error during migration', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    } finally {
      // Release client back to pool
      client.release();
    }
    
  } catch (error) {
    logger.error('[ThaiWaterMigration] Failed to connect to database', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  } finally {
    // Close pool
    await pool.end();
  }
}

// Run migration if this file is executed directly
modifyThaiWaterTablesForTMD()
  .then(() => {
    console.log('ThaiWater tables modified successfully to accommodate TMD data');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error modifying ThaiWater tables:', error);
    process.exit(1);
  }); 