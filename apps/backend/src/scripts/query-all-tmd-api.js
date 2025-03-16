// Script to query all TMD stations from the ThaiWater API
// and filter for specific stations
import axios from 'axios';
import fs from 'fs';

/**
 * Query all TMD stations from ThaiWater API
 */
async function queryAllTMDAPI() {
  console.log('Querying all TMD stations from ThaiWater API...');
  
  // Station IDs we're interested in
  const targetStationIds = [2232, 2233, 2235, 2236];
  console.log(`Target station IDs: ${targetStationIds.join(', ')}`);
  
  // Station names we're interested in
  const targetStationNames = ['พลิ้ว', 'นราธิวาส', 'ปทุมธานี', 'เกาะสมุย'];
  console.log(`Target station names: ${targetStationNames.join(', ')}`);
  
  try {
    // Try different API endpoints
    const results = await Promise.allSettled([
      queryAllStations(),
      queryStationList(),
      queryStationInfo()
    ]);
    
    // Process results
    let allStations = [];
    let matchingStations = [];
    
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled' && result.value && result.value.length > 0) {
        console.log(`Successfully retrieved ${result.value.length} stations using method ${i + 1}`);
        allStations = result.value;
        
        // Filter for matching stations
        matchingStations = filterMatchingStations(allStations, targetStationIds, targetStationNames);
        
        if (matchingStations.length > 0) {
          console.log(`Found ${matchingStations.length} matching stations`);
          break;
        }
      }
    }
    
    if (matchingStations.length > 0) {
      // Display the matching stations
      console.log('\nMatching Stations:');
      console.log(JSON.stringify(matchingStations, null, 2));
      
      // Save results to file
      const resultsFile = 'tmd_api_matching_stations.json';
      fs.writeFileSync(resultsFile, JSON.stringify(matchingStations, null, 2));
      console.log(`Matching stations saved to ${resultsFile}`);
    } else if (allStations.length > 0) {
      // Save all stations to file for reference
      const allStationsFile = 'tmd_api_all_stations.json';
      fs.writeFileSync(allStationsFile, JSON.stringify(allStations, null, 2));
      console.log(`All ${allStations.length} stations saved to ${allStationsFile}`);
      
      // Display a sample of stations
      console.log('\nSample of stations:');
      console.log(JSON.stringify(allStations.slice(0, 5), null, 2));
    } else {
      console.log('No stations found from any API method');
    }
    
  } catch (error) {
    console.error(`Error querying API: ${error.message}`);
    if (error.stack) {
      console.error(`Error stack: ${error.stack}`);
    }
  }
}

/**
 * Query all stations from the API
 * 
 * @returns {Promise<Object[]>} - Array of station objects
 */
async function queryAllStations() {
  console.log('Querying all stations...');
  
  try {
    // ThaiWater API endpoint
    const apiUrl = 'https://api2.thaiwater.net/api/v1/thaiwater30/api_service';
    
    // API parameters
    const params = {
      service: 'tmd_weather_station'
    };
    
    console.log(`Request URL: ${apiUrl}`);
    console.log(`Request params: ${JSON.stringify(params)}`);
    
    const response = await axios.get(apiUrl, { params });
    
    if (response.data && response.data.data) {
      console.log(`Found ${response.data.data.length} stations`);
      
      // Format the API results
      return response.data.data.map(station => ({
        id: station.id || station.station_id,
        name: station.station_name || station.tele_station_name,
        province: station.province_name || station.province,
        amphure: station.amphoe_name || station.amphoe || station.amphure,
        data_source: 'TMD',
        source: 'api_all_stations',
        coordinates: {
          latitude: station.latitude || station.tele_station_lat,
          longitude: station.longitude || station.tele_station_long
        },
        raw_data: station
      }));
    } else {
      console.log('No data returned from API');
      return [];
    }
  } catch (error) {
    console.error(`Error querying all stations: ${error.message}`);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    return [];
  }
}

/**
 * Query station list from the API
 * 
 * @returns {Promise<Object[]>} - Array of station objects
 */
async function queryStationList() {
  console.log('Querying station list...');
  
  try {
    // ThaiWater API endpoint
    const apiUrl = 'https://api2.thaiwater.net/api/v1/thaiwater30/frontend/public/tmd_weather_station';
    
    console.log(`Request URL: ${apiUrl}`);
    
    const response = await axios.get(apiUrl);
    
    if (response.data && response.data.data) {
      console.log(`Found ${response.data.data.length} stations in station list`);
      
      // Format the API results
      return response.data.data.map(station => ({
        id: station.id || station.station_id,
        name: station.station_name || station.tele_station_name,
        province: station.province_name || station.province,
        amphure: station.amphoe_name || station.amphoe || station.amphure,
        data_source: 'TMD',
        source: 'api_station_list',
        coordinates: {
          latitude: station.latitude || station.tele_station_lat,
          longitude: station.longitude || station.tele_station_long
        },
        raw_data: station
      }));
    } else {
      console.log('No data returned from station list API');
      return [];
    }
  } catch (error) {
    console.error(`Error querying station list: ${error.message}`);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    return [];
  }
}

/**
 * Query station info from the API
 * 
 * @returns {Promise<Object[]>} - Array of station objects
 */
async function queryStationInfo() {
  console.log('Querying station info...');
  
  try {
    // ThaiWater API endpoint
    const apiUrl = 'https://api2.thaiwater.net/api/v1/thaiwater30/frontend/public/tmd_weather_station_graph';
    
    console.log(`Request URL: ${apiUrl}`);
    
    const response = await axios.get(apiUrl);
    
    if (response.data && response.data.data) {
      console.log(`Found ${response.data.data.length} stations in station info`);
      
      // Format the API results
      return response.data.data.map(station => ({
        id: station.id || station.station_id,
        name: station.station_name || station.tele_station_name,
        province: station.province_name || station.province,
        amphure: station.amphoe_name || station.amphoe || station.amphure,
        data_source: 'TMD',
        source: 'api_station_info',
        coordinates: {
          latitude: station.latitude || station.tele_station_lat,
          longitude: station.longitude || station.tele_station_long
        },
        raw_data: station
      }));
    } else {
      console.log('No data returned from station info API');
      return [];
    }
  } catch (error) {
    console.error(`Error querying station info: ${error.message}`);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    return [];
  }
}

/**
 * Filter stations for matching IDs or names
 * 
 * @param {Object[]} stations - Array of station objects
 * @param {number[]} targetIds - Array of target station IDs
 * @param {string[]} targetNames - Array of target station names
 * @returns {Object[]} - Array of matching station objects
 */
function filterMatchingStations(stations, targetIds, targetNames) {
  console.log('Filtering stations for matches...');
  
  return stations.filter(station => {
    // Check for matching ID
    if (station.id && targetIds.includes(parseInt(station.id))) {
      return true;
    }
    
    // Check for matching name
    if (station.name) {
      for (const targetName of targetNames) {
        if (station.name.includes(targetName)) {
          return true;
        }
      }
    }
    
    return false;
  });
}

// Run the query function
queryAllTMDAPI().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 