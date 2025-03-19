// Script to query TMD stations from the ThaiWater API
// Displaying station_id, station_name, amphure, province
import axios from 'axios';
import fs from 'fs';

/**
 * Query TMD stations from ThaiWater API
 */
async function queryTMDAPI() {
  console.log('Querying TMD stations from ThaiWater API...');
  
  // Station IDs to query
  const stationIds = [2232, 2233, 2235, 2236];
  console.log(`Querying stations with IDs: ${stationIds.join(', ')}`);
  
  try {
    // Try different API endpoints and formats
    const results = await Promise.allSettled([
      queryThaiWaterAPIv1(stationIds),
      queryThaiWaterAPIv2(stationIds),
      queryThaiWaterAPIv3(stationIds),
      queryThaiWaterAPIv4(stationIds)
    ]);
    
    // Process results
    let successfulResults = null;
    
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled' && result.value && result.value.length > 0) {
        console.log(`Successfully retrieved data using method ${i + 1}`);
        successfulResults = result.value;
        break;
      }
    }
    
    if (successfulResults) {
      // Display the results
      console.log('\nResults:');
      console.log(JSON.stringify(successfulResults, null, 2));
      
      // Save results to file
      const resultsFile = 'tmd_api_results.json';
      fs.writeFileSync(resultsFile, JSON.stringify(successfulResults, null, 2));
      console.log(`Results saved to ${resultsFile}`);
    } else {
      console.log('No successful results from any API method');
    }
    
  } catch (error) {
    console.error(`Error querying API: ${error.message}`);
    if (error.stack) {
      console.error(`Error stack: ${error.stack}`);
    }
  }
}

/**
 * Query ThaiWater API v1 (original format)
 * 
 * @param {number[]} stationIds - Array of station IDs to query
 * @returns {Promise<Object[]>} - Array of station objects
 */
async function queryThaiWaterAPIv1(stationIds) {
  console.log('Trying ThaiWater API v1...');
  
  try {
    // ThaiWater API endpoint
    const apiUrl = 'https://api2.thaiwater.net/api/v1/thaiwater30/api_service';
    
    // API parameters
    const params = {
      service: 'tmd',
      params: JSON.stringify({
        station_id: stationIds
      })
    };
    
    console.log(`Request URL: ${apiUrl}`);
    console.log(`Request params: ${JSON.stringify(params)}`);
    
    const response = await axios.get(apiUrl, { params });
    
    if (response.data && response.data.data) {
      console.log(`Found ${response.data.data.length} stations in ThaiWater API v1`);
      
      // Format the API results
      return response.data.data.map(station => ({
        id: station.id || station.station_id,
        name: station.station_name || station.tele_station_name,
        province: station.province_name || station.province,
        amphure: station.amphoe_name || station.amphoe || station.amphure,
        data_source: 'TMD',
        source: 'api_v1',
        coordinates: {
          latitude: station.latitude || station.tele_station_lat,
          longitude: station.longitude || station.tele_station_long
        },
        raw_data: station
      }));
    } else {
      console.log('No data returned from ThaiWater API v1');
      return [];
    }
  } catch (error) {
    console.error(`Error querying ThaiWater API v1: ${error.message}`);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    return [];
  }
}

/**
 * Query ThaiWater API v2 (alternative format)
 * 
 * @param {number[]} stationIds - Array of station IDs to query
 * @returns {Promise<Object[]>} - Array of station objects
 */
