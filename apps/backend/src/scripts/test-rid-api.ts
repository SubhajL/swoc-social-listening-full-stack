import axios from 'axios';
import { getOAuthHeader } from '../services/rid-telemetry/oauth';
import { logger } from '../utils/logger';

// API configuration
const RID_API_BASE_URL = 'http://hyd-app.rid.go.th/webservice';
const RID_API_SERVICE = `${RID_API_BASE_URL}/HydroAuthenticateService.svc`;
const TELEMETRY_ENDPOINT = `${RID_API_SERVICE}/getHourlyTodayFromStationID`;

async function testRidApi() {
  try {
    console.log('Starting RID API test...');
    console.log(`Consumer Key: ${process.env.RID_CONSUMER_KEY || '38b992bd1c9d445ba5305bc90edd2b4a'}`);
    console.log(`Consumer Secret: ${process.env.RID_CONSUMER_SECRET ? '[Set]' : '[Using Default]'}`);
    
    // Format date in Thai Buddhist calendar format (dd/MM/yyyy)
    const now = new Date();
    const buddhistYear = now.getFullYear() + 543;
    const time_start = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${buddhistYear}`;
    
    // Prepare request body
    const requestBody = {
      hydro: {
        StationID: 'P.1',
        TimeStart: time_start
      }
    };
    
    console.log('Request Body:', JSON.stringify(requestBody, null, 2));
    
    // Get OAuth header
    console.log('Generating OAuth header...');
    const authHeader = await getOAuthHeader(TELEMETRY_ENDPOINT, 'POST', requestBody);
    console.log('OAuth Header:', authHeader);
    
    // Make API request
    console.log(`Making request to ${TELEMETRY_ENDPOINT}...`);
    const response = await axios.post(
      TELEMETRY_ENDPOINT,
      requestBody,
      {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'RID-Telemetry-Client/1.0'
        },
        timeout: 30000, // 30 seconds timeout
        validateStatus: () => true, // Handle all status codes in our code
      }
    );
    
    console.log('Response Status:', response.status, response.statusText);
    console.log('Response Headers:', JSON.stringify(response.headers, null, 2));
    console.log('Response Data:', typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2));
    
    if (response.status !== 200) {
      console.error('API request failed with status', response.status);
    } else {
      console.log('API request successful!');
    }
  } catch (error) {
    console.error('Error during API test:', error);
  }
}

// Run the test
testRidApi().catch(console.error); 