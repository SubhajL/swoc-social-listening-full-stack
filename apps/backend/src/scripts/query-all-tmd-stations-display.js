// Script to query and display ALL TMD stations from the thaiwater_tele_stations table
// Displaying columns 1-6 and 13-15 (station ID, name, name_th, oldcode, lat, long, province, amphure, tambon)
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

/**
 * Query and display all TMD stations from the thaiwater_tele_stations table
 */
async function displayAllTMDStations() {
  console.log('Querying all TMD stations from thaiwater_tele_stations table...');
  
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
    // Query TMD stations with specific columns
    const query = `
      SELECT 
        tele_station_id,
        tele_station_name,
        tele_station_name_th,
        tele_station_oldcode,
        tele_station_lat,
        tele_station_long,
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
    
    console.log('Executing query...');
    const result = await pool.query(query);
    
    console.log(`Found ${result.rows.length} TMD stations`);
    
    // Format the results
    const formattedResults = result.rows.map(station => ({
      id: station.tele_station_id,
      name: station.tele_station_name,
      name_th: station.tele_station_name_th,
      oldcode: station.tele_station_oldcode,
      latitude: parseFloat(station.tele_station_lat),
      longitude: parseFloat(station.tele_station_long),
      province: station.province,
      amphure: station.amphure,
      tambon: station.tambon
    }));
    
    // Display ALL results
    console.log('\nALL TMD Stations:');
    console.log(JSON.stringify(formattedResults, null, 2));
    
    console.log(`\nTotal: ${formattedResults.length} TMD stations displayed`);
    
  } catch (error) {
    console.error(`Error querying TMD stations: ${error.message}`);
    if (error.stack) {
      console.error(`Error stack: ${error.stack}`);
    }
  } finally {
    await pool.end();
    console.log('\nQuery completed');
  }
}

// Run the query function
displayAllTMDStations().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 