async function queryThaiWaterAPIv2(stationIds) {
  console.log('Trying ThaiWater API v2...');
  
  try {
    // ThaiWater API endpoint
    const apiUrl = 'https://api2.thaiwater.net/api/v1/thaiwater30/api_service';
    
    // API parameters - alternative format
    const params = {
      service: 'tmd_weather_station',
      params: JSON.stringify({
        id: stationIds
      })
    };
    
    console.log(`Request URL: ${apiUrl}`);
    console.log(`Request params: ${JSON.stringify(params)}`);
    
    const response = await axios.get(apiUrl, { params });
    
    if (response.data && response.data.data) {
      console.log(`Found ${response.data.data.length} stations in ThaiWater API v2`);
      
      // Format the API results
      return response.data.data.map(station => ({
        id: station.id || station.station_id,
        name: station.station_name || station.tele_station_name,
        province: station.province_name || station.province,
        amphure: station.amphoe_name || station.amphoe || station.amphure,
        data_source: 'TMD',
        source: 'api_v2',
        coordinates: {
          latitude: station.latitude || station.tele_station_lat,
          longitude: station.longitude || station.tele_station_long
        },
        raw_data: station
      }));
    } else {
      console.log('No data returned from ThaiWater API v2');
      return [];
    }
  } catch (error) {
    console.error(`Error querying ThaiWater API v2: ${error.message}`);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    return [];
  }
}

/**
 * Query ThaiWater API v3 (station info endpoint)
 * 
 * @param {number[]} stationIds - Array of station IDs to query
 * @returns {Promise<Object[]>} - Array of station objects
 */
async function queryThaiWaterAPIv3(stationIds) {
  console.log('Trying ThaiWater API v3...');
  
  try {
    // ThaiWater API endpoint for station info
    const apiUrl = 'https://api2.thaiwater.net/api/v1/thaiwater30/frontend/public/tmd_weather_station_info';
    
    console.log(`Request URL: ${apiUrl}`);
    
    const response = await axios.get(apiUrl);
    
    if (response.data && response.data.data) {
      // Filter stations by ID
      const filteredStations = response.data.data.filter(station => 
        stationIds.includes(parseInt(station.id)) || 
        stationIds.includes(parseInt(station.station_id || 0))
      );
      
      console.log(`Found ${filteredStations.length} matching stations in ThaiWater API v3`);
      
      // Format the API results
      return filteredStations.map(station => ({
        id: station.id || station.station_id,
        name: station.station_name || station.tele_station_name,
        province: station.province_name || station.province,
        amphure: station.amphoe_name || station.amphoe || station.amphure,
        data_source: 'TMD',
        source: 'api_v3',
        coordinates: {
          latitude: station.latitude || station.tele_station_lat,
          longitude: station.longitude || station.tele_station_long
        },
        raw_data: station
      }));
    } else {
      console.log('No data returned from ThaiWater API v3');
      return [];
    }
  } catch (error) {
    console.error(`Error querying ThaiWater API v3: ${error.message}`);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    return [];
  }
}

/**
 * Query ThaiWater API v4 (individual station queries)
 * 
 * @param {number[]} stationIds - Array of station IDs to query
 * @returns {Promise<Object[]>} - Array of station objects
 */
async function queryThaiWaterAPIv4(stationIds) {
  console.log('Trying ThaiWater API v4 (individual queries)...');
  
  const results = [];
  
  for (const stationId of stationIds) {
    try {
      // ThaiWater API endpoint for individual station
      const apiUrl = `https://api2.thaiwater.net/api/v1/thaiwater30/api_service?service=tmd_weather_station&params={"id":${stationId}}`;
      
      console.log(`Querying station ${stationId} at URL: ${apiUrl}`);
      
      const response = await axios.get(apiUrl);
      
      if (response.data && response.data.data && response.data.data.length > 0) {
        const station = response.data.data[0];
        console.log(`Found data for station ${stationId}`);
        
        results.push({
          id: station.id || station.station_id,
          name: station.station_name || station.tele_station_name,
          province: station.province_name || station.province,
          amphure: station.amphoe_name || station.amphoe || station.amphure,
          data_source: 'TMD',
          source: 'api_v4',
          coordinates: {
            latitude: station.latitude || station.tele_station_lat,
            longitude: station.longitude || station.tele_station_long
          },
          raw_data: station
        });
      } else {
        console.log(`No data returned for station ${stationId}`);
      }
    } catch (error) {
      console.error(`Error querying station ${stationId}: ${error.message}`);
      if (error.response) {
        console.error(`Response status: ${error.response.status}`);
        console.error(`Response data: ${JSON.stringify(error.response.data)}`);
      }
    }
    
    // Add delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`Found ${results.length} stations using individual queries`);
  return results;
}

// Run the query function
queryTMDAPI().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 