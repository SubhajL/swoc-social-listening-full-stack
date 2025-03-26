// Script to update existing telemetry station records with complete data from RID API
// This script specifically updates the provided station IDs with complete information
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import pg from 'pg';
import https from 'https';
import crypto from 'crypto';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
const envPath = path.join(__dirname, 'apps/backend/.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.log(`Backend .env file not found at: ${envPath}`);
  dotenv.config(); // Try default location
}

// Create axios instance that ignores SSL certificate verification
// WARNING: This should only be used for specific trusted APIs in development/testing
const api = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false // Ignore SSL certificate verification
  })
});

// API endpoint configuration - using the correct endpoint from codebase
const RID_API_BASE_URL = 'http://hyd-app.rid.go.th/webservice';
const RID_API_SERVICE = `${RID_API_BASE_URL}/HydroAuthenticateService.svc`;
const ENDPOINTS = {
  getHourlyStationList: `${RID_API_SERVICE}/getHourlyStationList`,
  getDailyStationList: `${RID_API_SERVICE}/getDailyStationList`
};

// OAuth constants - read from backend .env or use hardcoded defaults for testing
const consumerKey = process.env.RID_CONSUMER_KEY || '38b992bd1c9d445ba5305bc90edd2b4a';
const consumerSecret = process.env.RID_CONSUMER_SECRET || '1974b85763c2496d80911b48dfbb53af';

// Database configuration
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// List of station IDs from the screenshot to update
const STATION_IDS = [
  '605',
  '657',
  '658',
  '41',
  '55',
  '607',
  '608',
  '609',
  '610',
  '611',
  '451',
  '452',
  '598',
  '675',
  '487',
  '476'
];

// Generate random nonce
function generateNonce(length = 32) {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
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

/**
 * Get station details from RID API
 * @param {string} endpoint - API endpoint to use
 * @param {number} hydroId - Hydro region ID (1-11)
 * @returns {Promise<Array>} Array of station objects
 */
async function getStationsFromRidApi(endpoint, hydroId) {
  try {
    console.log(`Requesting stations from ${endpoint} for hydro region ${hydroId}...`);
    
    // For these endpoints, we need to send a POST request with a hydro parameter
    const requestBody = {
      hydro: {
        hydroid: hydroId.toString()
      }
    };
    
    // Get signed URL
    const signedUrl = getSignedUrl(endpoint, 'POST', requestBody);
    
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
        validateStatus: () => true // Handle all status codes in our code
      }
    );

    // Check for HTTP errors
    if (response.status !== 200) {
      console.error(`Error fetching stations: HTTP ${response.status}`);
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
      console.error(`Invalid response format from API: not an array`);
      return null;
    }
    
    console.log(`Successfully fetched ${stations.length} stations from API for hydro region ${hydroId}`);
    return stations;
  } catch (error) {
    console.error(`Error fetching stations from RID API (${endpoint}):`, error.message);
    return null;
  }
}

/**
 * Get station details from database
 * @returns {Promise<Array>} Array of station objects
 */
async function getStationsFromDatabase() {
  try {
    const client = await pool.connect();
    
    // Create placeholders for the query
    const placeholders = STATION_IDS.map((_, i) => `$${i + 1}`).join(',');
    
    const query = `
      SELECT 
        id,
        station_id,
        station_code,
        station_name,
        hydro_id,
        hydro_name,
        basin_id,
        basin_name,
        province_code,
        province,
        amphure_code,
        amphure,
        latitude,
        longitude,
        ground_level,
        data_source,
        status,
        created_at,
        updated_at
      FROM 
        telemetry_data_stations
      WHERE 
        station_id IN (${placeholders})
    `;
    
    const result = await client.query(query, STATION_IDS);
    client.release();
    
    console.log(`Found ${result.rows.length} stations in database matching the provided IDs`);
    return result.rows;
  } catch (error) {
    console.error('Error fetching stations from database:', error.message);
    return [];
  }
}

