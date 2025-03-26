// Script to find TMD stations in thaiwater_tele_stations
const dotenv = require('dotenv');
const pg = require('pg');
const path = require('path');
const fs = require('fs');

// Load environment variables from backend .env
const envPath = path.join(__dirname, 'apps/backend/.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.log(`Backend .env file not found at: ${envPath}`);
  dotenv.config(); // Try default location
}

// Database configuration
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function findTMDStations() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    // Count total TMD stations
    const countQuery = "SELECT COUNT(*) FROM thaiwater_tele_stations WHERE data_source = 'TMD'";
    const countResult = await client.query(countQuery);
    console.log(`Number of TMD stations: ${countResult.rows[0].count}`);
    
    // Get sample TMD stations
    const sampleQuery = `
      SELECT 
        tele_station_id, 
        tele_station_name_th, 
        tele_station_lat, 
        tele_station_long, 
        province, 
        amphure, 
        data_source 
      FROM thaiwater_tele_stations 
      WHERE data_source = 'TMD' 
      LIMIT 10
    `;
    const sampleResult = await client.query(sampleQuery);
    console.log('Sample TMD stations:');
    console.table(sampleResult.rows);
    
    // Get count by province
    const provinceQuery = `
      SELECT 
        province, 
        COUNT(*) as station_count 
      FROM thaiwater_tele_stations 
      WHERE data_source = 'TMD' AND province IS NOT NULL
      GROUP BY province 
      ORDER BY station_count DESC 
      LIMIT 10
    `;
    const provinceResult = await client.query(provinceQuery);
    console.log('TMD stations by province (top 10):');
    console.table(provinceResult.rows);
    
    client.release();
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the function
findTMDStations().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 