// JavaScript version of setup-postgis-for-thaiwater.ts
import pg from 'pg';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

// Load environment variables
dotenv.config();

const { Pool } = pg;

/**
 * Sets up PostGIS for the ThaiWater stations table
 * - Enables PostGIS extension if not already enabled
 * - Adds a geometry column to the thaiwater_tele_stations table
 * - Populates the geometry column with points from lat/long
 * - Creates a spatial index on the geometry column
 */
async function setupPostGISForThaiWater() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  logger.info('[PostGIS Setup] Starting PostGIS setup for ThaiWater stations');
  logger.info(`[PostGIS Setup] Using connection string: ${process.env.DATABASE_URL}`);

  const client = await pool.connect();
  
  try {
    // Begin transaction
    await client.query('BEGIN');
    
    // Step 1: Enable PostGIS extension if not already enabled
    logger.info('[PostGIS Setup] Enabling PostGIS extension');
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS postgis');
      logger.info('[PostGIS Setup] PostGIS extension enabled successfully');
    } catch (error) {
      logger.error('[PostGIS Setup] Error enabling PostGIS extension', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
    
    // Step 2: Check if geometry column already exists
    const checkGeomColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'thaiwater_tele_stations' 
      AND column_name = 'geom'
    `);
    
    if (checkGeomColumn.rows.length === 0) {
      // Step 3: Add geometry column to the stations table
      logger.info('[PostGIS Setup] Adding geometry column to thaiwater_tele_stations');
      await client.query(`
        ALTER TABLE thaiwater_tele_stations 
        ADD COLUMN geom GEOMETRY(Point, 4326)
      `);
      
      // Step 4: Populate the geometry column with points from lat/long
      logger.info('[PostGIS Setup] Populating geometry column with points from lat/long');
      await client.query(`
        UPDATE thaiwater_tele_stations
        SET geom = ST_SetSRID(ST_MakePoint(tele_station_long, tele_station_lat), 4326)
        WHERE tele_station_lat IS NOT NULL 
        AND tele_station_long IS NOT NULL
        AND tele_station_lat BETWEEN 5.5 AND 20.5
        AND tele_station_long BETWEEN 97.5 AND 105.5
      `);
      
      // Step 5: Create a spatial index on the geometry column
      logger.info('[PostGIS Setup] Creating spatial index on geometry column');
      await client.query(`
        CREATE INDEX idx_thaiwater_tele_stations_geom 
        ON thaiwater_tele_stations 
        USING GIST(geom)
      `);
      
      logger.info('[PostGIS Setup] Geometry column added and populated successfully');
    } else {
      logger.info('[PostGIS Setup] Geometry column already exists, updating values');
      
      // Update geometry for stations with coordinates but no geometry
      await client.query(`
        UPDATE thaiwater_tele_stations
        SET geom = ST_SetSRID(ST_MakePoint(tele_station_long, tele_station_lat), 4326)
        WHERE geom IS NULL
        AND tele_station_lat IS NOT NULL 
        AND tele_station_long IS NOT NULL
        AND tele_station_lat BETWEEN 5.5 AND 20.5
        AND tele_station_long BETWEEN 97.5 AND 105.5
      `);
    }
    
    // Step 6: Create a function to update geometry when lat/long are updated
    logger.info('[PostGIS Setup] Creating trigger function to keep geometry in sync with lat/long');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_thaiwater_station_geom()
      RETURNS TRIGGER AS $$
      BEGIN
        IF (NEW.tele_station_lat IS NOT NULL AND NEW.tele_station_long IS NOT NULL) THEN
          NEW.geom = ST_SetSRID(ST_MakePoint(NEW.tele_station_long, NEW.tele_station_lat), 4326);
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Step 7: Create a trigger to automatically update geometry when lat/long are updated
    const checkTrigger = await client.query(`
      SELECT tgname 
      FROM pg_trigger 
      WHERE tgname = 'thaiwater_station_geom_update_trigger'
    `);
    
    if (checkTrigger.rows.length === 0) {
      logger.info('[PostGIS Setup] Creating trigger to automatically update geometry');
      await client.query(`
        CREATE TRIGGER thaiwater_station_geom_update_trigger
        BEFORE INSERT OR UPDATE OF tele_station_lat, tele_station_long
        ON thaiwater_tele_stations
        FOR EACH ROW
        EXECUTE FUNCTION update_thaiwater_station_geom();
      `);
    } else {
      logger.info('[PostGIS Setup] Trigger already exists');
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    logger.info('[PostGIS Setup] PostGIS setup completed successfully');
    
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
    logger.error('[PostGIS Setup] Error setting up PostGIS', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Log the full error object for debugging
    console.error('[PostGIS Setup] Full error object:', error);
    
  } finally {
    // Release client back to pool
    client.release();
    await pool.end();
  }
}

// Run the setup function
setupPostGISForThaiWater().catch(error => {
  logger.error('[PostGIS Setup] Unhandled error', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  });
  console.error('[PostGIS Setup] Full unhandled error object:', error);
  process.exit(1);
}); 