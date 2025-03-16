// Script to query all HII stations and display specific columns in JSON format
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

/**
 * Query all HII stations and display specific columns
 */
async function queryHIIStations() {
  console.log('Querying all HII stations...');
  
  // Create a connection pool
  const connectionString = process.env.DATABASE_URL;
  console.log(`Using connection string: ${connectionString}`);
  
  const pool = new pg.Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    // Query all HII stations with specific columns
    const stations = await queryStations(pool);
    console.log(`Found ${stations.length} HII stations`);
    
    // Output to console in JSON format
    console.log(JSON.stringify(stations, null, 2));
    
    // Save to file
    fs.writeFileSync('hii_stations.json', JSON.stringify(stations, null, 2));
    console.log('Results saved to hii_stations.json');
    
  } catch (error) {
    console.error(`Error querying HII stations: ${error.message}`);
    if (error.stack) {
      console.error(`Error stack: ${error.stack}`);
    }
  } finally {
    await pool.end();
    console.log('Query completed');
  }
}

/**
 * Query HII stations with specific columns
 * 
 * @param {pg.Pool} pool - Database connection pool
 * @returns {Promise<Array>} - Array of stations
 */
async function queryStations(pool) {
  console.log('Executing query for HII stations...');
  
  const query = `
    SELECT 
      tele_station_id,
      tele_station_oldcode,
      tele_station_name,
      tele_station_name_th,
      tele_station_lat,
      tele_station_long,
      tele_station_type,
      province,
      amphure,
      tambon
    FROM 
      thaiwater_tele_stations
    WHERE 
      data_source = 'HII'
    ORDER BY 
      tele_station_id;
  `;
  
  const result = await pool.query(query);
  return result.rows;
}

// Run the function
queryHIIStations().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 