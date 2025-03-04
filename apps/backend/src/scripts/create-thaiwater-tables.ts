import { Pool } from 'pg';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Creates the ThaiWater tables in the PostgreSQL database
 */
async function createThaiWaterTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  logger.info('[ThaiWaterMigration] Starting migration for ThaiWater tables');

  try {
    // Begin transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Create tele_stations table
      logger.info('[ThaiWaterMigration] Creating thaiwater_tele_stations table');
      await client.query(`
        CREATE TABLE IF NOT EXISTS thaiwater_tele_stations (
          tele_station_id INTEGER PRIMARY KEY,
          tele_station_name VARCHAR(255),
          tele_station_name_th VARCHAR(255),
          tele_station_oldcode VARCHAR(50),
          tele_station_lat DECIMAL(10, 6),
          tele_station_long DECIMAL(10, 6),
          tele_station_type VARCHAR(50),
          agency_id INTEGER,
          ground_level DECIMAL(10, 2),
          left_bank DECIMAL(10, 2),
          right_bank DECIMAL(10, 2),
          is_warning BOOLEAN,
          province VARCHAR(100),
          amphure VARCHAR(100),
          tambon VARCHAR(100),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create rainfall_data table
      logger.info('[ThaiWaterMigration] Creating thaiwater_rainfall_data table');
      await client.query(`
        CREATE TABLE IF NOT EXISTS thaiwater_rainfall_data (
          id SERIAL PRIMARY KEY,
          tele_station_id INTEGER REFERENCES thaiwater_tele_stations(tele_station_id),
          rainfall10m DECIMAL(10, 2),
          rainfall1h DECIMAL(10, 2),
          rainfall24h DECIMAL(10, 2),
          rainfall_datetime TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(tele_station_id, rainfall_datetime)
        )
      `);
      
      // Create indexes for efficient querying
      logger.info('[ThaiWaterMigration] Creating indexes');
      
      // Index for location-based queries on tele_stations
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_thaiwater_tele_stations_location 
        ON thaiwater_tele_stations(province, amphure, tambon)
      `);
      
      // Index for spatial queries
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_thaiwater_tele_stations_coordinates 
        ON thaiwater_tele_stations(tele_station_lat, tele_station_long)
      `);
      
      // Index for rainfall data queries
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_thaiwater_rainfall_data_datetime 
        ON thaiwater_rainfall_data(rainfall_datetime)
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_thaiwater_rainfall_data_station 
        ON thaiwater_rainfall_data(tele_station_id)
      `);
      
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
if (require.main === module) {
  createThaiWaterTables()
    .then(() => {
      console.log('ThaiWater tables created successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error creating ThaiWater tables:', error);
      process.exit(1);
    });
}

export { createThaiWaterTables }; 