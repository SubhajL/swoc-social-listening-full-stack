// Script to query all TMD stations and display specific columns in JSON format
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

/**
 * Query all TMD stations and display specific columns
 */
async function queryTMDStations() {
  console.log('Querying all TMD stations...');
  
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
    // Query all TMD stations with specific columns
    const stations = await queryStations(pool);
    console.log(`Found ${stations.length} TMD stations`);
    
    // Output to console in JSON format
    console.log(JSON.stringify(stations, null, 2));
    
    // Save to file
    fs.writeFileSync('tmd_stations.json', JSON.stringify(stations, null, 2));
    console.log('Results saved to tmd_stations.json');
    
  } catch (error) {
    console.error(`Error querying TMD stations: ${error.message}`);
    if (error.stack) {
      console.error(`Error stack: ${error.stack}`);
    }
  } finally {
    await pool.end();
    console.log('Query completed');
  }
}

/**
 * Query TMD stations with specific columns
 * 
 * @param {pg.Pool} pool - Database connection pool
 * @returns {Promise<Array>} - Array of stations
 */
async function queryStations(pool) {
  console.log('Executing query for TMD stations...');
  
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
      data_source = 'TMD'
    ORDER BY 
      tele_station_id;
  `;
  
  const result = await pool.query(query);
  return result.rows;
}

// Run the function
queryTMDStations().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 