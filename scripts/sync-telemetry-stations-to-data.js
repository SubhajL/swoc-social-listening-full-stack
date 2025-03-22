#!/usr/bin/env node

/**
 * Telemetry Stations Sync Script for telemetry_data_stations
 * 
 * This script fetches telemetry station information from the RID API and stores it in the telemetry_data_stations table.
 * It can be run as a scheduled task to keep the telemetry_data_stations table up-to-date.
 * 
 * Usage:
 *   node sync-telemetry-stations-to-data.js [hydro_id]
 * 
 * If no hydro_id is provided, it will sync stations for all hydro regions.
 */

// Set up error handling for missing dependencies
try {
  const path = require('path');
  const dotenv = require('dotenv');
  
  // Load environment variables from backend .env file
  dotenv.config({ path: path.resolve(__dirname, '../apps/backend/.env') });
  
  const axios = require('axios');
  const { Pool } = require('pg');
  const crypto = require('crypto');
} catch (err) {
  console.error(`Error loading dependencies: ${err.message}`);
  console.error('Make sure to install required dependencies:');
  console.error('  cd scripts && npm install dotenv path pg axios');
  process.exit(1);
}

const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables from backend .env file
dotenv.config({ path: path.resolve(__dirname, '../apps/backend/.env') });

const axios = require('axios');
const { Pool } = require('pg');
const crypto = require('crypto');

// Set NODE_TLS_REJECT_UNAUTHORIZED to allow self-signed certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// RID API configuration
const RID_API_BASE_URL = 'http://hyd-app.rid.go.th/webservice';
const RID_API_SERVICE = `${RID_API_BASE_URL}/HydroAuthenticateService.svc`;
const STATIONS_ENDPOINT = `${RID_API_SERVICE}/getHourlyStationList`;

// OAuth constants - read from backend .env or use hardcoded defaults for testing
const consumerKey = process.env.RID_CONSUMER_KEY || '38b992bd1c9d445ba5305bc90edd2b4a';
const consumerSecret = process.env.RID_CONSUMER_SECRET || '1974b85763c2496d80911b48dfbb53af';

// Validate required environment variables
if (!consumerKey || !consumerSecret) {
  console.error('Error: RID_CONSUMER_KEY and RID_CONSUMER_SECRET must be defined in the backend .env file');
  process.exit(1);
}

// List of hydro regions to sync if no specific hydro_id is provided
const DEFAULT_HYDRO_REGIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

// Print script usage
function printUsage() {
  console.log('Usage: node sync-telemetry-stations-to-data.js [hydro_id]');
  console.log('If no hydro_id is provided, it will sync stations for all hydro regions.');
}

// OAuth signature functions
function getSignature(method, url, params, consumerSecret, tokenSecret = '') {
  const signatureBaseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(params)
  ].join('&');
  
  const signingKey = encodeURIComponent(consumerSecret) + '&' + encodeURIComponent(tokenSecret);
  
  return crypto
    .createHmac('sha1', signingKey)
    .update(signatureBaseString)
    .digest('base64');
}

function percentEncode(str) {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
}

function generateNonce(length = 32) {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
}

// Function to get signed URL for API request
function getSignedUrl(baseUrl, method, requestBody) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();
  
  // For POST requests with a request body, include it in the signature
  let params = '';
  if (method.toUpperCase() === 'POST' && requestBody) {
    params = JSON.stringify(requestBody);
  }
  
  // OAuth parameters
  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_version: '1.0'
  };
  
  // Sort the parameters
  const sortedParams = Object.keys(oauthParams)
    .sort()
    .map(key => `${percentEncode(key)}=${percentEncode(oauthParams[key])}`)
    .join('&');
  
  // Generate signature
  const signature = getSignature(
    method,
    baseUrl,
    sortedParams,
    consumerSecret
  );
  
  // Add signature to OAuth parameters
  oauthParams.oauth_signature = signature;
  
  // Build authorization header
  const authHeader = Object.keys(oauthParams)
    .map(key => `${percentEncode(key)}="${percentEncode(oauthParams[key])}"`)
    .join(', ');
  
  // Add OAuth header to base URL
  return baseUrl + '?oauth=' + encodeURIComponent(authHeader);
}

