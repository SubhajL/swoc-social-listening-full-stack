// Script to query all TMD stations from the thaiwater_tele_stations table
// Displaying specific columns and outputting in JSON format
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

/**
 * Query all TMD stations from the thaiwater_tele_stations table
 */
async function queryTMDStations() {
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
    
    // Display a sample of the results (first 5 stations)
    console.log('\nSample of TMD Stations:');
    console.log(JSON.stringify(formattedResults.slice(0, 5), null, 2));
    
    // Save results to file
    const resultsFile = 'tmd_stations_columns.json';
    fs.writeFileSync(resultsFile, JSON.stringify(formattedResults, null, 2));
    console.log(`\nAll ${formattedResults.length} TMD stations saved to ${resultsFile}`);
    
    // Generate statistics
    const stationsWithLocation = formattedResults.filter(
      station => station.province && station.amphure
    ).length;
    
    const stationsWithCoordinates = formattedResults.filter(
      station => !isNaN(station.latitude) && !isNaN(station.longitude) && 
                station.latitude !== 0 && station.longitude !== 0
    ).length;
    
    const statistics = {
      total: formattedResults.length,
      with_location: stationsWithLocation,
      with_coordinates: stationsWithCoordinates,
      location_percentage: ((stationsWithLocation / formattedResults.length) * 100).toFixed(2) + '%',
      coordinates_percentage: ((stationsWithCoordinates / formattedResults.length) * 100).toFixed(2) + '%'
    };
    
    console.log('\nStatistics:');
    console.log(JSON.stringify(statistics, null, 2));
    
    // Save statistics to file
    const statisticsFile = 'tmd_stations_statistics.json';
    fs.writeFileSync(statisticsFile, JSON.stringify(statistics, null, 2));
    console.log(`Statistics saved to ${statisticsFile}`);
    
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
queryTMDStations().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 