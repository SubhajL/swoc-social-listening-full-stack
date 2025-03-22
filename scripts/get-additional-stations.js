/**
 * Script to retrieve records for additional stations
 * W.17A, E.75, N.80, C.38, C.22A
 */

const dotenv = require('dotenv');
const path = require('path');
const { Pool } = require('pg');
const fs = require('fs');

// Load environment variables from backend .env file
dotenv.config({ path: path.resolve(__dirname, '../apps/backend/.env') });

// Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function getAdditionalStations() {
  const client = await pool.connect();
  
  try {
    console.log('Retrieving records for additional stations...');
    
    // List of specific station_codes to look up
    const stationCodes = [
      'W.17A', 'E.75', 'N.80', 'C.38', 'C.22A'
    ];
    
    // Get records from telemetry_data_stations
    const dataStationsResult = await client.query(`
      SELECT *
      FROM telemetry_data_stations
      WHERE station_id = ANY($1::text[])
      OR station_code = ANY($1::text[])
      ORDER BY station_code
    `, [stationCodes]);
    
    console.log(`Found ${dataStationsResult.rows.length} records in telemetry_data_stations:`);
    
    // Print each record
    dataStationsResult.rows.forEach((record, index) => {
      console.log(`\n--- Record ${index + 1} ---`);
      console.log(`id: ${record.id}`);
      console.log(`station_id: ${record.station_id}`);
      console.log(`station_code: ${record.station_code}`);
      console.log(`station_name: ${record.station_name}`);
      console.log(`numeric_station_id: ${record.numeric_station_id}`);
      console.log(`data_source: ${record.data_source}`);
      console.log(`category: ${record.category}`);
      console.log(`has_data: ${record.has_data}`);
    });
    
    // Also check telemetry_station table
    const telemetryStationResult = await client.query(`
      SELECT *
      FROM telemetry_station
      WHERE station_id = ANY($1::text[])
      OR code = ANY($1::text[])
      ORDER BY station_id
    `, [stationCodes]);
    
    console.log(`\nFound ${telemetryStationResult.rows.length} records in telemetry_station:`);
    
    // Print each record from telemetry_station
    telemetryStationResult.rows.forEach((record, index) => {
      console.log(`\n--- Original Record ${index + 1} ---`);
      console.log(`id: ${record.id}`);
      console.log(`station_id: ${record.station_id}`);
      console.log(`code: ${record.code}`);
      console.log(`station_name: ${record.station_name}`);
      console.log(`river_basin: ${record.river_basin}`);
      console.log(`river_name: ${record.river_name}`);
      console.log(`amphure: ${record.amphure}`);
      console.log(`province: ${record.province}`);
    });
    
    // Save all records to a JSON file
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const outputFile = `additional_stations_${timestamp}.json`;
    
    const outputData = {
      dataStations: dataStationsResult.rows,
      telemetryStations: telemetryStationResult.rows
    };
    
    fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2));
    console.log(`\nAll records saved to ${outputFile}`);
    
    // Create a summary table
    console.log('\nSummary Table:');
    console.log('=============================================================');
    console.log('Station | In telemetry_data_stations | In telemetry_station');
    console.log('=============================================================');
    
    for (const code of stationCodes) {
      const inDataStations = dataStationsResult.rows.some(r => r.station_code === code || r.station_id === code);
      const inTelemetryStation = telemetryStationResult.rows.some(r => r.station_id === code || r.code === code);
      console.log(`${code.padEnd(8)} | ${(inDataStations ? 'Yes' : 'No').padEnd(24)} | ${inTelemetryStation ? 'Yes' : 'No'}`);
    }
    console.log('=============================================================');
    
    // Check for missing records that need to be added
    const missingStations = [];
    
    for (const code of stationCodes) {
      // If station exists in telemetry_station but not in telemetry_data_stations
      if (!dataStationsResult.rows.some(r => r.station_code === code || r.station_id === code) && 
          telemetryStationResult.rows.some(r => r.station_id === code || r.code === code)) {
        missingStations.push(code);
      }
    }
    
    if (missingStations.length > 0) {
      console.log(`\nStations that need to be added to telemetry_data_stations: ${missingStations.join(', ')}`);
    } else {
      console.log('\nNo missing stations found that need to be added.');
    }
    
  } catch (error) {
    console.error('Error retrieving station records:', error);
  } finally {
    client.release();
    pool.end();
  }
}

// Run the script
getAdditionalStations().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 