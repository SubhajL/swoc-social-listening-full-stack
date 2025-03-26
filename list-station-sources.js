// Script to list all data sources in thaiwater_tele_stations
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

async function listStationSources() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    // Count stations by data source
    const sourceQuery = `
      SELECT 
        data_source, 
        COUNT(*) as station_count 
      FROM thaiwater_tele_stations 
      GROUP BY data_source 
      ORDER BY station_count DESC
    `;
    const sourceResult = await client.query(sourceQuery);
    console.log('Station count by data source:');
    console.table(sourceResult.rows);
    
    // Sample stations for each data source
    for (const source of sourceResult.rows) {
      if (!source.data_source) {
        console.log('\nSample stations with NULL data_source:');
      } else {
        console.log(`\nSample stations with data_source = '${source.data_source}':`);
      }
      
      const sampleQuery = `
        SELECT 
          tele_station_id, 
          tele_station_name_th, 
          tele_station_lat, 
          tele_station_long, 
          province, 
          amphure 
        FROM thaiwater_tele_stations 
        WHERE data_source ${source.data_source ? `= '${source.data_source}'` : 'IS NULL'}
        LIMIT 3
      `;
      const sampleResult = await client.query(sampleQuery);
      console.table(sampleResult.rows);
    }
    
    client.release();
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the function
listStationSources().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 