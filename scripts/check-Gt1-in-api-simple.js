/**
 * Simplified script to check if Gt.1 is returned from getHourlyStationList or getDailyStationList
 */

const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from backend .env file
dotenv.config({ path: path.resolve(__dirname, '../apps/backend/.env') });

// API base URL from environment variable or default to production URL
const API_BASE_URL = process.env.TELEMETRY_API_URL || 'https://api-v2.thaiwater.net/api';

// Create axios instance with default timeout
const api = axios.create({
  timeout: 10000, // 10 second timeout
  headers: { 'Accept': 'application/json' }
});

// Async sleep function for retry delays
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function to check if a station exists in the API response
function checkStationInResponse(stationId, responseData, endpoint) {
  const stations = responseData || [];
  const found = stations.find(station => 
    station.station_id === stationId || 
    station.station_code === stationId
  );
  
  if (found) {
    console.log(`✅ Station ${stationId} FOUND in ${endpoint} response:`);
    console.log(JSON.stringify(found, null, 2));
    return true;
  } else {
    console.log(`❌ Station ${stationId} NOT FOUND in ${endpoint} response`);
    
    // Let's look for any stations with IDs containing "Gt"
    const gtStations = stations.filter(station => 
      (station.station_id && station.station_id.includes('Gt')) || 
      (station.station_code && station.station_code.includes('Gt'))
    );
    
    if (gtStations.length > 0) {
      console.log(`\nFound ${gtStations.length} stations with IDs containing "Gt":`);
      gtStations.forEach(station => {
        console.log(`- station_id: "${station.station_id}", name: "${station.station_name}"`);
      });
    }
    
    return false;
  }
}

// Function to fetch API data with retries
async function fetchAPIWithRetry(endpoint, maxRetries = 3) {
  const url = `${API_BASE_URL}/${endpoint}`;
  let retries = 0;
  
  while (retries <= maxRetries) {
    try {
      console.log(`Attempt ${retries + 1}: Fetching data from ${endpoint}...`);
      const response = await api.get(url);
      console.log(`✅ Successfully received data from ${endpoint}`);
      return response.data;
    } catch (error) {
      retries++;
      console.error(`❌ Attempt ${retries}/${maxRetries + 1} failed: ${error.message}`);
      
      if (retries <= maxRetries) {
        // Exponential backoff: 1s, 2s, 4s...
        const delay = Math.pow(2, retries - 1) * 1000;
        console.log(`Retrying in ${delay/1000} seconds...`);
        await sleep(delay);
      } else {
        console.error(`All ${maxRetries + 1} attempts failed for ${endpoint}`);
        throw error;
      }
    }
  }
}

// Alternative approach using direct database query
async function checkStationInDatabase(stationId) {
  const { Pool } = require('pg');
  
  // Create database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  console.log(`\n--- Checking database for ${stationId} ---`);
  
  try {
    const client = await pool.connect();
    try {
      // Check if station exists
      const stationResult = await client.query(`
        SELECT *
        FROM telemetry_data_stations
        WHERE station_id = $1 OR station_code = $1
      `, [stationId]);
      
      if (stationResult.rows.length > 0) {
        console.log(`✅ Found ${stationId} in telemetry_data_stations table:`);
        console.table(stationResult.rows[0]);
        
        // Check crucial flags
        if (stationResult.rows[0].show_hourly_report && stationResult.rows[0].show_daily_report) {
          console.log(`✅ ${stationId} has show_hourly_report and show_daily_report flags set to TRUE`);
        } else {
          console.log(`❌ ${stationId} is missing required flags: show_hourly_report=${stationResult.rows[0].show_hourly_report}, show_daily_report=${stationResult.rows[0].show_daily_report}`);
        }
        
        // Check if the station has a unique numeric_station_id
        const numericIdResult = await client.query(`
          SELECT COUNT(*) as count
          FROM telemetry_data_stations
          WHERE numeric_station_id = $1
        `, [stationResult.rows[0].numeric_station_id]);
        
        if (numericIdResult.rows[0].count > 1) {
          console.log(`❌ Warning: ${stationId} shares its numeric_station_id (${stationResult.rows[0].numeric_station_id}) with ${numericIdResult.rows[0].count - 1} other stations`);
        } else {
          console.log(`✅ ${stationId} has a unique numeric_station_id (${stationResult.rows[0].numeric_station_id})`);
        }
      } else {
        console.log(`❌ ${stationId} NOT found in telemetry_data_stations table`);
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`Error checking database: ${error.message}`);
  } finally {
    await pool.end();
  }
}

async function main() {
  console.log('Checking if Gt.1 is returned from getHourlyStationList or getDailyStationList...');
  
  // Station ID to check
  const stationId = 'Gt.1';
  
  try {
    // First check the database
    await checkStationInDatabase(stationId);
    
    // Try to fetch from API with retries
    try {
      // Get hourly station list
      const hourlyData = await fetchAPIWithRetry('getHourlyStationList');
      console.log(`Received ${hourlyData.length} stations from getHourlyStationList`);
      checkStationInResponse(stationId, hourlyData, 'getHourlyStationList');
    } catch (error) {
      console.error(`Could not fetch hourly station list: ${error.message}`);
    }
    
    try {
      // Get daily station list
      const dailyData = await fetchAPIWithRetry('getDailyStationList');
      console.log(`Received ${dailyData.length} stations from getDailyStationList`);
      checkStationInResponse(stationId, dailyData, 'getDailyStationList');
    } catch (error) {
      console.error(`Could not fetch daily station list: ${error.message}`);
    }
    
    console.log('\nCheck completed.');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the script
main(); 