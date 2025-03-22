/**
 * Script to verify Gt.1 station removal from telemetry_data_stations table
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

async function verifyGt1Removal() {
  const client = await pool.connect();
  
  try {
    console.log('Verifying removal of Gt.1 related stations...');
    
    // Check if any Gt.1 related records exist
    const verifyResult = await client.query(`
      SELECT id, station_id, station_code, station_name, numeric_station_id, status
      FROM telemetry_data_stations
      WHERE station_id LIKE 'Gt.1%' OR station_code LIKE 'Gt.1%'
    `);
    
    if (verifyResult.rows.length === 0) {
      console.log('✅ Verification successful: No Gt.1 related records found in the database.');
    } else {
      console.log(`❌ Found ${verifyResult.rows.length} Gt.1 related records still in the database:`);
      console.table(verifyResult.rows);
    }
    
    // Check if 'Gt.' stations exist
    const gtStationsResult = await client.query(`
      SELECT id, station_id, station_code, station_name, numeric_station_id
      FROM telemetry_data_stations
      WHERE station_id LIKE 'Gt.%' OR station_code LIKE 'Gt.%'
      ORDER BY station_id
    `);
    
    if (gtStationsResult.rows.length === 0) {
      console.log('No stations with Gt. prefix exist in the database.');
    } else {
      console.log(`\nFound ${gtStationsResult.rows.length} stations with Gt. prefix in the database:`);
      console.table(gtStationsResult.rows);
    }
    
    // Check telemetry_station table (adapting query to match available columns)
    try {
      const stationResult = await client.query(`
        SELECT COUNT(*) as count
        FROM telemetry_station
        WHERE station_id LIKE 'Gt.1%'
      `);
      
      console.log('\nChecking for Gt.1 references in telemetry_station table:');
      console.log(`Found ${stationResult.rows[0].count} references to Gt.1 in telemetry_station table`);
      
      if (stationResult.rows[0].count > 0) {
        const stationDetailsResult = await client.query(`
          SELECT *
          FROM telemetry_station
          WHERE station_id LIKE 'Gt.1%'
          LIMIT 5
        `);
        
        console.log(`\nSample records from telemetry_station:`);
        console.table(stationDetailsResult.rows);
      }
    } catch (error) {
      console.error('Error checking telemetry_station table:', error.message);
    }
    
    // Check telemetry_data table (adapting query to match available columns)
    try {
      const dataResult = await client.query(`
        SELECT COUNT(*) as count
        FROM telemetry_data
        WHERE station_id LIKE 'Gt.1%'
      `);
      
      console.log('\nChecking for Gt.1 references in telemetry_data table:');
      console.log(`Found ${dataResult.rows[0].count} references to Gt.1 in telemetry_data table`);
      
      if (dataResult.rows[0].count > 0) {
        const dataDetailsResult = await client.query(`
          SELECT *
          FROM telemetry_data
          WHERE station_id LIKE 'Gt.1%'
          LIMIT 5
        `);
        
        console.log(`\nSample records from telemetry_data:`);
        console.table(dataDetailsResult.rows);
      }
    } catch (error) {
      console.error('Error checking telemetry_data table:', error.message);
    }
    
  } catch (error) {
    console.error('Error verifying Gt.1 station removal:', error);
  } finally {
    client.release();
    pool.end();
  }
}

// Run the script
verifyGt1Removal().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 