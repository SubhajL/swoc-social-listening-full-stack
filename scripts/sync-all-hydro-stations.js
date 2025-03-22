#!/usr/bin/env node

/**
 * RID Telemetry Station Sync Script for Multiple Hydro IDs
 * 
 * This script syncs telemetry stations for hydro IDs 1-8 from RID API,
 * identifies new stations, and logs them for further processing.
 * 
 * Usage:
 *   node sync-all-hydro-stations.js
 */

// Dependencies
const path = require('path');
const dotenv = require('dotenv');
const axios = require('axios');
const { exec } = require('child_process');
const pg = require('pg');
const crypto = require('crypto');
const fs = require('fs');

// Load environment variables from backend .env file
dotenv.config({ path: path.resolve(__dirname, '../apps/backend/.env') });

// Database configuration
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'swoc',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

// RID API configuration
const RID_API_BASE_URL = 'http://hyd-app.rid.go.th/webservice';
const RID_API_SERVICE = `${RID_API_BASE_URL}/HydroAuthenticateService.svc`;
const STATIONS_ENDPOINT = `${RID_API_SERVICE}/getHourlyStationList`;

// OAuth constants - read from backend .env
const consumerKey = process.env.RID_CONSUMER_KEY || '0f8fad5b-d9cb-469f-a165';
const consumerSecret = process.env.RID_CONSUMER_SECRET || '7c9e6679-7425-40de-944b';
const accessToken = process.env.RID_ACCESS_TOKEN || '2Rx39Jq!cL&Reu5';
const accessTokenSecret = process.env.RID_ACCESS_TOKEN_SECRET || '';

console.log('Using API credentials:');
console.log(`- Consumer Key: ${consumerKey.substring(0, 5)}...${consumerKey.substring(consumerKey.length - 5)}`);
console.log(`- Consumer Secret: ${consumerSecret.substring(0, 5)}...${consumerSecret.substring(consumerSecret.length - 5)}`);
console.log(`- Access Token: ${accessToken ? accessToken.substring(0, 5) + '...' : 'Not set'}`);

// Print database config (without password)
console.log('Using database config:');
console.log(`- User: ${dbConfig.user}`);
console.log(`- Host: ${dbConfig.host}`);
console.log(`- Database: ${dbConfig.database}`);
console.log(`- Port: ${dbConfig.port}`);
console.log(`- SSL: ${dbConfig.ssl ? 'Enabled' : 'Disabled'}`);

// Hydro IDs to sync
const HYDRO_IDS = [1, 2, 3, 4, 5, 6, 7, 8];

// Improved OAuth helper functions
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

// Function to fetch stations for a hydro ID using the RID Telemetry API directly
async function fetchStations(hydroId) {
  try {
    console.log(`Fetching stations for hydro ID ${hydroId} from backend API...`);
    
    // Try to use local file first if it exists (for testing/fallback)
    const testDataFile = `hydro_id_${hydroId}_fixed.json`;
    
    if (fs.existsSync(testDataFile) && fs.statSync(testDataFile).size > 0) {
      try {
        console.log(`Using local test data file: ${testDataFile}`);
        const data = fs.readFileSync(testDataFile, 'utf8');
        if (data.trim().startsWith('[')) {
          const stations = JSON.parse(data);
          console.log(`Successfully loaded ${stations.length} stations from test data for hydro ID ${hydroId}`);
          
          return stations.map(station => ({
            ...station,
            hydroid: hydroId
          }));
        }
      } catch (localFileError) {
        console.error(`Error reading local test file: ${localFileError.message}`);
        // Continue to API call on local file error
      }
    }
    
    // Prepare backend API request with the correct endpoint
    const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:3000';
    const API_ENDPOINT = `${BACKEND_API_URL}/api/telemetry/hydro/${hydroId}/stations`;
    
    // Make API request to our backend instead of directly to RID API
    console.log(`Making request to backend API: ${API_ENDPOINT}`);
    
    try {
      const response = await axios.get(API_ENDPOINT, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000
      });
      
      // Handle non-200 response codes
      if (response.status !== 200) {
        console.error(`Error fetching stations for hydro ID ${hydroId}: HTTP ${response.status}`);
        throw new Error(`HTTP ${response.status}`);
      }
      
      // Parse JSON data
      const data = response.data.data || response.data;
      
      // Check if data is an array
      if (!Array.isArray(data)) {
        console.error(`Invalid response format for hydro ID ${hydroId}: not an array`);
        throw new Error('Invalid response format: not an array');
      }
      
      console.log(`Successfully fetched ${data.length} stations for hydro ID ${hydroId} from backend API`);
      
      // Save data to local file for future use
      const outputFile = `hydro_id_${hydroId}_backend.json`;
      fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
      console.log(`Saved API data to ${outputFile} for future reference`);
      
      // Return stations with hydroid added
      return data.map(station => ({
        ...station,
        hydroid: hydroId
      }));
    } catch (apiError) {
      console.error(`Backend API call failed for hydro ID ${hydroId}:`, apiError.message);
      console.log('Falling back to test data...');
      
      // Try to use test_output.json as fallback, specifically for testing
      try {
        if (fs.existsSync('test_output.json')) {
          console.log(`Trying to use test_output.json as fallback for hydro ID ${hydroId}...`);
          const fallbackData = fs.readFileSync('test_output.json', 'utf8');
          const stations = JSON.parse(fallbackData);
          console.log(`Using ${stations.length} stations from test_output.json as fallback`);
          
          return stations.map(station => ({
            ...station,
            hydroid: hydroId
          }));
        }
      } catch (fallbackError) {
        console.error(`Fallback also failed:`, fallbackError.message);
      }
      
      return [];
    }
  } catch (error) {
    console.error(`Failed to fetch stations for hydro ID ${hydroId}:`, error.message);
    return [];
  }
}

