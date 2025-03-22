/**
 * Script to fetch real data from getHourlyToday API endpoint for specific stations
 */

const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from backend .env file
dotenv.config({ path: path.resolve(__dirname, '../apps/backend/.env') });

// API base URL from environment variable or default to production URL
const API_BASE_URL = process.env.TELEMETRY_API_URL || 'https://api-v2.thaiwater.net/api';

// Create axios instance with timeout
const api = axios.create({
  timeout: 15000, // 15 second timeout
  headers: { 'Accept': 'application/json' }
});

// Async sleep function for retry delays
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

// Function to display hourly data for a station
function displayHourlyData(stationId, data) {
  console.log(`\n--- Hourly data for station ${stationId} ---`);
  
  if (!data || data.length === 0) {
    console.log(`No data available for station ${stationId}`);
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
      discharge_cms: item.discharge_cms,
      ...item.extra_data
    };
  });
  
  console.table(formattedData);
  
  // Calculate some statistics if there's numerical data
  const numData = formattedData.filter(item => 
    item.rainfall_mm !== null || item.water_level_m !== null || item.discharge_cms !== null
  );
  
  if (numData.length > 0) {
    console.log('\nSummary statistics:');
    
    // Rainfall stats
    const rainfallData = numData.filter(item => item.rainfall_mm !== null)
                              .map(item => parseFloat(item.rainfall_mm));
    if (rainfallData.length > 0) {
      const totalRainfall = rainfallData.reduce((sum, val) => sum + val, 0);
      const maxRainfall = Math.max(...rainfallData);
      console.log(`Rainfall: Total=${totalRainfall.toFixed(2)}mm, Max=${maxRainfall.toFixed(2)}mm`);
    }
    
    // Water level stats
    const waterLevelData = numData.filter(item => item.water_level_m !== null)
                                .map(item => parseFloat(item.water_level_m));
    if (waterLevelData.length > 0) {
      const avgWaterLevel = waterLevelData.reduce((sum, val) => sum + val, 0) / waterLevelData.length;
      const minWaterLevel = Math.min(...waterLevelData);
      const maxWaterLevel = Math.max(...waterLevelData);
      console.log(`Water Level: Min=${minWaterLevel.toFixed(2)}m, Avg=${avgWaterLevel.toFixed(2)}m, Max=${maxWaterLevel.toFixed(2)}m`);
    }
    
    // Discharge stats
    const dischargeData = numData.filter(item => item.discharge_cms !== null)
                               .map(item => parseFloat(item.discharge_cms));
    if (dischargeData.length > 0) {
      const avgDischarge = dischargeData.reduce((sum, val) => sum + val, 0) / dischargeData.length;
      const minDischarge = Math.min(...dischargeData);
      const maxDischarge = Math.max(...dischargeData);
      console.log(`Discharge: Min=${minDischarge.toFixed(2)}cms, Avg=${avgDischarge.toFixed(2)}cms, Max=${maxDischarge.toFixed(2)}cms`);
    }
  }
}

async function main() {
  // Stations to check
  const stationIds = ['Ny.4', 'P.76', 'W.17A', 'K.55A', '45', '421'];
  
  console.log(`Fetching hourly data for stations: ${stationIds.join(', ')}`);
  
  try {
    // First try to get hourly stations list to verify if our stations are in the list
    const stationList = await fetchAPIWithRetry('getHourlyStationList');
    console.log(`Retrieved ${stationList.length} stations from getHourlyStationList`);
    
    // Check if our target stations are in the list
    for (const targetId of stationIds) {
      const foundStation = stationList.find(station => 
        station.station_id === targetId || station.station_code === targetId
      );
      
      if (foundStation) {
        console.log(`✅ Found station ${targetId} in hourly station list: ${foundStation.station_name}`);
      } else {
        console.log(`❌ Station ${targetId} NOT found in hourly station list`);
      }
    }
    
    // Get actual hourly data for each station
    console.log('\nFetching actual hourly data for each station...');
    
    for (const stationId of stationIds) {
      try {
        // Format: getHourlyToday/{stationId}
        const hourlyData = await fetchAPIWithRetry(`getHourlyToday/${stationId}`);
        displayHourlyData(stationId, hourlyData);
      } catch (error) {
        console.error(`Error fetching data for station ${stationId}: ${error.message}`);
      }
    }
    
    console.log('\nData retrieval completed.');
    
  } catch (error) {
    console.error('Error fetching data:', error.message);
  }
}

// Run the script
main(); 