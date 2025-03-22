// Load environment variables
require('dotenv').config({ path: '../apps/backend/.env' });
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// RID API Configuration
const RID_API_BASE_URL = 'http://hyd-app.rid.go.th/webservice';
const RID_API_SERVICE = `${RID_API_BASE_URL}/HydroAuthenticateService.svc`;
const STATION_LIST_ENDPOINT = `${RID_API_SERVICE}/getHourlyStationList`;

// Use backend .env credentials with fallbacks
const consumerKey = process.env.RID_CONSUMER_KEY || '0f8fad5b-d9cb-469f-a165';
const consumerSecret = process.env.RID_CONSUMER_SECRET || '7c9e6679-7425-40de-944b';
const accessToken = process.env.RID_ACCESS_TOKEN || '2Rx39Jq!cL&Reu5';

console.log('Using credentials:');
console.log(`- Consumer Key: ${consumerKey.substring(0, 5)}...${consumerKey.substring(consumerKey.length - 5)}`);
console.log(`- Consumer Secret: ${consumerSecret.substring(0, 5)}...${consumerSecret.substring(consumerSecret.length - 5)}`);
console.log(`- Access Token: ${accessToken ? accessToken.substring(0, 5) + '...' : 'Not set'}`);

// Hydro IDs to check
const HYDRO_IDS = [1, 2, 3, 4, 5, 6, 7, 8];

// OAuth helper functions
function generateTimestamp() {
  return Math.floor(Date.now() / 1000).toString();
}

function generateNonce() {
  return crypto.randomBytes(16).toString('hex');
}

function percentEncode(str) {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
}

function normalizeParameters(params) {
  return Object.entries(params)
    .filter(([key]) => key !== 'oauth_signature')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => `${percentEncode(key)}=${percentEncode(val)}`)
    .join('&');
}

function generateBaseString(method, url, params) {
  return `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(normalizeParameters(params))}`;
}

function sign(baseString, secret) {
  const signingKey = `${percentEncode(secret)}&`;
  return crypto
    .createHmac('sha1', signingKey)
    .update(baseString)
    .digest('base64');
}

// Function to generate a signed URL with OAuth 1.0a
function getSignedUrl(url, method, consumerKey, consumerSecret) {
  const timestamp = generateTimestamp();
  const nonce = generateNonce();
  
  // Create OAuth parameters
  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_version: '1.0'
  };

  // Generate base string and signature
  const baseString = generateBaseString(method, url, oauthParams);
  const signature = sign(baseString, consumerSecret);
  
  // Create parameter string
  const paramString = normalizeParameters(oauthParams);
  
  // Create signed URL
  return `${url}?${paramString}&oauth_signature=${percentEncode(signature)}`;
}

// Function to fetch stations for a hydro ID
async function fetchStations(hydroId) {
  try {
    console.log(`Fetching stations for hydro ID ${hydroId} from backend API...`);
    
    // For hydro ID 1, try to use the backend API
    if (hydroId === 1) {
      try {
        // Prepare request to backend API instead of direct RID API
        const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:3000';
        const API_ENDPOINT = `${BACKEND_API_URL}/api/hydro/stations/${hydroId}`;
        
        console.log(`Making request to backend API: ${API_ENDPOINT}`);
        
        const response = await axios.get(API_ENDPOINT, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          timeout: 30000,
        });
        
        // Parse JSON data
        if (response.status === 200) {
          const data = response.data.data || response.data;
          
          // Check if data is an array
          if (Array.isArray(data)) {
            console.log(`Successfully fetched ${data.length} stations for hydro ID ${hydroId} from backend API`);
            
            // Save data to local file for future use
            const outputFile = `hydro_id_${hydroId}_api_backend.json`;
            fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
            console.log(`Saved API data to ${outputFile}`);
            
            return data;
          } else {
            console.error(`Invalid response format from backend API: not an array`, data);
          }
        } else {
          console.error(`Backend API request failed: HTTP ${response.status}`);
        }
      } catch (apiError) {
        console.error(`Backend API call failed:`, apiError.message);
        console.log('Falling back to local file...');
      }
    }
    
    // Try to use local file if it exists (for testing/fallback)
    if (fs.existsSync(`hydro_id_${hydroId}_fixed.json`)) {
      try {
        console.log(`Using local test data file for hydro ID ${hydroId}...`);
        const data = fs.readFileSync(`hydro_id_${hydroId}_fixed.json`, 'utf8');
        const stations = JSON.parse(data);
        console.log(`Found ${stations.length} stations in local file for hydro ID ${hydroId}`);
        return stations;
      } catch (localFileError) {
        console.error(`Error reading local test file: ${localFileError.message}`);
      }
    }
    
    // Try test_output.json as fallback
    try {
      if (fs.existsSync('test_output.json')) {
        console.log(`Using test_output.json as fallback for hydro ID ${hydroId}...`);
        const data = fs.readFileSync('test_output.json', 'utf8');
        const stations = JSON.parse(data);
        console.log(`Found ${stations.length} stations in test_output.json`);
        return stations;
      }
    } catch (fallbackError) {
      console.error(`Fallback also failed:`, fallbackError.message);
    }
    
    return [];
  } catch (error) {
    console.error(`Failed to fetch stations for hydro ID ${hydroId}:`, error.message);
    return [];
  }
}

