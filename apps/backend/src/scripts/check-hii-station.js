// Script to check if HII station with ID 1109552 exists
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

/**
 * Check if HII station with ID 1109552 exists
 */
async function checkHIIStation() {
  console.log('Checking for HII station with ID 1109552...');
  
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
    // First check if the station exists in the database
    const dbQuery = `
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
        tambon,
        data_source
      FROM 
        thaiwater_tele_stations
      WHERE 
        tele_station_id = 1109552;
    `;
    
    const dbResult = await pool.query(dbQuery);
    
    if (dbResult.rowCount > 0) {
      console.log('Found station in database:');
      console.log(JSON.stringify(dbResult.rows[0], null, 2));
      console.log(`Data source: ${dbResult.rows[0].data_source}`);
    } else {
      console.log('Station with ID 1109552 not found in database.');
    }
    
    // Also check if it exists in the HII stations JSON file
    if (fs.existsSync('hii_stations.json')) {
      const hiiStations = JSON.parse(fs.readFileSync('hii_stations.json', 'utf8'));
      const station = hiiStations.find(s => s.tele_station_id === 1109552);
      
      if (station) {
        console.log('Found station in hii_stations.json:');
        console.log(JSON.stringify(station, null, 2));
      } else {
        console.log('Station with ID 1109552 not found in hii_stations.json.');
      }
    } else {
      console.log('hii_stations.json file not found.');
    }
    
  } catch (error) {
    console.error(`Error checking HII station: ${error.message}`);
    if (error.stack) {
      console.error(`Error stack: ${error.stack}`);
    }
  } finally {
    await pool.end();
    console.log('Check completed');
  }
}

// Run the function
checkHIIStation().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 