const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

/**
 * Fetches 10 records from the thaiwater_tele_stations table
 */
async function fetchThaiWaterStations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  console.log('[ThaiWaterStations] Fetching 10 records from thaiwater_tele_stations');

  try {
    // Connect to the database
    const client = await pool.connect();
    
    try {
      // Query to fetch 10 records
      const query = `
        SELECT 
          tele_station_id, 
          tele_station_name, 
          tele_station_name_th, 
          tele_station_lat, 
          tele_station_long, 
          tele_station_type,
          agency_id,
          ground_level,
          left_bank,
          right_bank,
          is_warning,
          province,
          amphure,
          tambon,
          created_at,
          updated_at
        FROM thaiwater_tele_stations
        LIMIT 10
      `;
      
      const result = await client.query(query);
      
      if (result.rows.length === 0) {
        console.log('[ThaiWaterStations] No records found in thaiwater_tele_stations');
      } else {
        console.log(`[ThaiWaterStations] Found ${result.rows.length} records`);
        console.log(JSON.stringify(result.rows, null, 2));
      }
      
    } finally {
      // Release the client back to the pool
      client.release();
    }
    
  } catch (error) {
    console.error('[ThaiWaterStations] Error fetching records', {
      error: error.message,
      stack: error.stack
    });
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Execute the function
fetchThaiWaterStations().catch(error => {
  console.error('[ThaiWaterStations] Unhandled error', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
}); 