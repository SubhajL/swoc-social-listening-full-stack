/**
 * Script to query for K.55A and Ny.4 records in the getHourlyStationList and getDailyStationList endpoints
 */

const axios = require('axios');

// API base URL
const API_BASE_URL = 'https://api-v2.thaiwater.net/api';

// Create axios instance with longer timeout
const api = axios.create({
  timeout: 30000, // 30 second timeout
  headers: { 'Accept': 'application/json' }
});

// Function to check if a station exists in the API response (by various ID formats)
function findStationInList(stationId, numericId, responseData) {
  if (!responseData || !Array.isArray(responseData)) {
    console.log('Response data is not an array');
    return null;
  }
  
  // First try exact station_id match
  let found = responseData.find(station => 
    station.station_id === stationId
  );
  
  if (found) {
    console.log(`✅ Found exact match by station_id "${stationId}"`);
    return found;
  }
  
  // Try numeric_station_id match
  found = responseData.find(station => 
    station.numeric_station_id === numericId ||
    station.station_id === numericId
  );
  
  if (found) {
    console.log(`✅ Found match by numeric_id "${numericId}"`);
    return found;
  }
  
  // Try partial matches
  found = responseData.filter(station => 
    (station.station_id && station.station_id.includes(stationId)) ||
    (station.station_code && station.station_code.includes(stationId))
  );
  
  if (found && found.length > 0) {
    console.log(`✅ Found ${found.length} partial matches for "${stationId}"`);
    return found;
  }
  
  console.log(`❌ No matches found for "${stationId}" or "${numericId}"`);
  return null;
}

async function main() {
  // Stations to check (original ID and numeric ID)
  const stationsToCheck = [
    { id: 'K.55A', numericId: '421' },
    { id: 'Ny.4', numericId: '421A' }
  ];
  
  try {
    // 1. Check getHourlyStationList
    console.log('Fetching getHourlyStationList...');
    try {
      const hourlyResponse = await api.get(`${API_BASE_URL}/getHourlyStationList`);
      const hourlyStations = hourlyResponse.data;
      
      console.log(`Retrieved ${hourlyStations.length} stations from getHourlyStationList`);
      
      for (const station of stationsToCheck) {
        console.log(`\n--- Checking for ${station.id} (numeric ID: ${station.numericId}) in hourly list ---`);
        const foundStations = findStationInList(station.id, station.numericId, hourlyStations);
        
        if (foundStations) {
          if (Array.isArray(foundStations)) {
            foundStations.forEach((found, index) => {
              console.log(`Match ${index + 1}:`);
              console.log(JSON.stringify(found, null, 2));
            });
          } else {
            console.log('Found match:');
            console.log(JSON.stringify(foundStations, null, 2));
          }
        }
      }
    } catch (hourlyError) {
      console.error(`Error fetching hourly station list: ${hourlyError.message}`);
    }
    
    // 2. Check getDailyStationList
    console.log('\nFetching getDailyStationList...');
    try {
      const dailyResponse = await api.get(`${API_BASE_URL}/getDailyStationList`);
      const dailyStations = dailyResponse.data;
      
      console.log(`Retrieved ${dailyStations.length} stations from getDailyStationList`);
      
      for (const station of stationsToCheck) {
        console.log(`\n--- Checking for ${station.id} (numeric ID: ${station.numericId}) in daily list ---`);
        const foundStations = findStationInList(station.id, station.numericId, dailyStations);
        
        if (foundStations) {
          if (Array.isArray(foundStations)) {
            foundStations.forEach((found, index) => {
              console.log(`Match ${index + 1}:`);
              console.log(JSON.stringify(found, null, 2));
            });
          } else {
            console.log('Found match:');
            console.log(JSON.stringify(foundStations, null, 2));
          }
        }
      }
    } catch (dailyError) {
      console.error(`Error fetching daily station list: ${dailyError.message}`);
    }
    
    // Special check: try to find any stations with "421" or "45" in their ID
    try {
      console.log('\nSearching for any stations with 421 or 45 in their ID...');
      const hourlyResponse = await api.get(`${API_BASE_URL}/getHourlyStationList`);
      const hourlyStations = hourlyResponse.data;
      
      const stations421 = hourlyStations.filter(station => 
        (station.station_id && station.station_id.includes('421')) ||
        (station.numeric_station_id && station.numeric_station_id.includes('421'))
      );
      
      const stations45 = hourlyStations.filter(station => 
        (station.station_id && station.station_id.includes('45')) ||
        (station.numeric_station_id && station.numeric_station_id.includes('45'))
      );
      
      console.log(`\nFound ${stations421.length} stations with "421" in their ID:`);
      if (stations421.length > 0) {
        stations421.forEach(station => {
          console.log(`- ${station.station_id || 'N/A'} (numeric: ${station.numeric_station_id || 'N/A'}) - ${station.station_name || 'N/A'}`);
        });
      }
      
      console.log(`\nFound ${stations45.length} stations with "45" in their ID:`);
      if (stations45.length > 0) {
        stations45.forEach(station => {
          console.log(`- ${station.station_id || 'N/A'} (numeric: ${station.numeric_station_id || 'N/A'}) - ${station.station_name || 'N/A'}`);
        });
      }
    } catch (error) {
      console.error(`Error searching for specific IDs: ${error.message}`);
    }
    
  } catch (error) {
    console.error('Error fetching data:', error.message);
  }
}

// Run the script
main().catch(error => {
  console.error('Error:', error);
}); 