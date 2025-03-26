#!/usr/bin/env node

/**
 * Location Data Restoration Script
 * 
 * This script restores the province, amphure, and tambon data for stations
 * and fixes the Thai station names that were incorrectly stored as JSON objects.
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'ec2-18-143-195-184.ap-southeast-1.compute.amazonaws.com',
  port: parseInt(process.env.DB_PORT || '15435'),
  database: process.env.DB_NAME || 'swoc-uat-gis-ssl',
  user: process.env.DB_USER || 'swoc-uat-gis-ssl-user',
  password: process.env.DB_PASSWORD || '4c0b269f763d4ce1d1d59ba0e2ef1f9c',
  ssl: { rejectUnauthorized: false } // Always enable SSL for the remote DB
};

console.log('Starting location data restoration script...');
console.log(`Connecting to database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

// Create database pool
const pool = new pg.Pool(dbConfig);

async function restoreLocationData() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to database successfully');
    
    // Start transaction
    await client.query('BEGIN');
    
    // 1. First, fix station names that are stored as JSON objects
    console.log('Fixing station names stored as JSON objects...');
    const fixStationNamesResult = await client.query(`
      UPDATE thaiwater_tele_stations
      SET tele_station_name = 
        CASE 
          WHEN tele_station_name LIKE '{%"th"%:%"%"}' 
          THEN (tele_station_name::json->>'th')
          ELSE tele_station_name
        END,
      tele_station_name_th = 
        CASE 
          WHEN tele_station_name LIKE '{%"th"%:%"%"}' 
          THEN (tele_station_name::json->>'th')
          WHEN tele_station_name_th IS NULL
          THEN tele_station_name
          ELSE tele_station_name_th
        END
      WHERE tele_station_name LIKE '{%:%}' OR tele_station_name_th IS NULL
    `);
    
    console.log(`Fixed ${fixStationNamesResult.rowCount} station names`);
    
    // 2. Restore province, amphure, tambon data from backup or from a trusted source
    // Since we don't have a direct backup, we'll use a mapping table or reference
    console.log('Restoring location data for stations...');
    
    // 2.1 First attempt: Try to use location data from stations with the same oldcode
    const restoreByOldcodeResult = await client.query(`
      UPDATE thaiwater_tele_stations a
      SET 
        province = b.province,
        amphure = b.amphure,
        tambon = b.tambon
      FROM thaiwater_tele_stations b
      WHERE a.tele_station_oldcode = b.tele_station_oldcode
      AND a.tele_station_oldcode IS NOT NULL
      AND b.province IS NOT NULL
      AND (a.province IS NULL OR a.province = '')
    `);
    
    console.log(`Restored location data for ${restoreByOldcodeResult.rowCount} stations using oldcode matching`);
    
    // 2.2 Second attempt: Try to use location data from stations with similar names (useful for Thai stations)
    const restoreByNameResult = await client.query(`
      UPDATE thaiwater_tele_stations a
      SET 
        province = b.province,
        amphure = b.amphure,
        tambon = b.tambon
      FROM thaiwater_tele_stations b
      WHERE (
        a.tele_station_name = b.tele_station_name OR
        a.tele_station_name_th = b.tele_station_name_th
      )
      AND b.province IS NOT NULL
      AND (a.province IS NULL OR a.province = '')
    `);
    
    console.log(`Restored location data for ${restoreByNameResult.rowCount} stations using name matching`);
    
    // 2.3 Third attempt: Try to use location data from stations with similar coordinates
    const restoreByLocationResult = await client.query(`
      UPDATE thaiwater_tele_stations a
      SET 
        province = b.province,
        amphure = b.amphure,
        tambon = b.tambon
      FROM thaiwater_tele_stations b
      WHERE 
        ABS(a.tele_station_lat - b.tele_station_lat) < 0.001
        AND ABS(a.tele_station_long - b.tele_station_long) < 0.001
        AND a.tele_station_id != b.tele_station_id
        AND b.province IS NOT NULL
        AND (a.province IS NULL OR a.province = '')
    `);
    
    console.log(`Restored location data for ${restoreByLocationResult.rowCount} stations using coordinate matching`);
    
    // 3. Get a count of stations still missing location data
    const missingLocationResult = await client.query(`
      SELECT COUNT(*) as missing_count
      FROM thaiwater_tele_stations
      WHERE (province IS NULL OR province = '')
    `);
    
    const missingCount = parseInt(missingLocationResult.rows[0].missing_count);
    console.log(`There are still ${missingCount} stations with missing location data`);
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('Location data restoration completed');
    
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('Error restoring location data:', error);
    throw error;
  } finally {
    // Release client back to the pool
    client.release();
    
    // Close pool
    await pool.end();
  }
}

// Run the script
restoreLocationData()
  .then(() => {
    console.log('Location data restoration complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Location data restoration failed:', error);
    process.exit(1);
  }); 