/**
 * Script to check if station M.210 has been updated with coordinates
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

async function checkStation() {
  const client = await pool.connect();
  
  try {
    const { rows } = await client.query(`
      SELECT id, station_id, station_name, category, numeric_station_id, 
             latitude, longitude, province_name, amphure_name, has_data 
      FROM telemetry_data_stations 
      WHERE station_id = $1
    `, ['M.210']);
    
    console.log('Station M.210 details:');
    console.table(rows);
    
  } catch (error) {
    console.error('Error checking station:', error);
  } finally {
    client.release();
    pool.end();
  }
}

// Run the script
checkStation().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 