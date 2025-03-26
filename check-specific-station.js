// Script to check a specific station in the database
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

// Station ID to check
const stationId = process.argv[2] || '1128781';

async function checkStation() {
  try {
    const client = await pool.connect();
    
    // Get station from database
    const query = `
      SELECT * 
      FROM thaiwater_tele_stations 
      WHERE tele_station_id = $1
    `;
    
    const result = await client.query(query, [stationId]);
    
    if (result.rows.length === 0) {
      console.log(`Station ${stationId} not found in database`);
    } else {
      console.log('Station data from database:');
      console.log(JSON.stringify(result.rows[0], null, 2));
    }
    
    client.release();
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the function
checkStation().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 