// Function to analyze station data
function analyzeStationData(allStations) {
  console.log('\n=== Station Analysis ===');
  
  // Count total unique stations
  const uniqueStationsByCode = new Map();
  const uniqueStationsById = new Map();
  
  // Analyze each station
  allStations.forEach(station => {
    // Check for stationcode
    if (station.stationcode) {
      uniqueStationsByCode.set(station.stationcode, station);
    }
    
    // Check for stationid
    if (station.stationid) {
      uniqueStationsById.set(station.stationid, station);
    }
  });
  
  console.log(`Total stations: ${allStations.length}`);
  console.log(`Unique stations by code: ${uniqueStationsByCode.size}`);
  console.log(`Unique stations by ID: ${uniqueStationsById.size}`);
  
  // Check for stations with missing codes
  const stationsWithoutCode = allStations.filter(station => !station.stationcode);
  console.log(`Stations without stationcode: ${stationsWithoutCode.length}`);
  
  // Check for stations with missing IDs
  const stationsWithoutId = allStations.filter(station => !station.stationid);
  console.log(`Stations without stationid: ${stationsWithoutId.length}`);
  
  // Sample of station codes
  console.log('\n=== Sample Station Codes ===');
  const stationCodes = Array.from(uniqueStationsByCode.keys()).slice(0, 10);
  console.log(stationCodes);
  
  // Sample of station IDs
  console.log('\n=== Sample Station IDs ===');
  const stationIds = Array.from(uniqueStationsById.keys()).slice(0, 10);
  console.log(stationIds);
  
  // Write analysis to file
  const analysisFile = 'station_analysis.json';
  fs.writeFileSync(analysisFile, JSON.stringify({
    totalStations: allStations.length,
    uniqueStationsByCode: uniqueStationsByCode.size,
    uniqueStationsById: uniqueStationsById.size,
    stationsWithoutCode: stationsWithoutCode.length,
    stationsWithoutId: stationsWithoutId.length,
    sampleStationCodes: stationCodes,
    sampleStationIds: stationIds
  }, null, 2));
  console.log(`Analysis saved to ${analysisFile}`);
}

// Main function
async function main() {
  console.log('=== RID Telemetry Stations Analyzer ===');
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log(`Will check stations for hydro IDs: ${HYDRO_IDS.join(', ')}`);
  
  // Check for required credentials
  if (!RID_API_SERVICE) {
    console.error('RID_API_SERVICE is not defined in environment variables');
    process.exit(1);
  }
  
  if (!consumerKey || !consumerSecret) {
    console.warn('RID OAuth credentials are missing. Using fallback values for testing purposes');
  }
  
  // Create summary table
  console.log('\n=== Station Count by Hydro ID ===');
  console.log('| Hydro ID | Station Count |');
  console.log('|----------|---------------|');
  
  // Fetch stations for each hydro ID
  const allStations = [];
  
  for (const hydroId of HYDRO_IDS) {
    const stations = await fetchStations(hydroId);
    console.log(`| ${hydroId}        | ${stations.length.toString().padEnd(13)} |`);
    allStations.push(...stations);
  }
  
  console.log('\n=== Summary ===');
  console.log(`Total stations across all hydro IDs: ${allStations.length}`);
  
  // Analyze station data
  analyzeStationData(allStations);
  
  console.log(`Finished at: ${new Date().toISOString()}`);
}

// Run main function
main();
