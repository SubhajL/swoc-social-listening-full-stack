// Simple test script for ThaiWater/TMD API endpoints
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// For ES modules, we need to create __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the backend .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// API endpoint
const THAIWATER_API_ENDPOINT = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/api_service';

// API configurations to test
const API_CONFIGS = [
  {
    name: "TMD Station API",
    mid: '264',
    eid: 'skbNrh269YFK3TOaTT7074F_kQKPqfo0Ji_UkABKAnbLZiK_ceQ6ii0zx6HsLGOsYbMRu5Ll6d4wrpZ9jB7SHA'
  },
  {
    name: "TMD Rainfall API (Original - Known to fail with 422)",
    mid: '265',
    eid: 'bUYiAzxWG7FOCpDcrRVLCM6FOz93aCRDCU7k3y6RbLz3kLTPOlRZrJHTRr9LIeD-pFsFTSF6CWTxXxkVp1IKjQ'
  },
  {
    name: "TMD Rainfall API (New Working Endpoint)",
    mid: '244',
    eid: '45I5Oul2YvQ-W-pSmo4z05m_XNRQyS7vl-fTKR2KEUkkvFjoAvQ2KoIsoo7rJFzbkJ2MTom3WYYx54t1YAqurw'
  }
];

/**
 * Test an API endpoint using GET method
 */
async function testApiEndpoint(config) {
  console.log(`\n----- Testing ${config.name} -----`);
  console.log(`MID: ${config.mid}, EID: ${config.eid.substring(0, 10)}...`);
  
  try {
    // Construct the URL with query parameters
    const url = `${THAIWATER_API_ENDPOINT}?mid=${config.mid}&eid=${encodeURIComponent(config.eid)}`;
    console.log(`API URL: ${url}`);
    
    // Make the API request
    console.log('Sending GET request...');
    const startTime = Date.now();
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'SWOC-API-Test/1.0'
      },
      timeout: 30000
    });
    const duration = Date.now() - startTime;
    
    // Process the response
    console.log(`Response received in ${duration}ms`);
    console.log(`Status: ${response.status}`);
    
    if (response.status === 200) {
      const data = response.data;
      if (Array.isArray(data)) {
        console.log(`SUCCESS - Received array with ${data.length} items`);
        if (data.length > 0) {
          console.log('Sample data:');
          console.log(JSON.stringify(data[0], null, 2));
        }
      } else {
        console.log(`WARNING - Received non-array response: ${typeof data}`);
        console.log(JSON.stringify(data).substring(0, 200));
      }
    } else {
      console.log(`WARNING - Unexpected status code: ${response.status}`);
    }
    
    return {
      success: response.status === 200,
      status: response.status,
      dataLength: Array.isArray(response.data) ? response.data.length : null,
      duration
    };
  } catch (error) {
    console.log(`ERROR - Request failed: ${error.message}`);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Status Text: ${error.response.statusText}`);
      if (error.response.data) {
        console.log('Error data:');
        console.log(JSON.stringify(error.response.data).substring(0, 200));
      }
    }
    
    return {
      success: false,
      status: error.response?.status,
      error: error.message,
      duration: null
    };
  }
}

/**
 * Main function to run the tests
 */
async function main() {
  console.log('===== TMD API TEST SCRIPT =====');
  console.log(`Date/Time: ${new Date().toISOString()}`);
  
  const results = [];
  
  // Test each API configuration
  for (const config of API_CONFIGS) {
    const result = await testApiEndpoint(config);
    results.push({
      name: config.name,
      mid: config.mid,
      eid: config.eid.substring(0, 10) + '...',
      ...result
    });
  }
  
  // Print summary
  console.log('\n===== TEST RESULTS SUMMARY =====');
  for (const result of results) {
    console.log(`${result.name} (MID ${result.mid}): ${result.success ? 'SUCCESS' : 'FAILED'}`);
    if (result.success) {
      console.log(`  - Status: ${result.status}, Items: ${result.dataLength}, Duration: ${result.duration}ms`);
    } else {
      console.log(`  - Status: ${result.status}, Error: ${result.error}`);
    }
  }
  
  // Determine overall result
  const allSuccess = results.every(r => r.success);
  console.log(`\nOverall Test Result: ${allSuccess ? 'SUCCESS' : 'PARTIAL SUCCESS/FAILURE'}`);
  
  // Final recommendation
  console.log('\n===== RECOMMENDATION =====');
  const workingEndpoints = results.filter(r => r.success);
  if (workingEndpoints.length > 0) {
    console.log('Use the following working endpoints:');
    for (const endpoint of workingEndpoints) {
      console.log(`- ${endpoint.name} (MID: ${endpoint.mid})`);
    }
  } else {
    console.log('No working endpoints found. Please check API credentials or connectivity.');
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error during testing:', error);
  process.exit(1);
}); 