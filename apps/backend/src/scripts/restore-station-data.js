#!/usr/bin/env node

/**
 * Complete Station Data Restoration Script
 * 
 * This script performs a comprehensive restoration of the thaiwater_tele_stations table:
 * 1. Fixes Thai station names stored as JSON objects
 * 2. Restores province, amphure, and tambon data
 * 3. Restores data_source values
 * 4. Updates database indexes for improved performance
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

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

console.log('Starting comprehensive station data restoration script...');
console.log(`Connecting to database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

// Create database pool
const pool = new pg.Pool(dbConfig);

// Create backup of current state before making changes
async function backupCurrentState(client) {
  console.log('Creating backup of current station data...');
  
  try {
    // Create backup table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS thaiwater_tele_stations_backup (
        LIKE thaiwater_tele_stations INCLUDING ALL
      )
    `);
    
    // Clear previous backup data
    await client.query('TRUNCATE TABLE thaiwater_tele_stations_backup');
    
    // Copy current data to backup
    const copyResult = await client.query(`
      INSERT INTO thaiwater_tele_stations_backup
      SELECT * FROM thaiwater_tele_stations
    `);
    
    console.log(`Backed up ${copyResult.rowCount} station records`);
    return true;
  } catch (error) {
    console.error('Error creating backup:', error);
    return false;
  }
}

// Fix JSON formatted station names
async function fixStationNames(client) {
  console.log('Fixing station names stored as JSON objects...');
  
  try {
    // First attempt to parse JSON formatted names
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
          WHEN tele_station_name_th IS NULL AND tele_station_name IS NOT NULL
          THEN tele_station_name
          ELSE tele_station_name_th
        END
      WHERE tele_station_name LIKE '{%:%}' OR tele_station_name_th IS NULL
    `);
    
    console.log(`Fixed ${fixStationNamesResult.rowCount} station names using JSON parsing`);
    
    // Second attempt - fix any remaining malformed JSON
    const fixMalformedJsonResult = await client.query(`
      UPDATE thaiwater_tele_stations
      SET tele_station_name = REPLACE(REPLACE(tele_station_name, '{"th":"', ''), '"}', '')
      WHERE tele_station_name LIKE '{"th":%'
      AND tele_station_name NOT LIKE '{%:%:%}'
    `);
    
    console.log(`Fixed ${fixMalformedJsonResult.rowCount} station names with malformed JSON`);
    
    return fixStationNamesResult.rowCount + fixMalformedJsonResult.rowCount;
  } catch (error) {
    console.error('Error fixing station names:', error);
    return 0;
  }
}

// Restore location data using various methods
async function restoreLocationData(client) {
  console.log('Restoring location data for stations...');
  let totalRestored = 0;
  
  try {
    // 1. First attempt: Use location data from stations with the same oldcode
    const restoreByOldcodeResult = await client.query(`
      UPDATE thaiwater_tele_stations a
      SET 
        province = b.province,
        amphure = b.amphure,
        tambon = b.tambon
      FROM thaiwater_tele_stations_backup b
      WHERE a.tele_station_oldcode = b.tele_station_oldcode
      AND a.tele_station_oldcode IS NOT NULL
      AND b.province IS NOT NULL
      AND (a.province IS NULL OR a.province = '')
    `);
    
    console.log(`Restored location data for ${restoreByOldcodeResult.rowCount} stations using oldcode matching`);
    totalRestored += restoreByOldcodeResult.rowCount;
    
    // 2. Second attempt: Use location data from stations with the exact same ID
    const restoreByIdResult = await client.query(`
      UPDATE thaiwater_tele_stations a
      SET 
        province = b.province,
        amphure = b.amphure,
        tambon = b.tambon
      FROM thaiwater_tele_stations_backup b
      WHERE a.tele_station_id = b.tele_station_id
      AND b.province IS NOT NULL
      AND (a.province IS NULL OR a.province = '')
    `);
    
    console.log(`Restored location data for ${restoreByIdResult.rowCount} stations using ID matching`);
    totalRestored += restoreByIdResult.rowCount;
    
    // 3. Third attempt: Try to use location data from stations with similar names
    const restoreByNameResult = await client.query(`
      UPDATE thaiwater_tele_stations a
      SET 
        province = b.province,
        amphure = b.amphure,
        tambon = b.tambon
      FROM thaiwater_tele_stations_backup b
      WHERE (
        a.tele_station_name = b.tele_station_name OR
        a.tele_station_name_th = b.tele_station_name_th
      )
      AND b.province IS NOT NULL
      AND (a.province IS NULL OR a.province = '')
    `);
    
    console.log(`Restored location data for ${restoreByNameResult.rowCount} stations using name matching`);
    totalRestored += restoreByNameResult.rowCount;
    
    // 4. Fourth attempt: Try to use location data from stations with similar coordinates
    const restoreByLocationResult = await client.query(`
      UPDATE thaiwater_tele_stations a
      SET 
        province = b.province,
        amphure = b.amphure,
        tambon = b.tambon
      FROM thaiwater_tele_stations_backup b
      WHERE 
        ABS(a.tele_station_lat - b.tele_station_lat) < 0.001
        AND ABS(a.tele_station_long - b.tele_station_long) < 0.001
        AND a.tele_station_id != b.tele_station_id
        AND b.province IS NOT NULL
        AND (a.province IS NULL OR a.province = '')
    `);
    
    console.log(`Restored location data for ${restoreByLocationResult.rowCount} stations using coordinate matching`);
    totalRestored += restoreByLocationResult.rowCount;
    
    // 5. Special handling for stations with specific prefixes in their names
    // This is based on common patterns in Thai station naming conventions
    
    // Bangkok stations
    const restoreBangkokStations = await client.query(`
      UPDATE thaiwater_tele_stations
      SET 
        province = 'กรุงเทพมหานคร',
        amphure = ''
      WHERE (
        tele_station_name LIKE 'BKK%' OR
        tele_station_name LIKE 'Krung Thep%' OR
        tele_station_oldcode LIKE 'BKK%'
      )
      AND (province IS NULL OR province = '')
    `);
    
    console.log(`Set Bangkok as province for ${restoreBangkokStations.rowCount} stations`);
    totalRestored += restoreBangkokStations.rowCount;
    
    // Verify location data is restored
    const missingLocationResult = await client.query(`
      SELECT COUNT(*) as missing_count
      FROM thaiwater_tele_stations
      WHERE (province IS NULL OR province = '')
    `);
    
    const missingCount = parseInt(missingLocationResult.rows[0].missing_count);
    console.log(`There are still ${missingCount} stations with missing location data`);
    
    return totalRestored;
  } catch (error) {
    console.error('Error restoring location data:', error);
    return totalRestored;
  }
}

// Restore data source values
async function restoreDataSource(client) {
  console.log('Restoring data source values...');
  
  try {
    // Restore data_source values from backup
    const restoreDataSourceResult = await client.query(`
      UPDATE thaiwater_tele_stations a
      SET data_source = b.data_source
      FROM thaiwater_tele_stations_backup b
      WHERE a.tele_station_id = b.tele_station_id
      AND b.data_source IS NOT NULL
      AND a.data_source = 'TMD'
    `);
    
    console.log(`Restored original data source for ${restoreDataSourceResult.rowCount} stations`);
    
    // Set HII as default for remaining stations with no data source
    const setDefaultDataSourceResult = await client.query(`
      UPDATE thaiwater_tele_stations
      SET data_source = 'HII'
      WHERE data_source IS NULL OR data_source = ''
    `);
    
    console.log(`Set default data source for ${setDefaultDataSourceResult.rowCount} stations`);
    
    return restoreDataSourceResult.rowCount + setDefaultDataSourceResult.rowCount;
  } catch (error) {
    console.error('Error restoring data source values:', error);
    return 0;
  }
}

// Main function to restore station data
async function restoreStationData() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to database successfully');
    
    // Start transaction
    await client.query('BEGIN');
    
    // 1. Create backup of current state
    const backupCreated = await backupCurrentState(client);
    
    if (!backupCreated) {
      throw new Error('Failed to create backup. Aborting restoration process.');
    }
    
    // 2. Fix station names
    const fixedNamesCount = await fixStationNames(client);
    
    // 3. Restore location data
    const restoredLocationCount = await restoreLocationData(client);
    
    // 4. Restore data source values
    const restoredDataSourceCount = await restoreDataSource(client);
    
    // 5. Update the database statistics for improved performance
    await client.query('ANALYZE thaiwater_tele_stations');
    
    console.log('Database statistics updated for improved performance');
    
    // 6. Print summary
    console.log('\nRESTORATION SUMMARY:');
    console.log(`- Fixed ${fixedNamesCount} station names`);
    console.log(`- Restored location data for ${restoredLocationCount} stations`);
    console.log(`- Updated data source for ${restoredDataSourceCount} stations`);
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('\nStation data restoration completed successfully');
    
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('Error restoring station data:', error);
    throw error;
  } finally {
    // Release client back to the pool
    client.release();
    
    // Close pool
    await pool.end();
  }
}

// Run the script
restoreStationData()
  .then(() => {
    console.log('Station data restoration process complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Station data restoration failed:', error);
    process.exit(1);
  }); 