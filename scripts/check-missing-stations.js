/**
 * Script to check the records of stations that couldn't be updated with coordinates
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');

// Load environment variables from backend .env file
dotenv.config({ path: path.resolve(__dirname, '../apps/backend/.env') });

// Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// List of stations that couldn't be updated
const MISSING_STATIONS = ['01', '02', '03', '04', '05', 'M.210', 'X.295', 'X.296'];

async function checkMissingStations() {
  const client = await pool.connect();
  
  try {
    console.log('Checking records for stations that could not be updated with coordinates:');
    
    // Check telemetry_data_stations first
    const { rows: dataStations } = await client.query(`
      SELECT id, station_id, station_name, category, numeric_station_id, 
             latitude, longitude, province_name, amphure_name, has_data 
      FROM telemetry_data_stations 
      WHERE station_id = ANY($1)
    `, [MISSING_STATIONS]);
    
    console.log('\n1. Records in telemetry_data_stations:');
    if (dataStations.length === 0) {
      console.log('No records found in telemetry_data_stations');
    } else {
      console.table(dataStations);
    }
    
    // Check if any of these stations exist in the telemetry_station table
    const { rows: telemetryStations } = await client.query(`
      SELECT station_id, province, amphure
      FROM telemetry_station 
      WHERE station_id = ANY($1)
    `, [MISSING_STATIONS]);
    
    console.log('\n2. Records in telemetry_station:');
    if (telemetryStations.length === 0) {
      console.log('No records found in telemetry_station');
    } else {
      console.table(telemetryStations);
    }
    
    // Check if these station codes exist in station mappings
    const STATION_MAPPING_DIR = 'station_mapping';
    const EXPANDED_CODE_TO_ID_FILE = path.join(STATION_MAPPING_DIR, 'expanded_code_to_id.json');
    
    if (fs.existsSync(EXPANDED_CODE_TO_ID_FILE)) {
      const codeToId = JSON.parse(fs.readFileSync(EXPANDED_CODE_TO_ID_FILE, 'utf8'));
      
      console.log('\n3. Station mappings in expanded_code_to_id.json:');
      MISSING_STATIONS.forEach(stationId => {
        const numericId = codeToId[stationId];
        console.log(`${stationId}: ${numericId ? numericId : 'Not in mapping'}`);
      });
    }
    
    // Save results to a file
    fs.writeFileSync('missing_stations_report.json', JSON.stringify({
      telemetry_data_stations: dataStations,
      telemetry_station: telemetryStations
    }, null, 2));
    
    console.log('\nResults saved to missing_stations_report.json');
    
  } catch (error) {
    console.error('Error checking missing stations:', error);
  } finally {
    client.release();
    pool.end();
  }
}

// Run the script
checkMissingStations().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 