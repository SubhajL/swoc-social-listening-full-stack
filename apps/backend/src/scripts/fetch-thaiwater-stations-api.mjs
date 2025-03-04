import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// API configuration for station information
const THAIWATER_API_ENDPOINT = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/api_service';
const THAIWATER_API_MID = '105'; // MID for station information
const THAIWATER_API_EID = 'CM54nw9Jts6piDUgwVJME5_0-uk0EJbI50ygxq3CQ95fuFWsNzCiGn6kpUHasd7XBUDYysU-ZVJpiIpDr9iqjg';

/**
 * Fetches telemetry station information from ThaiWater API with MID=105
 */
async function fetchThaiWaterStationInfo() {
  try {
    const url = `${THAIWATER_API_ENDPOINT}?mid=${THAIWATER_API_MID}&eid=${encodeURIComponent(THAIWATER_API_EID)}`;
    
    console.log('[ThaiWaterService] Making API request for station information', {
      url,
      timestamp: new Date().toISOString()
    });

    const response = await axios.get(url);
    
    if (!response.data) {
      throw new Error('Invalid response format: no data received');
    }

    console.log('[ThaiWaterService] API response received', {
      responseType: typeof response.data,
      isArray: Array.isArray(response.data),
      dataLength: Array.isArray(response.data) ? response.data.length : 'N/A',
      timestamp: new Date().toISOString()
    });

    // Log the first few records for analysis
    if (Array.isArray(response.data) && response.data.length > 0) {
      console.log('[ThaiWaterService] Sample data (first 5 records):');
      console.log(JSON.stringify(response.data.slice(0, 5), null, 2));
      
      console.log(`[ThaiWaterService] Total records: ${response.data.length}`);
      
      // Save sample data to a file for further analysis
      const sampleData = response.data.slice(0, 20); // Save 20 records for analysis
      const outputPath = path.join(process.cwd(), 'src/scripts/thaiwater-station-sample.json');
      fs.writeFileSync(outputPath, JSON.stringify(sampleData, null, 2));
      console.log(`[ThaiWaterService] Saved 20 sample records to ${outputPath}`);
    } else {
      console.log('[ThaiWaterService] Response data:', response.data);
    }

    return {
      success: true,
      data: response.data
    };

  } catch (error) {
    const errorResponse = error?.response;
    
    console.error('[ThaiWaterService] API request failed', {
      error: error instanceof Error ? error.message : String(error),
      status: errorResponse?.status,
      statusText: errorResponse?.statusText,
      data: errorResponse?.data,
      timestamp: new Date().toISOString()
    });

    return {
      success: false,
      data: null,
      error: `Failed to fetch station information: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Execute the function
fetchThaiWaterStationInfo().then(result => {
  if (result.success) {
    console.log('[ThaiWaterService] Successfully fetched station information');
  } else {
    console.error('[ThaiWaterService] Failed to fetch station information:', result.error);
  }
}).catch(error => {
  console.error('[ThaiWaterService] Unhandled error', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  });
  process.exit(1);
}); 