// Function to fetch stations for a specific hydro ID
async function fetchStationsForHydroId(hydroId) {
  try {
    console.log(`Fetching telemetry stations for hydro ID ${hydroId}...`);
    
    // Prepare request body
    const requestBody = {
      hydro: {
        hydroid: hydroId
      }
    };
    
    // Get signed URL
    const signedUrl = getSignedUrl(STATIONS_ENDPOINT, 'POST', requestBody);
    
    // Make API request
    const response = await axios.post(
      signedUrl,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'RID-Telemetry-Sync/1.0'
        },
        timeout: 30000, // 30 second timeout
        // Handle all status codes in our code
        validateStatus: () => true,
        // Allow self-signed certificates
        httpsAgent: new (require('https').Agent)({ 
          rejectUnauthorized: false
        })
      }
    );

    // Check for HTTP errors
    if (response.status !== 200) {
      console.error(`Error fetching stations for hydro ID ${hydroId}: HTTP ${response.status}`);
      console.error(response.data);
      return null;
    }
    
    // Parse response data
    let stations;
    if (typeof response.data === 'string') {
      stations = JSON.parse(response.data);
    } else {
      stations = response.data;
    }
    
    if (!Array.isArray(stations)) {
      console.error(`Invalid response format for hydro ID ${hydroId}:`, stations);
      return null;
    }
    
    console.log(`Successfully fetched ${stations.length} stations for hydro ID ${hydroId}`);
    
    // Save to file for debugging
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `hydro_${hydroId}_stations_${timestamp}.json`;
    fs.writeFileSync(filename, JSON.stringify(stations, null, 2));
    console.log(`Saved raw station data to ${filename}`);
    
    return stations;
  } catch (error) {
    console.error(`Failed to fetch stations for hydro ID ${hydroId}:`, error.message);
    return null;
  }
}

// Function to extract numeric station ID from station code
function extractNumericStationId(stationId, stationCode) {
  // Try both station ID and station code
  const idToCheck = stationId || stationCode || '';
  
  // Look for patterns like "X.123" or "X.123A" - we want to extract "123" or "123A"
  const match = idToCheck.match(/[A-Za-z]+\.(\d+[A-Za-z]?)/);
  if (match && match[1]) {
    return match[1];
  }
  
  // For purely numeric station codes, use as is
  if (/^\d+$/.test(idToCheck)) {
    return idToCheck;
  }
  
  return idToCheck; // Return the original ID if no pattern matches
}

// Function to save station data to database
async function saveStationToDatabase(station) {
  try {
    // Extract station data from API response
    const {
      stationid,
      stationcode,
      name,
      stationdetail,
      hydroid,
      hydroname,
      basinid,
      basinname,
      provincecode,
      provincename,
      amphurcode,
      amphurname,
      latitude,
      longitude,
      GroundLevel,
      QMax,
      ZG,
      braelevel,
      UseMSL,
      UseQAuto,
      TelemetryID,
      TelemetrySource,
      ShowHourlyReport,
      ShowDailyReport,
      note
    } = station;

    // Extract numeric station ID from station id/code for the new station_id
    const extractedId = extractNumericStationId(stationid, stationcode);

    // Insert or update station in telemetry_data_stations table
    const query = `
      INSERT INTO telemetry_data_stations (
        station_id, station_code, station_name, station_detail, 
        hydro_id, hydro_name, basin_id, basin_name, 
        province_code, province, amphure_code, amphure,
        latitude, longitude, ground_level, q_max, 
        zg, brae_level, use_msl, use_q_auto, 
        telemetry_id, telemetry_source, show_hourly_report, show_daily_report,
        notes, data_source, original_station_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
      ON CONFLICT (station_id) WHERE data_source = 'RID' DO UPDATE SET
        station_code = EXCLUDED.station_code,
        station_name = EXCLUDED.station_name,
        station_detail = EXCLUDED.station_detail,
        hydro_id = EXCLUDED.hydro_id,
        hydro_name = EXCLUDED.hydro_name,
        basin_id = EXCLUDED.basin_id,
        basin_name = EXCLUDED.basin_name,
        province_code = EXCLUDED.province_code,
        province = EXCLUDED.province,
        amphure_code = EXCLUDED.amphure_code,
        amphure = EXCLUDED.amphure,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        ground_level = EXCLUDED.ground_level,
        q_max = EXCLUDED.q_max,
        zg = EXCLUDED.zg,
        brae_level = EXCLUDED.brae_level,
        use_msl = EXCLUDED.use_msl,
        use_q_auto = EXCLUDED.use_q_auto,
        telemetry_id = EXCLUDED.telemetry_id,
        telemetry_source = EXCLUDED.telemetry_source,
        show_hourly_report = EXCLUDED.show_hourly_report,
        show_daily_report = EXCLUDED.show_daily_report,
        notes = EXCLUDED.notes,
        updated_at = NOW()
      RETURNING id;
    `;

    const values = [
      extractedId,                             // station_id (now using extracted numeric ID)
      stationcode?.toString(),                 // station_code
      name || stationdetail,                   // station_name
      stationdetail,                           // station_detail
      hydroid ? parseInt(hydroid, 10) : null,  // hydro_id
      hydroname,                               // hydro_name
      basinid ? parseInt(basinid, 10) : null,  // basin_id
      basinname,                               // basin_name
      provincecode ? parseInt(provincecode, 10) : null, // province_code
      provincename,                            // province (renamed from province_name)
      amphurcode ? parseInt(amphurcode, 10) : null, // amphure_code
      amphurname,                              // amphure (renamed from amphure_name)
      latitude ? parseFloat(latitude) : null,  // latitude
      longitude ? parseFloat(longitude) : null, // longitude
      GroundLevel ? parseFloat(GroundLevel) : null, // ground_level
      QMax ? parseFloat(QMax) : null,          // q_max
      ZG ? parseFloat(ZG) : null,              // zg
      braelevel ? parseFloat(braelevel) : null, // brae_level
      UseMSL === '1' || UseMSL === true,       // use_msl
      UseQAuto === '1' || UseQAuto === true,   // use_q_auto
      TelemetryID ? parseInt(TelemetryID, 10) : null, // telemetry_id
      TelemetrySource,                         // telemetry_source
      ShowHourlyReport === '1' || ShowHourlyReport === true, // show_hourly_report
      ShowDailyReport === '1' || ShowDailyReport === true,  // show_daily_report
      note,                                    // notes
      'RID',                                   // data_source
      stationid?.toString(),                   // original_station_id (preserve the original ID)
      'active'                                 // status
    ];

    const result = await pool.query(query, values);
    const stationDbId = result.rows[0]?.id;
    
    console.log(`Saved station ${extractedId} (${name}) to telemetry_data_stations with ID ${stationDbId}`);
    return stationDbId;
  } catch (error) {
    console.error(`Failed to save station ${station.stationid}:`, error.message);
    
    // Log the error details for debugging
    console.error('Error details:', error);
    console.error('Station data:', JSON.stringify(station, null, 2));
    
    throw error;
  }
}