/**
 * Update station data in the database
 * @param {Object} station - Station data to update
 * @param {Object} existingData - Existing station data from database
 * @returns {Promise<boolean>} Success status
 */
async function updateStationInDatabase(station, existingData) {
  const client = await pool.connect();
  try {
    console.log(`Updating station ${station.station_id} (${station.station_name || existingData.station_name}) in database...`);

    // Start a transaction
    await client.query('BEGIN');
    
    // Build update query with only the fields that have new values
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    // Only update fields that have new values and are different from existing ones
    if (station.station_name && station.station_name !== existingData.station_name) {
      updates.push(`station_name = $${paramCount++}`);
      values.push(station.station_name);
    }
    
    if (station.station_code && station.station_code !== existingData.station_code) {
      updates.push(`station_code = $${paramCount++}`);
      values.push(station.station_code);
    }
    
    if (station.hydro_id !== undefined && station.hydro_id !== existingData.hydro_id) {
      updates.push(`hydro_id = $${paramCount++}`);
      values.push(station.hydro_id ? parseInt(station.hydro_id, 10) : null);
    }
    
    if (station.hydro_name && station.hydro_name !== existingData.hydro_name) {
      updates.push(`hydro_name = $${paramCount++}`);
      values.push(station.hydro_name);
    }
    
    if (station.basin_id !== undefined && station.basin_id !== existingData.basin_id) {
      updates.push(`basin_id = $${paramCount++}`);
      values.push(station.basin_id ? parseInt(station.basin_id, 10) : null);
    }
    
    if (station.basin_name && station.basin_name !== existingData.basin_name) {
      updates.push(`basin_name = $${paramCount++}`);
      values.push(station.basin_name);
    }
    
    if (station.province_code !== undefined && station.province_code !== existingData.province_code) {
      updates.push(`province_code = $${paramCount++}`);
      values.push(station.province_code ? parseInt(station.province_code, 10) : null);
    }
    
    if (station.province && station.province !== existingData.province) {
      updates.push(`province = $${paramCount++}`);
      values.push(station.province);
    }
    
    if (station.amphure_code !== undefined && station.amphure_code !== existingData.amphure_code) {
      updates.push(`amphure_code = $${paramCount++}`);
      values.push(station.amphure_code ? parseInt(station.amphure_code, 10) : null);
    }
    
    if (station.amphure && station.amphure !== existingData.amphure) {
      updates.push(`amphure = $${paramCount++}`);
      values.push(station.amphure);
    }
    
    if (station.latitude !== undefined && station.latitude !== existingData.latitude) {
      updates.push(`latitude = $${paramCount++}`);
      values.push(station.latitude ? parseFloat(station.latitude) : null);
    }
    
    if (station.longitude !== undefined && station.longitude !== existingData.longitude) {
      updates.push(`longitude = $${paramCount++}`);
      values.push(station.longitude ? parseFloat(station.longitude) : null);
    }
    
    if (station.ground_level !== undefined && station.ground_level !== existingData.ground_level) {
      updates.push(`ground_level = $${paramCount++}`);
      values.push(station.ground_level ? parseFloat(station.ground_level) : null);
    }
    
    // Always update updated_at timestamp
    updates.push(`updated_at = NOW()`);
    
    // If no fields to update, skip this station
    if (updates.length === 1) { // Only updated_at
      console.log(`No new data for station ${station.station_id}, skipping update.`);
      await client.query('COMMIT');
      return true;
    }
    
    // Add the record ID as the last parameter
    values.push(existingData.id);
    
    // Build and execute the update query
    const query = `
      UPDATE telemetry_data_stations 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id;
    `;
    
    const result = await client.query(query, values);
    const stationDbId = result.rows[0]?.id;
    
    // Commit transaction
    await client.query('COMMIT');
    
    if (stationDbId) {
      console.log(`Updated station ${station.station_id} in database with ID ${stationDbId}`);
      console.log('Updated fields:', updates.join(', '));
      return true;
    } else {
      console.error(`Failed to update station ${station.station_id}`);
      return false;
    }
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error(`Failed to update station ${station.station_id}:`, error.message);
    return false;
  } finally {
    client.release();
  }
}

