import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

// Load environment variables
dotenv.config();

// Configuration
const DATA_DIR = path.join(__dirname, '../../data/boundaries');
const PROVINCE_GEOJSON = path.join(DATA_DIR, 'thailand-provinces.geojson');
const AMPHURE_GEOJSON = path.join(DATA_DIR, 'thailand-amphures.geojson');
const TAMBON_GEOJSON = path.join(DATA_DIR, 'thailand-tambons.geojson');

/**
 * Imports Thailand administrative boundaries from GeoJSON files into the database
 * - Creates tables for provinces, amphures, and tambons
 * - Imports GeoJSON data into the tables
 * - Creates spatial indexes for efficient queries
 */
export async function importThailandBoundaries() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  logger.info('[BoundaryImport] Starting import of Thailand administrative boundaries');

  const client = await pool.connect();
  
  try {
    // Begin transaction
    await client.query('BEGIN');
    
    // Step 1: Check if PostGIS is available
    try {
      const postgisCheck = await client.query(`
        SELECT 1 FROM pg_extension WHERE extname = 'postgis'
      `);
      
      if (postgisCheck.rows.length === 0) {
        logger.info('[BoundaryImport] Enabling PostGIS extension');
        await client.query('CREATE EXTENSION IF NOT EXISTS postgis');
      }
    } catch (error) {
      logger.error('[BoundaryImport] Error checking or enabling PostGIS', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error('PostGIS extension is required for this operation');
    }
    
    // Step 2: Create tables for administrative boundaries if they don't exist
    logger.info('[BoundaryImport] Creating tables for administrative boundaries');
    
    // Create provinces table
    await client.query(`
      CREATE TABLE IF NOT EXISTS thailand_provinces (
        id SERIAL PRIMARY KEY,
        code VARCHAR(10),
        name_th VARCHAR(255),
        name_en VARCHAR(255),
        geom GEOMETRY(MultiPolygon, 4326)
      )
    `);
    
    // Create amphures table
    await client.query(`
      CREATE TABLE IF NOT EXISTS thailand_amphures (
        id SERIAL PRIMARY KEY,
        code VARCHAR(10),
        name_th VARCHAR(255),
        name_en VARCHAR(255),
        province_id INTEGER REFERENCES thailand_provinces(id),
        geom GEOMETRY(MultiPolygon, 4326)
      )
    `);
    
    // Create tambons table
    await client.query(`
      CREATE TABLE IF NOT EXISTS thailand_tambons (
        id SERIAL PRIMARY KEY,
        code VARCHAR(10),
        name_th VARCHAR(255),
        name_en VARCHAR(255),
        amphure_id INTEGER REFERENCES thailand_amphures(id),
        geom GEOMETRY(MultiPolygon, 4326)
      )
    `);
    
    // Step 3: Check if data files exist
    if (!fs.existsSync(PROVINCE_GEOJSON)) {
      logger.error(`[BoundaryImport] Province GeoJSON file not found: ${PROVINCE_GEOJSON}`);
      throw new Error(`Province GeoJSON file not found: ${PROVINCE_GEOJSON}`);
    }
    
    // Step 4: Import provinces
    logger.info('[BoundaryImport] Importing provinces');
    
    // Clear existing data
    await client.query('TRUNCATE thailand_provinces CASCADE');
    
    // Read and parse GeoJSON file
    const provincesGeoJSON = JSON.parse(fs.readFileSync(PROVINCE_GEOJSON, 'utf8'));
    
    // Import each province
    for (const feature of provincesGeoJSON.features) {
      const properties = feature.properties;
      const geometry = feature.geometry;
      
      // Insert province
      await client.query(`
        INSERT INTO thailand_provinces (code, name_th, name_en, geom)
        VALUES ($1, $2, $3, ST_SetSRID(ST_GeomFromGeoJSON($4), 4326))
      `, [
        properties.code,
        properties.name_th,
        properties.name_en,
        JSON.stringify(geometry)
      ]);
    }
    
    logger.info(`[BoundaryImport] Imported ${provincesGeoJSON.features.length} provinces`);
    
    // Step 5: Import amphures if file exists
    if (fs.existsSync(AMPHURE_GEOJSON)) {
      logger.info('[BoundaryImport] Importing amphures');
      
      // Read and parse GeoJSON file
      const amphuresGeoJSON = JSON.parse(fs.readFileSync(AMPHURE_GEOJSON, 'utf8'));
      
      // Import each amphure
      for (const feature of amphuresGeoJSON.features) {
        const properties = feature.properties;
        const geometry = feature.geometry;
        
        // Get province ID
        const provinceResult = await client.query(`
          SELECT id FROM thailand_provinces WHERE code = $1
        `, [properties.province_code]);
        
        if (provinceResult.rows.length === 0) {
          logger.warn(`[BoundaryImport] Province not found for amphure: ${properties.name_th} (${properties.province_code})`);
          continue;
        }
        
        const provinceId = provinceResult.rows[0].id;
        
        // Insert amphure
        await client.query(`
          INSERT INTO thailand_amphures (code, name_th, name_en, province_id, geom)
          VALUES ($1, $2, $3, $4, ST_SetSRID(ST_GeomFromGeoJSON($5), 4326))
        `, [
          properties.code,
          properties.name_th,
          properties.name_en,
          provinceId,
          JSON.stringify(geometry)
        ]);
      }
      
      logger.info(`[BoundaryImport] Imported ${amphuresGeoJSON.features.length} amphures`);
    } else {
      logger.warn(`[BoundaryImport] Amphure GeoJSON file not found: ${AMPHURE_GEOJSON}`);
    }
    
    // Step 6: Import tambons if file exists
    if (fs.existsSync(TAMBON_GEOJSON)) {
      logger.info('[BoundaryImport] Importing tambons');
      
      // Read and parse GeoJSON file
      const tambonsGeoJSON = JSON.parse(fs.readFileSync(TAMBON_GEOJSON, 'utf8'));
      
      // Import each tambon
      for (const feature of tambonsGeoJSON.features) {
        const properties = feature.properties;
        const geometry = feature.geometry;
        
        // Get amphure ID
        const amphureResult = await client.query(`
          SELECT id FROM thailand_amphures WHERE code = $1
        `, [properties.amphure_code]);
        
        if (amphureResult.rows.length === 0) {
          logger.warn(`[BoundaryImport] Amphure not found for tambon: ${properties.name_th} (${properties.amphure_code})`);
          continue;
        }
        
        const amphureId = amphureResult.rows[0].id;
        
        // Insert tambon
        await client.query(`
          INSERT INTO thailand_tambons (code, name_th, name_en, amphure_id, geom)
          VALUES ($1, $2, $3, $4, ST_SetSRID(ST_GeomFromGeoJSON($5), 4326))
        `, [
          properties.code,
          properties.name_th,
          properties.name_en,
          amphureId,
          JSON.stringify(geometry)
        ]);
      }
      
      logger.info(`[BoundaryImport] Imported ${tambonsGeoJSON.features.length} tambons`);
    } else {
      logger.warn(`[BoundaryImport] Tambon GeoJSON file not found: ${TAMBON_GEOJSON}`);
    }
    
    // Step 7: Create spatial indexes
    logger.info('[BoundaryImport] Creating spatial indexes');
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_thailand_provinces_geom 
      ON thailand_provinces USING GIST(geom)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_thailand_amphures_geom 
      ON thailand_amphures USING GIST(geom)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_thailand_tambons_geom 
      ON thailand_tambons USING GIST(geom)
    `);
    
    // Step 8: Create indexes on names for text search
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_thailand_provinces_name_th 
      ON thailand_provinces(name_th)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_thailand_amphures_name_th 
      ON thailand_amphures(name_th)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_thailand_tambons_name_th 
      ON thailand_tambons(name_th)
    `);
    
    // Commit transaction
    await client.query('COMMIT');
    
    logger.info('[BoundaryImport] Thailand administrative boundaries import completed successfully');
    
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
    logger.error('[BoundaryImport] Error importing Thailand administrative boundaries', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
  } finally {
    // Release client back to pool
    client.release();
    await pool.end();
  }
}

// Run the import function
importThailandBoundaries().catch(error => {
  logger.error('[BoundaryImport] Unhandled error', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  });
  process.exit(1);
}); 