// Main function to sync all stations for a given hydro ID
async function syncStationsForHydroId(hydroId) {
  try {
    console.log(`Starting sync for hydro ID ${hydroId}`);
    
    // Fetch stations from API
    const stations = await fetchStationsForHydroId(hydroId);
    if (!stations || !stations.length) {
      console.log(`No stations found for hydro ID ${hydroId}`);
      return { hydroId, count: 0, success: false };
    }
    
    // Save stations to database
    console.log(`Saving ${stations.length} stations to telemetry_data_stations table...`);
    
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    for (const station of stations) {
      try {
        // Skip stations without stationid
        if (!station.stationid && !station.stationcode) {
          console.warn(`Skipping station with missing ID and code:`, station);
          skippedCount++;
          continue;
        }
        
        await saveStationToDatabase(station);
        successCount++;
      } catch (error) {
        console.error(`Error saving station ${station.stationid || station.stationcode}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`Sync completed for hydro ID ${hydroId}:`);
    console.log(`  - Total stations: ${stations.length}`);
    console.log(`  - Successfully saved: ${successCount}`);
    console.log(`  - Errors: ${errorCount}`);
    console.log(`  - Skipped: ${skippedCount}`);
    
    return { 
      hydroId, 
      count: stations.length, 
      success: successCount > 0,
      successCount,
      errorCount,
      skippedCount
    };
  } catch (error) {
    console.error(`Failed to sync stations for hydro ID ${hydroId}:`, error.message);
    return { hydroId, count: 0, success: false, error: error.message };
  }
}

// Main function
async function main() {
  try {
    console.log('=== Telemetry Stations Sync Script for telemetry_data_stations ===');
    console.log(`Started at: ${new Date().toISOString()}`);
    
    // Get hydro IDs to sync
    const args = process.argv.slice(2);
    let hydroIds = [];
    
    if (args.length > 0) {
      if (args[0] === '--help' || args[0] === '-h') {
        printUsage();
        process.exit(0);
      }
      
      // Use provided hydro ID
      hydroIds = [args[0]];
    } else {
      // Use default hydro IDs
      hydroIds = DEFAULT_HYDRO_REGIONS;
    }
    
    console.log(`Will sync stations for ${hydroIds.length} hydro IDs: ${hydroIds.join(', ')}`);
    
    // Sync stations for each hydro ID
    const results = [];
    
    for (const hydroId of hydroIds) {
      const result = await syncStationsForHydroId(hydroId);
      results.push(result);
    }
    
    // Print final summary
    console.log('\n=== Sync Summary ===');
    console.log(`Completed at: ${new Date().toISOString()}`);
    
    let totalStations = 0;
    let totalSuccess = 0;
    let totalErrors = 0;
    let totalSkipped = 0;
    
    for (const result of results) {
      console.log(`Hydro ID ${result.hydroId}: ${result.successCount || 0}/${result.count} stations synced`);
      
      totalStations += result.count || 0;
      totalSuccess += result.successCount || 0;
      totalErrors += result.errorCount || 0;
      totalSkipped += result.skippedCount || 0;
    }
    
    console.log(`\nTotal stations processed: ${totalStations}`);
    console.log(`Total successful: ${totalSuccess}`);
    console.log(`Total errors: ${totalErrors}`);
    console.log(`Total skipped: ${totalSkipped}`);
    
    console.log('\nSync completed successfully.');
  } catch (error) {
    console.error('Error in main function:', error.message);
    process.exit(1);
  } finally {
    // Close database connection
    await pool.end();
    console.log('Database connection closed.');
  }
}

// Run main function
main().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
}); 