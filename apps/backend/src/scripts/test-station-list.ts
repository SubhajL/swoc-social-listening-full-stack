import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../utils/logger';

// API configuration
const RID_API_BASE_URL = 'http://hyd-app.rid.go.th/webservice';
const RID_API_SERVICE = `${RID_API_BASE_URL}/HydroAuthenticateService.svc`;
const STATION_LIST_ENDPOINT = `${RID_API_SERVICE}/getHourlyStationList`;

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

async function testStationList() {
  try {
    console.log('Starting RID API station list test...');
    console.log(`Consumer Key: ${CONSUMER_KEY}`);
    console.log(`Consumer Secret: ${CONSUMER_SECRET ? '[Set]' : '[Not Set]'}`);
    
    // Try different HydroID values
    const hydroIds = ['7', '1', '2', '3', '4', '5', '6', '8', '9', '10'];
    
    for (const hydroId of hydroIds) {
      console.log(`\n=== Testing with HydroID: ${hydroId} ===`);
      
      // Prepare request body
      const requestBody = {
        hydro: {
          HydroID: hydroId
        }
      };
      
      console.log('Request Body:', JSON.stringify(requestBody, null, 2));
      
      // Generate OAuth signature
      console.log('Generating OAuth signature...');
      const { signedUrl, authHeader } = generateOAuthSignature(STATION_LIST_ENDPOINT, 'POST');
      
      console.log('Signed URL:', signedUrl);
      
      // Using signed URL (PHP style from documentation)
      console.log(`Making request to ${signedUrl}...`);
      
      try {
        const response = await axios.post(
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
        
        console.log('Response Status:', response.status, response.statusText);
        
        if (response.status === 200) {
          const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
          
          if (Array.isArray(data)) {
            console.log(`Found ${data.length} stations for HydroID ${hydroId}`);
            
            // Filter stations in แม่แตง, เชียงใหม่
            const maeTaengStations = data.filter(station => 
              station.stationname && 
              (station.stationname.includes('แม่แตง') || 
               station.stationname.includes('แม่ตะมาน') ||
               station.stationname.includes('แม่งัด'))
            );
            
            if (maeTaengStations.length > 0) {
              console.log(`Found ${maeTaengStations.length} stations in แม่แตง area:`);
              maeTaengStations.forEach(station => {
                console.log(`- ${station.stationid}: ${station.stationname}`);
              });
            } else {
              console.log('No stations found in แม่แตง area');
            }
            
            // Log first 5 stations as sample
            if (data.length > 0) {
              console.log('\nSample stations:');
              data.slice(0, 5).forEach(station => {
                console.log(`- ${station.stationid}: ${station.stationname}`);
              });
            }
          } else {
            console.log('Response is not an array:', data);
          }
        } else {
          console.log('Response Data:', typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2));
        }
      } catch (error) {
        console.error('Error in request:', error);
      }
    }
    
  } catch (error) {
    console.error('Error during API test:', error);
  }
}

// Run the test
testStationList().catch(console.error); 