/**
 * Script to check if Gt.1 is returned from getHourlyStationList or getDailyStationList
 */

const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables from backend .env file
dotenv.config({ path: path.resolve(__dirname, '../apps/backend/.env') });

// API base URL from environment variable or default to production URL
const API_BASE_URL = process.env.TELEMETRY_API_URL || 'https://api-v2.thaiwater.net/api';

// Function to check if a station exists in the API response
function checkStationInResponse(stationId, responseData, endpoint) {
  const stations = responseData || [];
  const found = stations.find(station => 
    station.station_id === stationId || 
    station.station_id === stationId.trim() ||
    station.station_code === stationId ||
    station.station_code === stationId.trim()
  );
  
  if (found) {
    console.log(`✅ Station ${stationId} FOUND in ${endpoint} response:`);
    console.log(JSON.stringify(found, null, 2));
    return true;
  } else {
    console.log(`❌ Station ${stationId} NOT FOUND in ${endpoint} response`);
    return false;
  }
}

// Function to get data from API endpoint
async function fetchAPIData(endpoint) {
  try {
    console.log(`Fetching data from ${endpoint}...`);
    const url = `${API_BASE_URL}/${endpoint}`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`Error fetching data from ${endpoint}:`, error.message);
    return null;
  }
}

// Function to search for station by ID or partial match
function searchStationById(stationId, responseData, endpoint) {
  const stations = responseData || [];
  console.log(`\nSearching for stations with ID containing "${stationId}" in ${endpoint}:`);
  
  const matches = stations.filter(station => {
    const sId = (station.station_id || '').toLowerCase();
    const sCode = (station.station_code || '').toLowerCase();
    const searchTerm = stationId.toLowerCase();
    
    return sId.includes(searchTerm) || sCode.includes(searchTerm);
  });
  
  if (matches.length > 0) {
    console.log(`Found ${matches.length} stations with ID/code containing "${stationId}":`);
    matches.forEach(station => {
      console.log(`- station_id: "${station.station_id}", station_code: "${station.station_code}", name: "${station.station_name}"`);
    });
  } else {
    console.log(`No stations found with ID/code containing "${stationId}"`);
  }
  
  return matches;
}

// Function to get all data related to a station
async function getStationDataFromDB(stationId) {
  const { Pool } = require('pg');
  
  // Create database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  const client = await pool.connect();
  
  try {
    console.log(`\nChecking database for stations matching "${stationId}"...`);
    
    // Check telemetry_data_stations table
    const dataStationsResult = await client.query(`
      SELECT *
      FROM telemetry_data_stations
      WHERE station_id LIKE $1 
      OR station_code LIKE $1
      OR station_id LIKE $2
      OR station_code LIKE $2
    `, [`%${stationId}%`, `%${stationId.trim()}%`]);
    
    console.log(`Found ${dataStationsResult.rows.length} matching records in telemetry_data_stations:`);
    
    dataStationsResult.rows.forEach((record, index) => {
      console.log(`\n--- DB Record ${index + 1} ---`);
      console.log(`id: ${record.id}`);
      console.log(`station_id: "${record.station_id}"`);
      console.log(`station_code: "${record.station_code}"`);
      console.log(`station_name: "${record.station_name}"`);
      console.log(`numeric_station_id: ${record.numeric_station_id}`);
      console.log(`data_source: ${record.data_source}`);
      console.log(`category: ${record.category}`);
      console.log(`has_data: ${record.has_data}`);
      console.log(`show_hourly_report: ${record.show_hourly_report}`);
      console.log(`show_daily_report: ${record.show_daily_report}`);
    });
    
    return dataStationsResult.rows;
  } catch (error) {
    console.error('Error querying database:', error);
    return [];
  } finally {
    client.release();
    pool.end();
  }
}

async function main() {
  console.log('Checking if Gt.1 is returned from getHourlyStationList or getDailyStationList...');
  
  // Station ID to check
  const stationId = 'Gt.1';
  const stationIdAlt = 'Gt.1 '; // Alternative with space
  
  // Get data from database first
  await getStationDataFromDB(stationId);
  
  // Get hourly station list
  const hourlyData = await fetchAPIData('getHourlyStationList');
  if (hourlyData) {
    console.log(`\nReceived ${hourlyData.length} stations from getHourlyStationList`);
    
    // Check for exact matches
    const foundHourly = checkStationInResponse(stationId, hourlyData, 'getHourlyStationList');
    const foundHourlyAlt = !foundHourly ? checkStationInResponse(stationIdAlt, hourlyData, 'getHourlyStationList') : false;
    
    // If not found, search for partial matches
    if (!foundHourly && !foundHourlyAlt) {
      searchStationById('gt', hourlyData, 'getHourlyStationList');
    }
    
    // Save hourly data to file
    const hourlyFile = 'hourly_stations.json';
    fs.writeFileSync(hourlyFile, JSON.stringify(hourlyData, null, 2));
    console.log(`Saved all hourly stations to ${hourlyFile}`);
  }
  
  // Get daily station list
  const dailyData = await fetchAPIData('getDailyStationList');
  if (dailyData) {
    console.log(`\nReceived ${dailyData.length} stations from getDailyStationList`);
    
    // Check for exact matches
    const foundDaily = checkStationInResponse(stationId, dailyData, 'getDailyStationList');
    const foundDailyAlt = !foundDaily ? checkStationInResponse(stationIdAlt, dailyData, 'getDailyStationList') : false;
    
    // If not found, search for partial matches
    if (!foundDaily && !foundDailyAlt) {
      searchStationById('gt', dailyData, 'getDailyStationList');
    }
    
    // Save daily data to file
    const dailyFile = 'daily_stations.json';
    fs.writeFileSync(dailyFile, JSON.stringify(dailyData, null, 2));
    console.log(`Saved all daily stations to ${dailyFile}`);
  }
  
  console.log('\nCheck completed. See results above for details.');
}

// Run the script
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 