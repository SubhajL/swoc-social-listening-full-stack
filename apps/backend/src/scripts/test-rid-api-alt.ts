import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../utils/logger';

// API configuration
const RID_API_BASE_URL = 'http://hyd-app.rid.go.th/webservice';
const RID_API_SERVICE = `${RID_API_BASE_URL}/HydroAuthenticateService.svc`;
const TELEMETRY_ENDPOINT = `${RID_API_SERVICE}/getHourlyTodayFromStationID`;

// Consumer credentials
const CONSUMER_KEY = process.env.RID_CONSUMER_KEY || '38b992bd1c9d445ba5305bc90edd2b4a';
const CONSUMER_SECRET = process.env.RID_CONSUMER_SECRET || '1974b85763c2496d80911b48dfbb53af';

/**
 * Generate OAuth 1.0 signature using the approach from the API documentation
 */
function generateOAuthSignature(url: string, method: string): { signedUrl: string, authHeader: string } {
  // Generate timestamp and nonce
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString('hex');
  
  // Create OAuth parameters
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: CONSUMER_KEY,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_version: '1.0'
  };
  
  // Create parameter string
  const paramString = Object.entries(oauthParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  
  // Create signature base string
  const signatureBaseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(paramString)
  ].join('&');
  
  // Create signing key
  const signingKey = `${CONSUMER_SECRET}&`;
  
  // Generate signature
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBaseString)
    .digest('base64');
  
  // Add signature to parameters
  oauthParams.oauth_signature = signature;
  
  // Create signed URL (for PHP style)
  const signedUrl = `${url}?${paramString}&oauth_signature=${encodeURIComponent(signature)}`;
  
  // Create Authorization header (for header style)
  const authHeader = 'OAuth ' + Object.entries(oauthParams)
    .map(([key, value]) => `${key}="${encodeURIComponent(value)}"`)
    .join(', ');
  
  return { signedUrl, authHeader };
}

async function testRidApi() {
  try {
    console.log('Starting RID API test with alternative OAuth implementation...');
    console.log(`Consumer Key: ${CONSUMER_KEY}`);
    console.log(`Consumer Secret: ${CONSUMER_SECRET ? '[Set]' : '[Not Set]'}`);
    
    // Format date in Thai Buddhist calendar format (dd/MM/yyyy)
    const now = new Date();
    const buddhistYear = now.getFullYear() + 543;
    const time_start = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${buddhistYear}`;
    
    // Prepare request body
    const requestBody = {
      hydro: {
        stationid: "7",
        TimeStart: time_start
      }
    };
    
    console.log('Request Body:', JSON.stringify(requestBody, null, 2));
    
    // Generate OAuth signature
    console.log('Generating OAuth signature...');
    const { signedUrl, authHeader } = generateOAuthSignature(TELEMETRY_ENDPOINT, 'POST');
    
    console.log('Signed URL:', signedUrl);
    console.log('Auth Header:', authHeader);
    
    // Try both approaches: URL with signature and Authorization header
    
    // Approach 1: Using signed URL (PHP style from documentation)
    console.log('\nApproach 1: Using signed URL (PHP style)');
    console.log(`Making request to ${signedUrl}...`);
    
    try {
      const response1 = await axios.post(
        signedUrl,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'RID-Telemetry-Client/1.0'
          },
          timeout: 30000,
          validateStatus: () => true
        }
      );
      
      console.log('Response Status (Approach 1):', response1.status, response1.statusText);
      console.log('Response Headers (Approach 1):', JSON.stringify(response1.headers, null, 2));
      console.log('Response Data (Approach 1):', typeof response1.data === 'string' ? response1.data : JSON.stringify(response1.data, null, 2));
    } catch (error) {
      console.error('Error in Approach 1:', error);
    }
    
    // Approach 2: Using Authorization header
    console.log('\nApproach 2: Using Authorization header');
    console.log(`Making request to ${TELEMETRY_ENDPOINT}...`);
    
    try {
      const response2 = await axios.post(
        TELEMETRY_ENDPOINT,
        requestBody,
        {
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'RID-Telemetry-Client/1.0'
          },
          timeout: 30000,
          validateStatus: () => true
        }
      );
      
      console.log('Response Status (Approach 2):', response2.status, response2.statusText);
      console.log('Response Headers (Approach 2):', JSON.stringify(response2.headers, null, 2));
      console.log('Response Data (Approach 2):', typeof response2.data === 'string' ? response2.data : JSON.stringify(response2.data, null, 2));
    } catch (error) {
      console.error('Error in Approach 2:', error);
    }
    
  } catch (error) {
    console.error('Error during API test:', error);
  }
}

// Run the test
testRidApi().catch(console.error); 