// Function to get existing station IDs from database
async function getExistingStationIdsFromDb() {
  try {
    const client = new pg.Client(dbConfig);
    await client.connect();
    const result = await client.query('SELECT station_id FROM telemetry_station');
    await client.end();
    return new Set(result.rows.map(row => row.station_id));
  } catch (error) {
    console.error('Error fetching existing station IDs from database:', error.message);
    return new Set();
  }
}

// Function to compare API stations with database records
function compareStations(apiStations, existingStationIds) {
  const newStations = [];
  
  // Loop through each station from the API
  for (const station of apiStations) {
    // Extract station code (which should match station_id in the database)
    const stationCode = station.stationcode?.toString();
    
    if (!stationCode) {
      console.warn('Skipping station with no station code:', station);
      continue;
    }
    
    // Check if this station code exists in the database
    if (!existingStationIds.has(stationCode)) {
      newStations.push(station);
    }
  }
  
  return newStations;
}

// Main function to run the script
async function main() {
  console.log('=== RID Telemetry Stations Sync ===');
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log(`Will fetch stations for hydro IDs: ${HYDRO_IDS.join(', ')}`);
  
  // Check for required credentials
  if (!RID_API_SERVICE) {
    console.error('RID_API_SERVICE is not defined in environment variables');
    process.exit(1);
  }
  
  if (!consumerKey || !consumerSecret) {
    console.error('RID OAuth credentials are missing. Please check environment variables:');
    console.error('- RID_CONSUMER_KEY');
    console.error('- RID_CONSUMER_SECRET');
    console.warn('Using fallback values for testing purposes');
  }

  // Connect to database
  const client = new pg.Client(dbConfig);
  
  try {
    await client.connect();
    console.log('Fetching existing station IDs from database...');
    
    // Fetch all station IDs from database
    const result = await client.query('SELECT station_id FROM telemetry_station');
    const existingStationIds = new Set(result.rows.map(row => row.station_id));
    
    console.log(`Found ${existingStationIds.size} existing stations in database`);
    
    // Fetch stations for each hydro ID
    const allStations = [];
    
    for (const hydroId of HYDRO_IDS) {
      const stations = await fetchStations(hydroId);
      allStations.push(...stations);
    }
    
    console.log(`Fetched a total of ${allStations.length} stations from RID API for all hydro IDs`);
    
    // Find new stations
    const newStations = allStations.filter(station => {
      // Skip stations without station code
      if (!station.stationcode) {
        console.warn(`Station without stationcode found in hydro ID ${station.hydroid}:`, station);
        return false;
      }
      
      // Check if station already exists in database
      return !existingStationIds.has(station.stationcode);
    });
    
    console.log(`Found ${newStations.length} new stations that don't exist in the database`);
    
    // Insert new stations into database
    if (newStations.length > 0) {
      console.log('Inserting new stations into database...');
      
      for (const station of newStations) {
        console.log(`Inserting station ${station.stationcode} (${station.stationname})...`);
        
        // Insert station into database
        await client.query(
          `INSERT INTO telemetry_station (
            station_id, station_name, river_name, province, amphure, 
            irrigation_office, hydro_id, code
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            station.stationcode,
            station.stationname,
            station.rivername,
            station.province,
            station.amphoe,
            station.tele_station_name,
            station.hydroid,
            station.stationcode
          ]
        );
      }
      
      console.log(`Successfully inserted ${newStations.length} new stations into database`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
    console.log(`Finished at: ${new Date().toISOString()}`);
  }
}

// Run the script
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
