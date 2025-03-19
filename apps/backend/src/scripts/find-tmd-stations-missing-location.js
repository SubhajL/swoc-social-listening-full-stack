// Script to find TMD stations that are missing location data (province or amphure)
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

/**
 * Find TMD stations that are missing location data
 */
async function findMissingLocationStations() {
  console.log('Finding TMD stations with missing location data...');
  
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
    // Query TMD stations with missing province or amphure
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
        AND (province IS NULL OR amphure IS NULL)
      ORDER BY 
        tele_station_id;
    `;
    
    console.log('Executing query...');
    const result = await pool.query(query);
    
    console.log(`Found ${result.rows.length} TMD stations with missing location data`);
    
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
      tambon: station.tambon,
      missing: {
        province: station.province === null,
        amphure: station.amphure === null
      }
    }));
    
    // Display the results
    console.log('\nTMD Stations with Missing Location Data:');
    console.log(JSON.stringify(formattedResults, null, 2));
    
    // Save results to file
    const resultsFile = 'tmd_stations_missing_location.json';
    fs.writeFileSync(resultsFile, JSON.stringify(formattedResults, null, 2));
    console.log(`\nResults saved to ${resultsFile}`);
    
    // Group by missing data type
    const missingProvince = formattedResults.filter(station => station.missing.province).length;
    const missingAmphure = formattedResults.filter(station => station.missing.amphure).length;
    const missingBoth = formattedResults.filter(station => station.missing.province && station.missing.amphure).length;
    
    // Generate statistics
    const statistics = {
      total_missing: formattedResults.length,
      missing_province: missingProvince,
      missing_amphure: missingAmphure,
      missing_both: missingBoth,
      percentage_of_all_tmd: ((formattedResults.length / 1294) * 100).toFixed(2) + '%'
    };
    
    console.log('\nStatistics:');
    console.log(JSON.stringify(statistics, null, 2));
    
    // Check if stations have coordinates
    const withCoordinates = formattedResults.filter(
      station => !isNaN(station.latitude) && !isNaN(station.longitude) && 
                station.latitude !== 0 && station.longitude !== 0
    ).length;
    
    console.log(`\nStations with missing location but having coordinates: ${withCoordinates}/${formattedResults.length}`);
    
    // Suggest next steps
    console.log('\nPossible next steps:');
    console.log('1. Use the Google Maps API to geocode the coordinates and get province/amphure information');
    console.log('2. Update the database with the missing location data');
    console.log('3. Check for any patterns in the missing data (e.g., specific regions or station types)');
    
  } catch (error) {
    console.error(`Error finding missing location stations: ${error.message}`);
    if (error.stack) {
      console.error(`Error stack: ${error.stack}`);
    }
  } finally {
    await pool.end();
    console.log('\nQuery completed');
  }
}

// Run the function
findMissingLocationStations().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 