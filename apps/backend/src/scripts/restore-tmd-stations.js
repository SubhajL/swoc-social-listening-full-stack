#!/usr/bin/env node

/**
 * Database Restoration Script
 * 
 * This script restores the TMD station data to its previous state by:
 * 1. Removing any stations added recently by the sync script
 * 2. Restoring the original data source values for existing stations
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

console.log('Starting database restoration script...');
console.log(`Connecting to database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

// Create database pool
const pool = new pg.Pool(dbConfig);

async function restoreDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to database successfully');
    
    // Start transaction
    await client.query('BEGIN');
    
    // 1. Remove stations that were added by the sync script with specific IDs (TMD stations)
    console.log('Removing TMD stations that were added by the sync script...');
    const removeStationsResult = await client.query(`
      DELETE FROM thaiwater_tele_stations
      WHERE tele_station_id >= 2000 AND tele_station_id < 4000
      AND data_source = 'TMD'
      AND updated_at > NOW() - INTERVAL '2 days'
    `);
    
    console.log(`Removed ${removeStationsResult.rowCount} TMD stations`);
    
    // 2. Also restore any stations where just the data_source was changed to 'TMD'
    console.log('Restoring original data source for existing stations...');
    const restoreDataSourceResult = await client.query(`
      UPDATE thaiwater_tele_stations
      SET data_source = 'HII', 
          updated_at = NOW()
      WHERE data_source = 'TMD'
      AND updated_at > NOW() - INTERVAL '2 days'
    `);
    
    console.log(`Restored data source for ${restoreDataSourceResult.rowCount} stations`);
    
    // 3. Remove any TMD rainfall data from last 2 days
    console.log('Removing recent TMD rainfall data...');
    const removeRainfallResult = await client.query(`
      DELETE FROM thaiwater_rainfall_data_new
      WHERE data_source = 'TMD'
      AND created_at > NOW() - INTERVAL '2 days'
    `);
    
    console.log(`Removed ${removeRainfallResult.rowCount} TMD rainfall entries`);
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('Database has been successfully restored to its previous state');
    
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('Error restoring database:', error);
    throw error;
  } finally {
    // Release client back to the pool
    client.release();
    
    // Close pool
    await pool.end();
  }
}

// Run the script
restoreDatabase()
  .then(() => {
    console.log('Restoration complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Restoration failed:', error);
    process.exit(1);
  }); 