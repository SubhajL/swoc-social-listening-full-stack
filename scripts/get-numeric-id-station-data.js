/**
 * Script to query both getHourlyToday and getDailyData endpoints for stations K.55A and Ny.4
 * using their numeric station IDs (421 and 421A respectively)
 */

const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from backend .env file
dotenv.config({ path: path.resolve(__dirname, '../apps/backend/.env') });

// API base URL
const API_BASE_URL = 'https://api-v2.thaiwater.net/api';

// Create axios instance with longer timeout
const api = axios.create({
  timeout: 30000, // 30 second timeout
  headers: { 'Accept': 'application/json' }
});

// Define the stations we want to query
const TARGET_STATIONS = {
  'K.55A': '421',  // Original numeric ID for K.55A
  'Ny.4': '421A'   // Numeric ID for Ny.4 after our fix
};

// Function to display hourly data for a station
function displayHourlyData(stationId, numericId, data) {
  console.log(`\n--- Hourly data for station ${stationId} (numeric_id: ${numericId}) ---`);
  
  if (!data || data.length === 0) {
    console.log(`No data available for station ${stationId} (numeric_id: ${numericId})`);
    return;
  }
  
  // Format data for readable output
  const formattedData = data.map(item => {
    const dateTime = new Date(item.datetime);
    return {
      time: dateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      date: dateTime.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }),
      rainfall_mm: item.rainfall_mm,
      water_level_m: item.water_level_m,
      discharge_cms: item.discharge_cms
    };
  });
  
  console.table(formattedData);
}

// Function to display daily data for a station
function displayDailyData(stationId, numericId, data) {
  console.log(`\n--- Daily data for station ${stationId} (numeric_id: ${numericId}) ---`);
  
  if (!data || data.length === 0) {
    console.log(`No data available for station ${stationId} (numeric_id: ${numericId})`);
    return;
  }
  
  // Format data for readable output
  const formattedData = data.map(item => {
    const dateTime = new Date(item.datetime);
    return {
      date: dateTime.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }),
      rainfall_mm: item.rainfall_mm,
      max_water_level_m: item.max_water_level_m,
      min_water_level_m: item.min_water_level_m,
      mean_water_level_m: item.mean_water_level_m,
      max_discharge_cms: item.max_discharge_cms,
      min_discharge_cms: item.min_discharge_cms,
      mean_discharge_cms: item.mean_discharge_cms
    };
  });
  
  console.table(formattedData);
}

// Function to fetch hourly data for a station
async function fetchHourlyData(stationId, numericId) {
  try {
    console.log(`\nAttempting to fetch hourly data for ${stationId} using numeric_id ${numericId}...`);
    
    // Try the direct endpoint first
    const url = `${API_BASE_URL}/getHourlyToday/${numericId}`;
    const response = await api.get(url);
    
    if (response.data && response.data.length > 0) {
      console.log(`✅ Successfully received hourly data for ${stationId} using numeric_id ${numericId}`);
      displayHourlyData(stationId, numericId, response.data);
      return true;
    } else {
      console.log(`⚠️ Received empty response for hourly data for ${stationId}`);
    }
  } catch (error) {
    console.error(`❌ Error fetching hourly data for ${stationId}: ${error.message}`);
    
    // Try alternative endpoint format
    try {
      console.log(`   Trying alternative endpoint format for ${stationId}...`);
      const altUrl = `${API_BASE_URL}/getHourlyToday?station_id=${numericId}`;
      const altResponse = await api.get(altUrl);
      
      if (altResponse.data && altResponse.data.length > 0) {
        console.log(`✅ Successfully received hourly data with alternative format for ${stationId}`);
        displayHourlyData(stationId, numericId, altResponse.data);
        return true;
      } else {
        console.log(`⚠️ Received empty response with alternative format for ${stationId}`);
      }
    } catch (altError) {
      console.error(`❌ Alternative endpoint also failed for ${stationId}: ${altError.message}`);
    }
  }
  
  return false;
}

// Function to fetch daily data for a station
async function fetchDailyData(stationId, numericId) {
  try {
    console.log(`\nAttempting to fetch daily data for ${stationId} using numeric_id ${numericId}...`);
    
    // Get date for 7 days ago
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    // Format dates as YYYY-MM-DD
    const startDate = sevenDaysAgo.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];
    
    // Try the query parameter approach for daily data
    const url = `${API_BASE_URL}/getDailyData?station_id=${numericId}&start_date=${startDate}&end_date=${endDate}`;
    console.log(`   Using URL: ${url}`);
    
    const response = await api.get(url);
    
    if (response.data && response.data.length > 0) {
      console.log(`✅ Successfully received daily data for ${stationId} using numeric_id ${numericId}`);
      displayDailyData(stationId, numericId, response.data);
      return true;
    } else {
      console.log(`⚠️ Received empty response for daily data for ${stationId}`);
    }
  } catch (error) {
    console.error(`❌ Error fetching daily data for ${stationId}: ${error.message}`);
  }
  
  return false;
}

async function main() {
  console.log('Querying both hourly and daily data for specific stations...');
  
  // Process each target station
  for (const [stationId, numericId] of Object.entries(TARGET_STATIONS)) {
    console.log(`\n=============================================`);
    console.log(`Processing station ${stationId} with numeric ID ${numericId}`);
    console.log(`=============================================`);
    
    // Fetch hourly data
    const hourlySuccess = await fetchHourlyData(stationId, numericId);
    
    // Fetch daily data
    const dailySuccess = await fetchDailyData(stationId, numericId);
    
    if (!hourlySuccess && !dailySuccess) {
      console.log(`❌ Failed to retrieve any data for station ${stationId} with numeric ID ${numericId}`);
    }
  }
}

// Run the script
main().catch(error => {
  console.error('Error in main execution:', error);
  process.exit(1);
}); 