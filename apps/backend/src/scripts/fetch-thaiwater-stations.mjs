import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;

// Load environment variables
dotenv.config();

/**
 * Fetches records from the thaiwater_tele_stations table
 */
async function fetchThaiWaterStations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  console.log('[ThaiWaterStations] Fetching records from thaiwater_tele_stations');

  try {
    // Connect to the database
    const client = await pool.connect();
    
    try {
      // Get total count
      const countQuery = `SELECT COUNT(*) FROM thaiwater_tele_stations`;
      const countResult = await client.query(countQuery);
      const totalCount = parseInt(countResult.rows[0].count, 10);
      
      console.log(`[ThaiWaterStations] Total records in database: ${totalCount}`);
      
      // Query to fetch real data (skipping sample data with IDs 1001-1010)
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
        WHERE tele_station_id < 1000
        ORDER BY tele_station_id
        LIMIT 20
      `;
      
      const result = await client.query(query);
      
      if (result.rows.length === 0) {
        console.log('[ThaiWaterStations] No real records found in thaiwater_tele_stations');
      } else {
        console.log(`[ThaiWaterStations] Found ${result.rows.length} real records`);
        console.log(JSON.stringify(result.rows, null, 2));
      }
      
      // Get station types distribution
      const typesQuery = `
        SELECT tele_station_type, COUNT(*) as count
        FROM thaiwater_tele_stations
        WHERE tele_station_id < 1000
        GROUP BY tele_station_type
        ORDER BY count DESC
      `;
      
      const typesResult = await client.query(typesQuery);
      
      console.log('\n[ThaiWaterStations] Station types distribution:');
      typesResult.rows.forEach(row => {
        console.log(`- ${row.tele_station_type}: ${row.count} stations`);
      });
      
      // Get warning stations count
      const warningQuery = `
        SELECT COUNT(*) as count
        FROM thaiwater_tele_stations
        WHERE tele_station_id < 1000 AND is_warning = true
      `;
      
      const warningResult = await client.query(warningQuery);
      console.log(`\n[ThaiWaterStations] Stations with warning status: ${warningResult.rows[0].count}`);
      
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