/**
 * Format station object from API data
 * @param {Object} apiStation - Raw station data from API
 * @param {string} stationId - Station ID
 * @returns {Object} Formatted station object
 */
function formatStationObject(apiStation, stationId) {
  return {
    station_id: stationId,
    station_code: apiStation.stationcode || apiStation.stationid || null,
    station_name: apiStation.name || apiStation.stationname || null,
    hydro_id: apiStation.hydroid || null,
    hydro_name: apiStation.hydroname || null,
    basin_id: apiStation.basinid || null,
    basin_name: apiStation.basinname || null,
    province_code: apiStation.provincecode || null,
    province: apiStation.provincename || null,
    amphure_code: apiStation.amphurcode || null,
    amphure: apiStation.amphurname || null,
    latitude: apiStation.latitude || null,
    longitude: apiStation.longitude || null,
    ground_level: apiStation.GroundLevel || null
  };
}

/**
 * Print current vs. new information for a station
 * @param {Object} existingData - Current station data from database
 * @param {Object} newData - New station data from API
 */
function printStationChanges(existingData, newData) {
  console.log(`\nChanges for Station ID: ${existingData.station_id}`);
  console.log('----------------------------------------------');
  
  const fields = [
    { name: 'station_name', label: 'Station Name' },
    { name: 'station_code', label: 'Station Code' },
    { name: 'hydro_id', label: 'Hydro ID' },
    { name: 'hydro_name', label: 'Hydro Name' },
    { name: 'basin_id', label: 'Basin ID' },
    { name: 'basin_name', label: 'Basin Name' },
    { name: 'province_code', label: 'Province Code' },
    { name: 'province', label: 'Province' },
    { name: 'amphure_code', label: 'Amphure Code' },
    { name: 'amphure', label: 'Amphure' },
    { name: 'latitude', label: 'Latitude' },
    { name: 'longitude', label: 'Longitude' },
    { name: 'ground_level', label: 'Ground Level' }
  ];
  
  let hasChanges = false;
  
  for (const field of fields) {
    const currentValue = existingData[field.name];
    const newValue = newData[field.name];
    
    // Skip if both values are null/undefined
    if (currentValue === null && newValue === null) continue;
    if (currentValue === undefined && newValue === undefined) continue;
    
    // Check if values are different
    if (currentValue !== newValue) {
      console.log(`${field.label}:`);
      console.log(`  Current: ${currentValue === null ? 'null' : currentValue}`);
      console.log(`  New:     ${newValue === null ? 'null' : newValue}`);
      hasChanges = true;
    }
  }
  
  if (!hasChanges) {
    console.log('No changes detected for this station.');
  }
}

/**
 * Main function to fetch and update station data
 */
