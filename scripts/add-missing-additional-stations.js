/**
 * Script to add missing W.17A and N.80 stations to telemetry_data_stations table
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

async function addMissingAdditionalStations() {
  const client = await pool.connect();
  
  try {
    console.log('Adding missing W.17A and N.80 stations to telemetry_data_stations table...');
    
    // Define the stations to add
    const stationsToAdd = ['W.17A', 'N.80'];
    let totalAdded = 0;
    
    // Begin transaction
    await client.query('BEGIN');
    
    for (const stationId of stationsToAdd) {
      // First get the details from telemetry_station
      const stationDetails = await client.query(`
        SELECT *
        FROM telemetry_station
        WHERE station_id = $1
        LIMIT 1
      `, [stationId]);
      
      if (stationDetails.rows.length === 0) {
        console.log(`Could not find ${stationId} in telemetry_station table.`);
        continue;
      }
      
      const stationInfo = stationDetails.rows[0];
      console.log(`\nFound ${stationId} in telemetry_station table:`);
      console.table(stationInfo);
      
      // Check if it already exists in telemetry_data_stations
      const existingCheck = await client.query(`
        SELECT *
        FROM telemetry_data_stations
        WHERE station_id = $1 OR station_code = $1
      `, [stationId]);
      
      if (existingCheck.rows.length > 0) {
        console.log(`Station ${stationId} already exists in telemetry_data_stations:`);
        console.table(existingCheck.rows);
        continue;
      }
      
      // Generate a numeric station ID based on the station
      let numericStationId;
      if (stationId === 'W.17A') {
        numericStationId = '45'; // Example value for W.17A, adjust as needed
      } else if (stationId === 'N.80') {
        numericStationId = '374'; // Example value for N.80, adjust as needed
      }
      
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
        stationId,               // station_id
        stationId,               // station_code
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
      
      console.log(`Successfully added ${stationId} to telemetry_data_stations:`);
      console.table(insertResult.rows[0]);
      totalAdded++;
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log(`\nSuccessfully added ${totalAdded} stations to telemetry_data_stations.`);
    
    // Verify the records were added
    const stationIds = stationsToAdd.map(id => `'${id}'`).join(',');
    const verifyResult = await client.query(`
      SELECT id, station_id, station_code, station_name, numeric_station_id, data_source, category, has_data
      FROM telemetry_data_stations
      WHERE station_id IN (${stationIds})
    `);
    
    console.log('\nVerification:');
    console.table(verifyResult.rows);
    
  } catch (error) {
    // Rollback the transaction in case of error
    await client.query('ROLLBACK');
    console.error('Error adding missing stations:', error);
  } finally {
    client.release();
    pool.end();
  }
}

// Run the script
addMissingAdditionalStations().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 