/**
 * Script to list all records from telemetry_data_stations table
 * with selected columns and output in prettified JSON format
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

/**
 * List all records from telemetry_data_stations table
 */
async function listDataStations() {
  try {
    const client = await pool.connect();
    
    try {
      console.log('Fetching records from telemetry_data_stations table...');
      
      // SQL query to get all records with specified columns
      const query = `
        SELECT 
          id,
          station_id,
          station_code,
          station_name,
          numeric_station_id,
          latitude,
          longitude,
          amphure_name,
          province_name,
          status
        FROM 
          telemetry_data_stations
        ORDER BY 
          id;
      `;
      
      const result = await client.query(query);
      
      console.log(`Found ${result.rowCount} records`);
      
      // Save results to JSON file with pretty formatting
      const outputFile = 'telemetry_data_stations.json';
      fs.writeFileSync(outputFile, JSON.stringify(result.rows, null, 2));
      
      // Print the JSON to console as well
      console.log(JSON.stringify(result.rows, null, 2));
      
      console.log(`\nResults saved to ${outputFile}`);
      
      return result.rows;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching data stations:', error);
    return [];
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the function
listDataStations().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
}); 