async function main() {
  console.log('=== RID Telemetry Stations Update Tool ===');
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log(`Will update data for station IDs: ${STATION_IDS.join(', ')}`);
  
  try {
    // Get existing stations from database
    const dbStations = await getStationsFromDatabase();
    
    // Create a map of station IDs to database records
    const dbStationsMap = new Map();
    for (const station of dbStations) {
      dbStationsMap.set(station.station_id, station);
    }
    
    // Check if any stations are missing from the database
    const missingStationIds = STATION_IDS.filter(id => !dbStationsMap.has(id));
    if (missingStationIds.length > 0) {
      console.warn(`Warning: The following station IDs were not found in the database: ${missingStationIds.join(', ')}`);
      console.warn('These stations will be skipped. Please verify the station IDs are correct.');
    }
    
    // Fetch data from API for all hydro regions (1-11)
    const allApiStations = [];
    for (let hydroId = 1; hydroId <= 11; hydroId++) {
      const apiStations = await getStationsFromRidApi(ENDPOINTS.getHourlyStationList, hydroId);
      if (apiStations && apiStations.length > 0) {
        allApiStations.push(...apiStations);
      }
    }
    
    console.log(`Successfully fetched ${allApiStations.length} total stations from API`);
    
    // Save raw API data to file for reference
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    fs.writeFileSync(`telemetry_stations_api_raw_${timestamp}.json`, JSON.stringify(allApiStations, null, 2));
    console.log(`Saved raw API data to telemetry_stations_api_raw_${timestamp}.json`);
    
    // Create a map to efficiently look up stations from API data
    // Many RID stations have numeric IDs in stationid field, others are in special format like "S.41"
    const apiStationsMap = new Map();
    for (const station of allApiStations) {
      // Try to extract numeric ID if station ID is in format "X.123"
      if (station.stationid) {
        const match = station.stationid.match(/[A-Za-z]+\.(\d+[A-Za-z]?)/);
        if (match && match[1]) {
          apiStationsMap.set(match[1], station);
        } else if (/^\d+$/.test(station.stationid)) {
          // For purely numeric station IDs
          apiStationsMap.set(station.stationid, station);
        }
      }
      
      // Also map by raw station ID
      if (station.stationid) {
        apiStationsMap.set(station.stationid, station);
      }
    }
    
    // Process each existing station
    let updatedCount = 0;
    let unchangedCount = 0;
    let errorCount = 0;
    
    // Store detailed update results
    const updateResults = [];
    
    for (const stationId of STATION_IDS) {
      // Skip if station is not in the database
      if (!dbStationsMap.has(stationId)) {
        console.log(`\nSkipping station ID: ${stationId} - Not found in the database`);
        continue;
      }
      
      const existingData = dbStationsMap.get(stationId);
      console.log(`\nProcessing station ID: ${stationId} (${existingData.station_name || 'Unknown Name'})`);
      
      // Look for station in API data
      const apiStation = apiStationsMap.get(stationId);
      
      if (apiStation) {
        console.log(`Found station ${stationId} in API data: ${apiStation.stationid} - ${apiStation.name || apiStation.stationname || 'No name'}`);
        
        // Format station data
        const stationData = formatStationObject(apiStation, stationId);
        
        // Print changes that will be made
        printStationChanges(existingData, stationData);
        
        // Update database
        const success = await updateStationInDatabase(stationData, existingData);
        if (success) {
          updatedCount++;
          updateResults.push({
            station_id: stationId,
            status: 'updated',
            old_data: existingData,
            new_data: stationData
          });
        } else {
          errorCount++;
          updateResults.push({
            station_id: stationId,
            status: 'error',
            message: 'Failed to update in database'
          });
        }
      } else {
        console.log(`Station ${stationId} not found in API data. No updates will be made.`);
        unchangedCount++;
        updateResults.push({
          station_id: stationId,
          status: 'not_found_in_api',
          message: 'Station not found in API data'
        });
      }
    }
    
    // Save detailed update results to file
    fs.writeFileSync(`telemetry_stations_update_results_${timestamp}.json`, JSON.stringify(updateResults, null, 2));
    console.log(`\nDetailed update results saved to telemetry_stations_update_results_${timestamp}.json`);
    
    // Print final summary
    console.log('\n=== Update Summary ===');
    console.log(`Completed at: ${new Date().toISOString()}`);
    console.log(`Total stations processed: ${STATION_IDS.length - missingStationIds.length}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Unchanged (not found in API): ${unchangedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Skipped (not found in database): ${missingStationIds.length}`);
    
    console.log('\nUpdate completed.');
  } catch (error) {
    console.error('Error in main function:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('Database connection closed.');
  }
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
}); 