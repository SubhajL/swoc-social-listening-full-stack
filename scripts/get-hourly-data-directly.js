/**
 * Simpler script to fetch hourly data directly for specific stations
 * Trying the numeric station IDs instead of station codes
 */

const axios = require('axios');

// API base URL - trying the production URL directly
const API_BASE_URL = 'https://api-v2.thaiwater.net/api';

// Create axios instance with longer timeout
const api = axios.create({
  timeout: 20000, // 20 second timeout
  headers: { 'Accept': 'application/json' }
});

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
      discharge_cms: item.discharge_cms
    };
  });
  
  console.table(formattedData);
}

async function main() {
  // Try different station ID formats (original, numeric, and numeric with suffix)
  const stationIds = [
    // Original station IDs
    'Ny.4', 'P.76', 'W.17A', 'K.55A',
    // Numeric station IDs that we found
    '45', '421', '45A', '421A'
  ];
  
  console.log(`Trying to fetch hourly data directly for stations: ${stationIds.join(', ')}`);
  
  for (const stationId of stationIds) {
    try {
      console.log(`\nAttempting to fetch data for station ${stationId}...`);
      const url = `${API_BASE_URL}/getHourlyToday/${stationId}`;
      const response = await api.get(url);
      
      if (response.data) {
        console.log(`✅ Successfully received data for station ${stationId}`);
        displayHourlyData(stationId, response.data);
      } else {
        console.log(`⚠️ Received empty response for station ${stationId}`);
      }
    } catch (error) {
      console.error(`❌ Error fetching data for station ${stationId}: ${error.message}`);
    }
  }
}

// Run the script
main().catch(error => {
  console.error('Error:', error);
}); 