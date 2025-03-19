// Script to query specific TMD stations from the database
// Displaying station_id, station_name, amphure, province
import pg from 'pg';
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';

// Load environment variables
dotenv.config();

/**
 * Query specific TMD stations from the database and ThaiWater API
 */
async function querySpecificTMDStations() {
  console.log('Querying specific TMD stations...');
  
  // Create a connection pool
  const connectionString = process.env.DATABASE_URL;
  console.log(`Using connection string: ${connectionString}`);
  
  const pool = new pg.Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  // Station IDs to query
  const stationIds = [2232, 2233, 2235, 2236];
  
  try {
    // Query stations from database
    const dbStations = await queryDatabaseStations(pool, stationIds);
    
    // Query stations from ThaiWater API
    const apiStations = await queryThaiWaterAPI(stationIds);
    
    // Combine results
    const combinedResults = combineResults(dbStations, apiStations);
    
    // Display the results
    console.log('\nResults:');
    console.log(JSON.stringify(combinedResults, null, 2));
    
    // Save results to file
    const resultsFile = 'specific_tmd_stations_results.json';
    fs.writeFileSync(resultsFile, JSON.stringify(combinedResults, null, 2));
    console.log(`Results saved to ${resultsFile}`);
    
  } catch (error) {
    console.error(`Error querying stations: ${error.message}`);
    if (error.stack) {
      console.error(`Error stack: ${error.stack}`);
    }
  } finally {
    await pool.end();
    console.log('Query completed');
  }
}

/**
 * Query stations from the database
 * 
 * @param {pg.Pool} pool - Database connection pool
 * @param {number[]} stationIds - Array of station IDs to query
 * @returns {Promise<Object[]>} - Array of station objects
 */
async function queryDatabaseStations(pool, stationIds) {
  console.log(`Querying stations with IDs ${stationIds.join(', ')} from database...`);
  
  const query = `
    SELECT 
      tele_station_id as id, 
      tele_station_name as name, 
      tele_station_lat as latitude, 
      tele_station_long as longitude, 
      province, 
      amphure,
      data_source
    FROM 
      thaiwater_tele_stations
    WHERE 
      tele_station_id = ANY($1)
    ORDER BY 
      tele_station_id
  `;
  
  const result = await pool.query(query, [stationIds]);
  
  console.log(`Found ${result.rows.length} stations in database`);
  
  // Format the results
  return result.rows.map(station => ({
    id: station.id,
    name: station.name,
    province: station.province || null,
    amphure: station.amphure || null,
    data_source: station.data_source,
    source: 'database',
    coordinates: {
      latitude: station.latitude,
      longitude: station.longitude
    }
  }));
}

/**
 * Query stations from ThaiWater API
 * 
 * @param {number[]} stationIds - Array of station IDs to query
 * @returns {Promise<Object[]>} - Array of station objects
 */
async function queryThaiWaterAPI(stationIds) {
  console.log(`Querying stations with IDs ${stationIds.join(', ')} from ThaiWater API...`);
  
  const apiResults = [];
  
  try {
    // ThaiWater API endpoint for TMD stations
    const apiUrl = 'https://api2.thaiwater.net/api/v1/thaiwater30/api_service';
    
    // API parameters for TMD stations
    const params = {
      service: 'tmd',
      params: JSON.stringify({
        station_id: stationIds
      })
    };
    
    const response = await axios.get(apiUrl, { params });
    
    if (response.data && response.data.data) {
      console.log(`Found ${response.data.data.length} stations in ThaiWater API`);
      
      // Format the API results
      for (const station of response.data.data) {
        apiResults.push({
          id: station.id || station.station_id,
          name: station.station_name || station.tele_station_name,
          province: station.province_name || station.province,
          amphure: station.amphoe_name || station.amphoe || station.amphure,
          data_source: 'TMD',
          source: 'api',
          coordinates: {
            latitude: station.latitude || station.tele_station_lat,
            longitude: station.longitude || station.tele_station_long
          }
        });
      }
    } else {
      console.log('No data returned from ThaiWater API');
    }
  } catch (error) {
    console.error(`Error querying ThaiWater API: ${error.message}`);
    // Continue with database results only
  }
  
  return apiResults;
}

/**
 * Combine results from database and API
 * 
 * @param {Object[]} dbStations - Array of station objects from database
 * @param {Object[]} apiStations - Array of station objects from API
 * @returns {Object[]} - Combined array of station objects
 */
function combineResults(dbStations, apiStations) {
  const combinedResults = [];
  const processedIds = new Set();
  
  // Add database stations
  for (const dbStation of dbStations) {
    combinedResults.push(dbStation);
    processedIds.add(dbStation.id);
  }
  
  // Add API stations that are not in database
  for (const apiStation of apiStations) {
    if (!processedIds.has(apiStation.id)) {
      combinedResults.push(apiStation);
      processedIds.add(apiStation.id);
    }
  }
  
  // Sort by ID
  return combinedResults.sort((a, b) => a.id - b.id);
}

// Run the query function
querySpecificTMDStations().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 