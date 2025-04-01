#!/usr/bin/env node

import pg from 'pg';
const { Pool } = pg;
import { logger } from '../../utils/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { getLocationDetails } from '../../services/google-maps/google-maps.service.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Mock station data
const mockStation = {
  station_id: 'MOCK-001',
  station_name: 'Mock Station 1',
  hydro_id: 1,
  data_source: 'test',
  latitude: 13.7563,  // Bangkok coordinates
  longitude: 100.5018,
  elevation: 10,
  station_code: 'MOCK001',
  hydro_name: 'Mock Hydro',
  basin_id: 'MOCK-BASIN',
  basin_name: 'Mock Basin',
  province_code: '10',
  brae_level: 5.0,
  q_max: 100.0,
  use_msl: true,
  use_msl_string: 'Yes',
  order_no: 1,
  station_detail: 'Test station for Google Maps integration',
  zero_gauge: 0.0,
  ground_level: 10.0
};

async function testMockStation() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // First, check if mock station exists
    const existingStation = await client.query(
      'SELECT station_id FROM telemetry_data_stations_backup WHERE station_id = $1',
      [mockStation.station_id]
    );

    if (existingStation.rows.length > 0) {
      logger.info('Mock station already exists, deleting it first', 'TestMockStation');
      await client.query(
        'DELETE FROM telemetry_data_stations_backup WHERE station_id = $1',
        [mockStation.station_id]
      );
    }

    // Get location details from Google Maps API
    logger.info('Fetching location details from Google Maps API', 'TestMockStation');
    const locationDetails = await getLocationDetails(
      mockStation.latitude,
      mockStation.longitude
    );

    logger.info('Location details fetched', {
      province: locationDetails.province,
      amphure: locationDetails.amphure,
      tambon: locationDetails.tambon,
      formatted_address: locationDetails.formatted_address
    }, 'TestMockStation');

    // Insert mock station
    await client.query(`
      INSERT INTO telemetry_data_stations_backup (
        station_id, station_name, hydro_id, data_source,
        latitude, longitude, elevation, last_sync,
        station_code, hydro_name, basin_id, basin_name,
        province_code, brae_level, q_max, use_msl,
        use_msl_string, order_no, station_detail,
        zero_gauge, ground_level,
        province, amphure, tambon, formatted_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
    `, [
      mockStation.station_id,
      mockStation.station_name,
      mockStation.hydro_id,
      mockStation.data_source,
      mockStation.latitude,
      mockStation.longitude,
      mockStation.elevation,
      new Date().toISOString(),
      mockStation.station_code,
      mockStation.hydro_name,
      mockStation.basin_id,
      mockStation.basin_name,
      mockStation.province_code,
      mockStation.brae_level,
      mockStation.q_max,
      mockStation.use_msl,
      mockStation.use_msl_string,
      mockStation.order_no,
      mockStation.station_detail,
      mockStation.zero_gauge,
      mockStation.ground_level,
      locationDetails.province,
      locationDetails.amphure,
      locationDetails.tambon,
      locationDetails.formatted_address
    ]);

    // Verify the insertion
    const insertedStation = await client.query(
      'SELECT * FROM telemetry_data_stations_backup WHERE station_id = $1',
      [mockStation.station_id]
    );

    if (insertedStation.rows.length > 0) {
      logger.info('Mock station successfully inserted and verified', {
        station_id: insertedStation.rows[0].station_id,
        province: insertedStation.rows[0].province,
        amphure: insertedStation.rows[0].amphure,
        tambon: insertedStation.rows[0].tambon
      }, 'TestMockStation');
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error testing mock station', {
      error: error instanceof Error ? error.message : String(error)
    }, 'TestMockStation');
    throw error;
  } finally {
    client.release();
  }
}

// Run the test
testMockStation()
  .then(() => {
    logger.info('Test completed successfully', 'TestMockStation');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Test failed', {
      error: error instanceof Error ? error.message : String(error)
    }, 'TestMockStation');
    process.exit(1);
  }); 