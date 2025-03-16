// Script to query ThaiWater API endpoint for HII stations
import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// API configuration for station information
const THAIWATER_API_ENDPOINT = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/api_service';

// HII station data - using the correct MID and EID for HII
// HII agency ID is 9
const HII_STATION_API_MID = '105';
const HII_STATION_API_EID = 'CM54nw9Jts6piDUgwVJME5_0-uk0EJbI50ygxq3CQ95fuFWsNzCiGn6kpUHasd7XBUDYysU-ZVJpiIpDr9iqjg';

async function queryThaiWaterAPI() {
  console.log('Querying ThaiWater API for HII stations...');
  
  try {
    // Construct the URL for station information
    const url = `${THAIWATER_API_ENDPOINT}?mid=${HII_STATION_API_MID}&eid=${encodeURIComponent(HII_STATION_API_EID)}`;
    
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
    
    // Process the data - filter for HII stations
    const allStations = response.data;
    console.log(`Retrieved ${allStations.length} total stations from the API`);
    
    // Filter for HII stations (agency_id 9)
    const hiiStations = allStations.filter(station => 
      station.agency_id === 9 || 
      (station.agency_name && station.agency_name.th && station.agency_name.th.includes('สถาบันสารสนเทศทรัพยากรน้ำ'))
    );
    
    console.log(`Filtered ${hiiStations.length} HII stations`);
    
    console.log(`\nHII Station Statistics:`);
    console.log(`----------------------`);
    console.log(`Total HII stations: ${hiiStations.length}`);
    
    // Check for stations without names
    const hiiStationsWithoutNames = hiiStations.filter(station => {
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
    
    const missingNamePercentage = (hiiStationsWithoutNames.length / hiiStations.length) * 100;
    
    console.log(`HII stations without names: ${hiiStationsWithoutNames.length} (${missingNamePercentage.toFixed(2)}%)`);
    
    // Check for stations without location data
    const hiiStationsWithoutLocation = hiiStations.filter(station => 
      !station.province_code || !station.amphoe_code
    );
    
    const missingLocationPercentage = (hiiStationsWithoutLocation.length / hiiStations.length) * 100;
    
    console.log(`HII stations without location data: ${hiiStationsWithoutLocation.length} (${missingLocationPercentage.toFixed(2)}%)`);
    
    // Sample of stations without names
    if (hiiStationsWithoutNames.length > 0) {
      console.log(`\nSample of HII stations without names (showing up to 10):`);
      console.log(JSON.stringify(hiiStationsWithoutNames.slice(0, 10), null, 2));
    }
    
    // Save statistics to a file
    const statistics = {
      totalHIIStations: hiiStations.length,
      hiiStationsWithoutNames: hiiStationsWithoutNames.length,
      hiiStationsWithoutNamesPercentage: parseFloat(missingNamePercentage.toFixed(2)),
      hiiStationsWithoutLocation: hiiStationsWithoutLocation.length,
      hiiStationsWithoutLocationPercentage: parseFloat(missingLocationPercentage.toFixed(2)),
      sampleStationsWithoutNames: hiiStationsWithoutNames.slice(0, 20)
    };
    
    fs.writeFileSync('thaiwater_api_hii_statistics.json', JSON.stringify(statistics, null, 2));
    console.log('\nStatistics also saved to thaiwater_api_hii_statistics.json');
    
    // Save all HII stations to a file for further analysis
    fs.writeFileSync('thaiwater_api_hii_stations.json', JSON.stringify(hiiStations, null, 2));
    console.log('All HII stations saved to thaiwater_api_hii_stations.json');
    
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