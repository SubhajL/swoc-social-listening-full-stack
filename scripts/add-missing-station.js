/**
 * Script to add missing Ny.4 station to telemetry_data_stations table
 */

const dotenv = require('dotenv');
const path = require('path');
const { Pool } = require('pg');

// Load environment variables from backend .env file
dotenv.config({ path: path.resolve(__dirname, '../apps/backend/.env') });

// Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function addMissingStation() {
  const client = await pool.connect();
  
  try {
    console.log('Adding missing Ny.4 station to telemetry_data_stations table...');
    
    // First get the details from telemetry_station
    const stationDetails = await client.query(`
      SELECT *
      FROM telemetry_station
      WHERE station_id = 'Ny.4'
      LIMIT 1
    `);
    
    if (stationDetails.rows.length === 0) {
      console.log('Could not find Ny.4 in telemetry_station table.');
      return;
    }
    
    const stationInfo = stationDetails.rows[0];
    console.log('Found Ny.4 in telemetry_station table:');
    console.table(stationInfo);
    
    // Check if it already exists in telemetry_data_stations
    const existingCheck = await client.query(`
      SELECT *
      FROM telemetry_data_stations
      WHERE station_id = 'Ny.4' OR station_code = 'Ny.4'
    `);
    
    if (existingCheck.rows.length > 0) {
      console.log('Station Ny.4 already exists in telemetry_data_stations:');
      console.table(existingCheck.rows);
      return;
    }
    
    // Generate a numeric station ID
    // You might need to adjust this logic or use a specific value
    const numericStationId = '421'; // Example value, adjust as needed
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Insert the new record
    const insertResult = await client.query(`
      INSERT INTO telemetry_data_stations (
        station_id,
        station_code,
        station_name,
        province_name,
        amphure_name,
        basin_name,
        numeric_station_id,
        data_source,
        category,
        has_data,
        status,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING *
    `, [
      'Ny.4',                   // station_id
      'Ny.4',                   // station_code
      stationInfo.station_name, // station_name
      stationInfo.province,     // province_name
      stationInfo.amphure,      // amphure_name
      stationInfo.river_basin,  // basin_name
      numericStationId,         // numeric_station_id
      'RID',                    // data_source
      'DB-only',                // category (assuming DB-only since not found in previous checks)
      true,                     // has_data (assuming it has data)
      'active'                  // status
    ]);
    
    console.log('Successfully added Ny.4 to telemetry_data_stations:');
    console.table(insertResult.rows[0]);
    
    // Commit the transaction
    await client.query('COMMIT');
    
    // Verify the record was added
    const verifyResult = await client.query(`
      SELECT id, station_id, station_code, station_name, numeric_station_id, data_source, category, has_data
      FROM telemetry_data_stations
      WHERE station_id = 'Ny.4'
    `);
    
    console.log('\nVerification:');
    console.table(verifyResult.rows);
    
  } catch (error) {
    // Rollback the transaction in case of error
    await client.query('ROLLBACK');
    console.error('Error adding missing station:', error);
  } finally {
    client.release();
    pool.end();
  }
}

// Run the script
addMissingStation().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 