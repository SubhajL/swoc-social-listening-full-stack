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

async function testSpecificStations() {
  try {
    console.log('Starting RID API test for specific stations...');
    console.log(`Consumer Key: ${CONSUMER_KEY}`);
    console.log(`Consumer Secret: ${CONSUMER_SECRET ? '[Set]' : '[Not Set]'}`);
    
    // List of stations in แม่แตง, เชียงใหม่
    const maeTaengStations = [
      { id: 'P.4A', name: 'แม่น้ำปิง บ้านแม่แตง อำเภอแม่แตง จังหวัดเชียงใหม่' },
      { id: 'P.67', name: 'น้ำแม่แตง บ้านเมืองกื้ด อำเภอแม่แตง จังหวัดเชียงใหม่' },
      { id: 'P.79', name: 'น้ำแม่แตง บ้านสบแม่รวม อำเภอแม่แตง จังหวัดเชียงใหม่' },
      { id: 'P.82', name: 'น้ำแม่งัด บ้านสหกรณ์ร่มเกล้า อำเภอแม่แตง จังหวัดเชียงใหม่' },
      { id: 'P.1', name: 'แม่น้ำปิง สะพานนวรัฐ อำเภอเมือง จังหวัดเชียงใหม่' } // Known working station for comparison
    ];
    
    // Format date in Thai Buddhist calendar format (dd/MM/yyyy)
    // Use Thai timezone (UTC+7)
    const now = new Date();
    const thaiTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    const buddhistYear = thaiTime.getFullYear() + 543;
    const time_start = `${thaiTime.getDate().toString().padStart(2, '0')}/${(thaiTime.getMonth() + 1).toString().padStart(2, '0')}/${buddhistYear}`;
    
    console.log(`Using Thai date format: ${time_start}`);
    console.log(`Thai time: ${thaiTime.toISOString()}, UTC time: ${now.toISOString()}`);
    
    for (const station of maeTaengStations) {
      console.log(`\n=== Testing station: ${station.id} - ${station.name} ===`);
      
      // Prepare request body
      const requestBody = {
        hydro: {
          StationID: station.id,
          TimeStart: time_start
        }
      };
      
      console.log('Request Body:', JSON.stringify(requestBody, null, 2));
      
      // Generate OAuth signature
      console.log('Generating OAuth signature...');
      const { signedUrl, authHeader } = generateOAuthSignature(TELEMETRY_ENDPOINT, 'POST');
      
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
            console.log(`Found ${data.length} telemetry readings for station ${station.id}`);
            
            if (data.length > 0) {
              console.log('\nSample telemetry data:');
              data.slice(0, 3).forEach((reading, index) => {
                console.log(`Reading ${index + 1}:`);
                console.log(`- Time: ${reading.hourlytime} (${reading.hourlytimeutc} UTC)`);
                console.log(`- Water Level: ${reading.wlvalues !== null ? reading.wlvalues + ' m' : 'N/A'}`);
                console.log(`- Flow Rate: ${reading.qvalues !== null ? reading.qvalues + ' m³/s' : 'N/A'}`);
                console.log(`- Status: ${reading.notationstring || 'N/A'}`);
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
testSpecificStations().catch(console.error); 