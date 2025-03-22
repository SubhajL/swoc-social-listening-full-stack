/**
 * Script to list column names of both telemetry_station and telemetry_data_stations tables in JSON format
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

async function compareTableColumns() {
  const client = await pool.connect();
  
  try {
    // Get column information for telemetry_station
    const stationResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'telemetry_station'
      ORDER BY ordinal_position
    `);
    
    // Get column information for telemetry_data_stations
    const dataStationsResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'telemetry_data_stations'
      ORDER BY ordinal_position
    `);
    
    // Prepare simple JSON output with just column names
    const result = {
      telemetry_station: stationResult.rows.map(row => row.column_name),
      telemetry_data_stations: dataStationsResult.rows.map(row => row.column_name)
    };
    
    // Print to console
    console.log('Column names comparison in JSON format:');
    console.log(JSON.stringify(result, null, 2));
    
    // Save to file
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const outputFile = `table_columns_simple_${timestamp}.json`;
    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
    
    console.log(`\nComparison saved to ${outputFile}`);
    
  } catch (error) {
    console.error('Error comparing table columns:', error);
  } finally {
    client.release();
    pool.end();
  }
}

// Run the script
compareTableColumns().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 