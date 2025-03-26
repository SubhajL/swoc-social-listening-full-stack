#!/usr/bin/env node

/**
 * Verify TMD Station Administrative Locations Script
 * 
 * This script:
 * 1. Checks how many TMD stations have administrative location data
 * 2. Shows statistics about complete vs incomplete location data
 * 3. Lists a sample of recently updated stations
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
  ssl: { rejectUnauthorized: false }
};

/**
 * Main function to run verification
 */
async function main() {
  console.log('Verifying TMD Station Administrative Locations...');
  
  try {
    // Create database connection
    const pool = new pg.Pool(dbConfig);
    const client = await pool.connect();
    
    try {
      // Get total count of TMD stations
      const totalCountResult = await client.query(`
        SELECT COUNT(*) as total 
        FROM thaiwater_tele_stations 
        WHERE data_source = 'TMD'
      `);
      
      const totalStations = parseInt(totalCountResult.rows[0].total);
      
      // Get count of stations with complete location data
      const completeResult = await client.query(`
        SELECT COUNT(*) as complete 
        FROM thaiwater_tele_stations 
        WHERE data_source = 'TMD'
          AND province IS NOT NULL 
          AND province != '' 
          AND amphure IS NOT NULL 
          AND amphure != '' 
          AND tambon IS NOT NULL 
          AND tambon != ''
      `);
      
      const completeStations = parseInt(completeResult.rows[0].complete);
      
      // Get count of stations with partial location data
      const partialResult = await client.query(`
        SELECT COUNT(*) as partial 
        FROM thaiwater_tele_stations 
        WHERE data_source = 'TMD'
          AND (
            (province IS NOT NULL AND province != '') OR
            (amphure IS NOT NULL AND amphure != '') OR
            (tambon IS NOT NULL AND tambon != '')
          )
          AND (
            province IS NULL OR province = '' OR
            amphure IS NULL OR amphure = '' OR
            tambon IS NULL OR tambon = ''
          )
      `);
      
      const partialStations = parseInt(partialResult.rows[0].partial);
      
      // Get count of stations with no location data
      const missingResult = await client.query(`
        SELECT COUNT(*) as missing 
        FROM thaiwater_tele_stations 
        WHERE data_source = 'TMD'
          AND (
            province IS NULL OR province = ''
          )
          AND (
            amphure IS NULL OR amphure = ''
          )
          AND (
            tambon IS NULL OR tambon = ''
          )
      `);
      
      const missingStations = parseInt(missingResult.rows[0].missing);
      
      // Get recently updated stations
      const recentlyUpdatedResult = await client.query(`
        SELECT 
          tele_station_id,
          tele_station_name,
          tele_station_name_th,
          province,
          amphure,
          tambon,
          tele_station_lat,
          tele_station_long,
          updated_at
        FROM thaiwater_tele_stations
        WHERE data_source = 'TMD'
          AND province IS NOT NULL 
          AND province != '' 
          AND amphure IS NOT NULL 
          AND amphure != '' 
          AND tambon IS NOT NULL 
          AND tambon != ''
        ORDER BY updated_at DESC
        LIMIT 10
      `);
      
      // Display results
      console.log('\n===== TMD STATION LOCATION STATISTICS =====');
      console.log(`Total TMD Stations: ${totalStations}`);
      console.log(`Complete Location Data: ${completeStations} (${(completeStations/totalStations*100).toFixed(2)}%)`);
      console.log(`Partial Location Data: ${partialStations} (${(partialStations/totalStations*100).toFixed(2)}%)`);
      console.log(`Missing Location Data: ${missingStations} (${(missingStations/totalStations*100).toFixed(2)}%)`);
      
      console.log('\n===== RECENTLY UPDATED STATIONS SAMPLE =====');
      recentlyUpdatedResult.rows.forEach((station, index) => {
        console.log(`\n[${index + 1}] Station ID: ${station.tele_station_id}`);
        console.log(`Name: ${station.tele_station_name || station.tele_station_name_th || 'N/A'}`);
        console.log(`Coordinates: [${station.tele_station_lat}, ${station.tele_station_long}]`);
        console.log(`Province: ${station.province}, Amphure: ${station.amphure}, Tambon: ${station.tambon}`);
        console.log(`Last Updated: ${station.updated_at}`);
      });
      
      // Check if there are any stations with coordinates in Thailand but still missing location data
      const remainingStationsResult = await client.query(`
        SELECT COUNT(*) as remaining
        FROM thaiwater_tele_stations
        WHERE data_source = 'TMD'
          AND tele_station_lat IS NOT NULL 
          AND tele_station_long IS NOT NULL
          AND tele_station_lat != 0
          AND tele_station_long != 0
          AND tele_station_lat BETWEEN 5.5 AND 20.5
          AND tele_station_long BETWEEN 97.5 AND 105.5
          AND (
            province IS NULL OR province = '' OR
            amphure IS NULL OR amphure = '' OR
            tambon IS NULL OR tambon = ''
          )
      `);
      
      const remainingStations = parseInt(remainingStationsResult.rows[0].remaining);
      
      console.log('\n===== REMAINING WORK =====');
      console.log(`Stations still needing location updates: ${remainingStations}`);
      
      if (remainingStations > 0) {
        console.log('\nRun the following command to update all remaining stations:');
        console.log('node src/scripts/update-tmd-admin-locations.mjs --all');
      } else {
        console.log('\nAll TMD stations with valid coordinates have complete location data! 🎉');
      }
      
    } finally {
      client.release();
      await pool.end();
    }
    
  } catch (error) {
    console.error('Error verifying TMD station locations:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(err => {
  console.error('Unhandled error in main function:', err);
  process.exit(1);
}); 