// Script to test the ThaiWater API directly
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// For ES modules, we need to create __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// API configuration
const THAIWATER_API_ENDPOINT = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/api_service';
const THAIWATER_API_MID = '98';
const THAIWATER_API_EID = 'ttDrdkWUP-SAuxsmJtKQunhOBSYVWTn7OpALf_HOL7hH85UpsMPPRKRM8W_AiNpGuAE6_gxMQqGReEXz2Cr1-w';

async function testThaiWaterAPI() {
  console.log('Testing ThaiWater API...');
  
  try {
    const url = `${THAIWATER_API_ENDPOINT}?mid=${THAIWATER_API_MID}&eid=${encodeURIComponent(THAIWATER_API_EID)}`;
    
    console.log(`Calling API URL: ${url}`);
    
    const response = await axios.get(url, {
      timeout: 30000,  // 30 second timeout
      headers: {
        'User-Agent': 'SWOC-Rainfall-Sync/1.0'
      }
    });
    
    if (!Array.isArray(response.data)) {
      console.error('Invalid response format: expected array');
      return;
    }
    
    console.log(`API returned ${response.data.length} records`);
    
    // Find station 420 in the response
    const station420Data = response.data.filter(record => record.tele_station_id == 420);
    
    if (station420Data.length === 0) {
      console.log('Station 420 was not found in the API response!');
    } else {
      console.log(`Found ${station420Data.length} records for station 420:`);
      console.table(station420Data);
      
      // Analyze the timestamps
      const timestamps = station420Data.map(record => ({
        original: record.rainfall_datetime,
        parsed: new Date(record.rainfall_datetime).toISOString(),
        localTime: new Date(record.rainfall_datetime).toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })
      }));
      
      console.log('\nTimestamp analysis:');
      console.table(timestamps);
    }
    
    // Get a sample of 5 records from the response
    console.log('\nSample of records from API:');
    console.table(response.data.slice(0, 5));
    
    // Check timestamps in the response
    const allTimestamps = response.data.map(record => record.rainfall_datetime);
    const uniqueTimestamps = [...new Set(allTimestamps)];
    
    console.log(`\nUnique timestamps in API response: ${uniqueTimestamps.length}`);
    console.table(uniqueTimestamps.slice(0, 10).map(ts => ({
      original: ts,
      localTime: new Date(ts).toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })
    })));
    
    // Count records by time
    const countByTime = {};
    response.data.forEach(record => {
      const timestamp = record.rainfall_datetime;
      countByTime[timestamp] = (countByTime[timestamp] || 0) + 1;
    });
    
    console.log('\nCount of records by timestamp:');
    console.table(Object.entries(countByTime).map(([timestamp, count]) => ({
      timestamp,
      localTime: new Date(timestamp).toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }),
      count
    })));
    
  } catch (error) {
    console.error(`Error testing ThaiWater API: ${error.message}`);
    if (error.response) {
      console.error('Response error data:', error.response.data);
      console.error('Response error status:', error.response.status);
    }
    if (error.stack) {
      console.error(`Error stack: ${error.stack}`);
    }
  }
}

// Run the function
testThaiWaterAPI().catch(error => {
  console.error('Unhandled error:', error);
}); 