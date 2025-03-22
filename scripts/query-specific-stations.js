/**
 * Script to query detailed information about specific stations
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

async function querySpecificStations() {
  const client = await pool.connect();
  
  try {
    const stationIds = ['Ny.4', 'P.76', 'W.17A'];
    console.log(`Querying information for stations: ${stationIds.join(', ')}...`);
    
    // Query detailed information about the stations from telemetry_data_stations
    const stationsResult = await client.query(`
      SELECT *
      FROM telemetry_data_stations
      WHERE station_id IN (${stationIds.map((_, i) => `$${i+1}`).join(',')})
      OR station_code IN (${stationIds.map((_, i) => `$${i+1}`).join(',')})
      ORDER BY id
    `, stationIds);
    
    console.log(`\nFound ${stationsResult.rows.length} matching stations in telemetry_data_stations:`);
    
    if (stationsResult.rows.length > 0) {
      // For cleaner output, show just key fields
      const keyFields = stationsResult.rows.map(row => ({
        id: row.id,
        station_id: row.station_id,
        station_code: row.station_code,
        station_name: row.station_name,
        numeric_station_id: row.numeric_station_id,
        data_source: row.data_source,
        has_data: row.has_data,
        show_hourly_report: row.show_hourly_report,
        show_daily_report: row.show_daily_report,
        status: row.status
      }));
      
      console.table(keyFields);
    } else {
      console.log('No matching stations found in telemetry_data_stations table.');
    }
    
    // Query information from telemetry_station table
    const telemetryStationResult = await client.query(`
      SELECT id, station_id, station_name, code, river_basin, river_name, province
      FROM telemetry_station
      WHERE station_id IN (${stationIds.map((_, i) => `$${i+1}`).join(',')})
      ORDER BY id
    `, stationIds);
    
    console.log(`\nFound ${telemetryStationResult.rows.length} matching stations in telemetry_station:`);
    
    if (telemetryStationResult.rows.length > 0) {
      console.table(telemetryStationResult.rows);
    } else {
      console.log('No matching stations found in telemetry_station table.');
    }
    
    // Check for these stations in the API response (if available)
    try {
      // Query the API settings
      const apiSettingsResult = await client.query(`
        SELECT *
        FROM setting
        WHERE key IN ('TELEMETRY_API_URL', 'TELEMETRY_API_KEY')
      `);
      
      if (apiSettingsResult.rows.length > 0) {
        const apiSettings = {};
        for (const row of apiSettingsResult.rows) {
          apiSettings[row.key] = row.value;
        }
        
        console.log('\nAPI settings available. To check these stations in the API, you could use:');
        console.log(`API URL: ${apiSettings.TELEMETRY_API_URL || 'Not configured'}`);
        console.log('Sample API endpoints: /getHourlyStationList, /getDailyStationList');
      }
    } catch (error) {
      console.log('Could not query API settings:', error.message);
    }
    
    // Find any duplicate numeric_station_id values for these stations
    const duplicateNumericIdResult = await client.query(`
      WITH station_numeric_ids AS (
        SELECT numeric_station_id
        FROM telemetry_data_stations
        WHERE station_id IN (${stationIds.map((_, i) => `$${i+1}`).join(',')})
        OR station_code IN (${stationIds.map((_, i) => `$${i+1}`).join(',')})
      )
      SELECT s.numeric_station_id, COUNT(*) as count
      FROM telemetry_data_stations s
      JOIN station_numeric_ids n ON s.numeric_station_id = n.numeric_station_id
      GROUP BY s.numeric_station_id
      HAVING COUNT(*) > 1
    `, stationIds);
    
    if (duplicateNumericIdResult.rows.length > 0) {
      console.log('\n⚠️ Found duplicate numeric_station_id values for the queried stations:');
      console.table(duplicateNumericIdResult.rows);
      
      // Get details of the stations with duplicate numeric_station_id
      for (const dup of duplicateNumericIdResult.rows) {
        const dupDetailsResult = await client.query(`
          SELECT id, station_id, station_code, numeric_station_id, station_name
          FROM telemetry_data_stations
          WHERE numeric_station_id = $1
          ORDER BY id
        `, [dup.numeric_station_id]);
        
        console.log(`\nStations sharing numeric_station_id = ${dup.numeric_station_id}:`);
        console.table(dupDetailsResult.rows);
      }
    } else {
      console.log('\n✅ No duplicate numeric_station_id values found for the queried stations.');
    }
    
  } catch (error) {
    console.error('Error querying stations:', error);
  } finally {
    client.release();
    pool.end();
  }
}

// Run the script
querySpecificStations().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 