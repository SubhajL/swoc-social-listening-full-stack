// Script to query ThaiWater API endpoint directly
import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// API configuration for station information
const THAIWATER_API_ENDPOINT = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/api_service';
const THAIWATER_STATION_API_MID = '105';
const THAIWATER_STATION_API_EID = 'CM54nw9Jts6piDUgwVJME5_0-uk0EJbI50ygxq3CQ95fuFWsNzCiGn6kpUHasd7XBUDYysU-ZVJpiIpDr9iqjg';

// TMD station data
const TMD_STATION_API_MID = '264';
const TMD_STATION_API_EID = 'skbNrh269YFK3TOaTT7074F_kQKPqfo0Ji_UkABKAnbLZiK_ceQ6ii0zx6HsLGOsYbMRu5Ll6d4wrpZ9jB7SHA';

async function queryThaiWaterAPI() {
  console.log('Querying ThaiWater API endpoint directly...');
  
  try {
    // Construct the URL for station information
    const url = `${THAIWATER_API_ENDPOINT}?mid=${TMD_STATION_API_MID}&eid=${encodeURIComponent(TMD_STATION_API_EID)}`;
    
    console.log(`Using API endpoint: ${url}`);
    
    // Make the API request
    const response = await axios.get(url, {
      headers: {
        'Accept': 'application/json'
      },
      timeout: 30000 // 30 seconds timeout
    });
    
    // Check if the request was successful
    if (response.status !== 200) {
      throw new Error(`API request failed with status code ${response.status}`);
    }
    
    // Process the data
    const stations = response.data;
    console.log(`Retrieved ${stations.length} stations from the API`);
    
    // Filter TMD stations (should already be TMD stations from the API)
    const tmdStations = stations;
    
    console.log(`\nTMD Station Statistics:`);
    console.log(`----------------------`);
    console.log(`Total TMD stations: ${tmdStations.length}`);
    
    // Check for stations without names
    const tmdStationsWithoutNames = tmdStations.filter(station => {
      // Check if tele_station_name is missing or empty
      if (!station.tele_station_name) return true;
      
      // If it's an object with th property, check if that's empty
      if (typeof station.tele_station_name === 'object') {
        return !station.tele_station_name.th || station.tele_station_name.th.trim() === '';
      }
      
      // If it's a string, check if it's empty
      if (typeof station.tele_station_name === 'string') {
        return station.tele_station_name.trim() === '';
      }
      
      return true;
    });
    
    const missingNamePercentage = (tmdStationsWithoutNames.length / tmdStations.length) * 100;
    
    console.log(`TMD stations without names: ${tmdStationsWithoutNames.length} (${missingNamePercentage.toFixed(2)}%)`);
    
    // Check for stations without station type
    const tmdStationsWithoutType = tmdStations.filter(station => 
      !station.tele_station_type || 
      (typeof station.tele_station_type === 'string' && station.tele_station_type.trim() === '')
    );
    
    const missingTypePercentage = (tmdStationsWithoutType.length / tmdStations.length) * 100;
    
    console.log(`TMD stations without station type: ${tmdStationsWithoutType.length} (${missingTypePercentage.toFixed(2)}%)`);
    
    // Sample of stations without names
    console.log(`\nSample of TMD stations without names (showing up to 10):`);
    console.log(JSON.stringify(tmdStationsWithoutNames.slice(0, 10), null, 2));
    
    // Save statistics to a file
    const statistics = {
      totalTMDStations: tmdStations.length,
      tmdStationsWithoutNames: tmdStationsWithoutNames.length,
      tmdStationsWithoutNamesPercentage: parseFloat(missingNamePercentage.toFixed(2)),
      tmdStationsWithoutType: tmdStationsWithoutType.length,
      tmdStationsWithoutTypePercentage: parseFloat(missingTypePercentage.toFixed(2)),
      sampleStationsWithoutNames: tmdStationsWithoutNames.slice(0, 20)
    };
    
    fs.writeFileSync('thaiwater_api_tmd_statistics.json', JSON.stringify(statistics, null, 2));
    console.log('\nStatistics also saved to thaiwater_api_tmd_statistics.json');
    
    // Save all TMD stations to a file for further analysis
    fs.writeFileSync('thaiwater_api_tmd_stations.json', JSON.stringify(tmdStations, null, 2));
    console.log('All TMD stations saved to thaiwater_api_tmd_stations.json');
    
  } catch (error) {
    console.error('Error querying ThaiWater API:', error.message);
    if (error.response) {
      console.error('API response error:', {
        status: error.response.status,
        data: error.response.data
      });
    }
  }
}

// Run the query function
queryThaiWaterAPI().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 