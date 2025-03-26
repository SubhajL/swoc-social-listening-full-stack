#!/usr/bin/env node

/**
 * RID Telemetry Data Fetch By Hydro ID Script
 * 
 * This script fetches telemetry data from the RID API for all stations in a given hydro region 
 * and stores it in the database.
 * It implements OAuth 1.0a authentication, proper error handling, and data validation.
 * 
 * Usage:
 *   node fetch-telemetry-data-by-hydroid.js [hydro_id] [--date YYYY-MM-DD]
 * 
 * Options:
 *   hydro_id: Numeric hydro region ID to fetch data for (e.g., "1", "2", "3", "4", "5", "6", "7", "8")
 *   --date: Fetch data for a specific date (default: today)
 * 
 * Examples:
 *   node fetch-telemetry-data-by-hydroid.js 1
 *   node fetch-telemetry-data-by-hydroid.js 2 --date 2025-03-20
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
  const fs = require('fs');
} catch (err) {
  console.error(`Error loading dependencies: ${err.message}`);
  console.error('Make sure to install required dependencies:');
  console.error('  cd scripts && npm install dotenv path pg axios fs');
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

// API configuration
const RID_API_BASE_URL = 'http://hyd-app.rid.go.th/webservice';
const RID_API_SERVICE = `${RID_API_BASE_URL}/HydroAuthenticateService.svc`;

// Using the hydro ID endpoint directly
const TELEMETRY_BY_HYDRO_ENDPOINT = `${RID_API_SERVICE}/getHourlyTodayFromHydroID`;

// Consumer credentials - fix issue where environment variables might have extra text
const rawConsumerKey = process.env.RID_CONSUMER_KEY || '38b992bd1c9d445ba5305bc90edd2b4a';
const rawConsumerSecret = process.env.RID_CONSUMER_SECRET || '1974b85763c2496d80911b48dfbb53af';

// Clean up the keys by ensuring we only use the expected length characters
const CONSUMER_KEY = rawConsumerKey.substring(0, 32);
const CONSUMER_SECRET = rawConsumerSecret.substring(0, 32);

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Print script usage
function printUsage() {
  console.log('Usage: node fetch-telemetry-data-by-hydroid.js [hydro_id] [--date YYYY-MM-DD]');
  console.log('');
  console.log('Options:');
  console.log('  hydro_id: Numeric hydro region ID to fetch data for (1-8)');
  console.log('  --date: Fetch data for a specific date (default: today)');
  console.log('');
  console.log('Examples:');
  console.log('  node fetch-telemetry-data-by-hydroid.js 1');
  console.log('  node fetch-telemetry-data-by-hydroid.js 2 --date 2025-03-20');
}

// Generate random nonce
function generateNonce() {
  return crypto.randomBytes(16).toString('hex');
}

// Format date in Thai Buddhist calendar format (dd/MM/yyyy)
function formatDateForAPI(date) {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const yearCE = date.getFullYear();
  const yearBE = yearCE + 543; // Convert CE to Buddhist Era
  
  return `${day}/${month}/${yearBE}`;
}

/**
 * Generate OAuth 1.0 signature using the approach from the API documentation
 * Based on test-rid-api-alt.ts
 */
function generateOAuthSignature(url, method) {
  // Generate timestamp and nonce
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString('hex');
  
  // Create OAuth parameters
  const oauthParams = {
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

// Function to fetch telemetry data for a specific hydro ID
async function fetchTelemetryDataByHydroId(hydroId, date) {
  try {
    console.log(`Fetching telemetry data for hydro ID ${hydroId} on ${date.toISOString().split('T')[0]}...`);
    
    // Format date for API
    const formattedDate = formatDateForAPI(date);
    
    // Prepare request body
    const requestBody = {
      hydro: {
        hydroid: String(hydroId),
        TimeStart: formattedDate
      }
    };
    
    console.log('Request Body:', JSON.stringify(requestBody, null, 2));
    
    // Generate OAuth signature
    const { signedUrl, authHeader } = generateOAuthSignature(TELEMETRY_BY_HYDRO_ENDPOINT, 'POST');
    
    // Make API request using signed URL
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
    
    console.log('Response Status:', response.status, response.statusText || '');
    
    // Check for HTTP errors
    if (response.status !== 200) {
      console.error(`Error fetching telemetry data for hydro ID ${hydroId}: HTTP ${response.status}`);
      if (response.data) {
        console.error('Response Data:', typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2));
      }
      return null;
    }
    
    // Parse response data
    let telemetryData;
    if (typeof response.data === 'string') {
      try {
        telemetryData = JSON.parse(response.data);
      } catch (parseErr) {
        console.error('Error parsing JSON response:', parseErr.message);
        return null;
      }
    } else {
      telemetryData = response.data;
    }
    
    if (!Array.isArray(telemetryData)) {
      console.error(`Invalid response format for hydro ID ${hydroId}:`, telemetryData);
      return null;
    }
    
    console.log(`Successfully fetched ${telemetryData.length} telemetry records for hydro ID ${hydroId}`);
    
    // Save raw data to file for debugging
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `hydro_${hydroId}_telemetry_${timestamp}.json`;
    fs.writeFileSync(filename, JSON.stringify(telemetryData, null, 2));
    console.log(`Saved raw telemetry data to ${filename}`);
    
    return telemetryData;
  } catch (error) {
    console.error(`Failed to fetch telemetry data for hydro ID ${hydroId}:`, error.message);
    return null;
  }
}

// Group telemetry data by station ID
function groupTelemetryDataByStation(telemetryData) {
  const stationMap = new Map();
  
  for (const reading of telemetryData) {
    const stationId = reading.stationid;
    if (!stationId) continue;
    
    if (!stationMap.has(stationId)) {
      stationMap.set(stationId, []);
    }
    
    stationMap.get(stationId).push(reading);
  }
  
  return stationMap;
}

// Function to save telemetry data to database
async function saveTelemetryData(stationId, telemetryData, hydroId) {
  if (!telemetryData || telemetryData.length === 0) {
    console.error(`No telemetry data to save for station ${stationId}`);
    return {
      stationId,
      total: 0,
      saved: 0,
      skipped: 0,
      errors: 0
    };
  }
  
  try {
    console.log(`Saving ${telemetryData.length} telemetry records for station ${stationId} to database...`);
    
    // Begin transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // First make sure the station exists in telemetry_data_stations table
      await ensureStationExists(client, stationId, hydroId);
      
      let savedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      
      for (const reading of telemetryData) {
        try {
          // Extract telemetry reading data
          const {
            stationid,
            hourlytime,
            hourlytimeUTC,
            wlvalues,
            wlvaluesabove,
            qvalues,
            qavrvalues,
            notationid
          } = reading;
          
          // Parse dates
          let readingTime;
          let readingTimeUtc;
          
          try {
            // Handle date format from RID API which looks like "/Date(1742580000000+0700)/"
            if (hourlytime && hourlytime.includes('Date(')) {
              const timestamp = parseInt(hourlytime.replace(/^\/Date\((\d+).*\)\/$/, '$1'), 10);
              readingTime = new Date(timestamp);
            } else {
              readingTime = hourlytime ? new Date(hourlytime) : null;
            }
            
            if (hourlytimeUTC && hourlytimeUTC.includes('Date(')) {
              const timestamp = parseInt(hourlytimeUTC.replace(/^\/Date\((\d+).*\)\/$/, '$1'), 10);
              readingTimeUtc = new Date(timestamp);
            } else {
              readingTimeUtc = hourlytimeUTC ? new Date(hourlytimeUTC) : null;
            }
          } catch (dateError) {
            console.error(`Error parsing date for station ${stationId}:`, dateError.message);
            console.error('Date strings:', { hourlytime, hourlytimeUTC });
            skippedCount++;
            continue;
          }
          
          if (!readingTime || isNaN(readingTime.getTime())) {
            console.warn(`Invalid reading time for station ${stationId}:`, hourlytime);
            skippedCount++;
            continue;
          }
          
          // Insert reading into telemetry_data table
          const query = `
            INSERT INTO telemetry_data (
              station_id, reading_time, reading_time_utc, 
              water_level, water_level_above, flow_rate, 
              average_flow_rate, notation_id, source
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (station_id, reading_time) DO UPDATE SET
              water_level = EXCLUDED.water_level,
              water_level_above = EXCLUDED.water_level_above,
              flow_rate = EXCLUDED.flow_rate,
              average_flow_rate = EXCLUDED.average_flow_rate,
              notation_id = EXCLUDED.notation_id,
              updated_at = NOW()
            RETURNING id;
          `;
          
          const values = [
            stationId,
            readingTime,
            readingTimeUtc,
            wlvalues !== undefined ? parseFloat(wlvalues) : null,
            wlvaluesabove !== undefined ? parseFloat(wlvaluesabove) : null,
            qvalues !== undefined ? parseFloat(qvalues) : null,
            qavrvalues !== undefined ? parseFloat(qavrvalues) : null,
            notationid !== undefined ? parseInt(notationid, 10) : null,
            'RID API - HydroID ' + hydroId
          ];
          
          const result = await client.query(query, values);
          const readingId = result.rows[0]?.id;
          
          if (readingId) {
            savedCount++;
          } else {
            console.warn(`Failed to save reading for station ${stationId} at ${readingTime}`);
            skippedCount++;
          }
        } catch (readingError) {
          console.error(`Error saving reading for station ${stationId}:`, readingError.message);
          errorCount++;
        }
      }
      
      // Commit transaction
      await client.query('COMMIT');
      
      console.log(`Telemetry data save completed for station ${stationId}:`);
      console.log(`  - Total readings: ${telemetryData.length}`);
      console.log(`  - Successfully saved: ${savedCount}`);
      console.log(`  - Skipped: ${skippedCount}`);
      console.log(`  - Errors: ${errorCount}`);
      
      return {
        stationId,
        total: telemetryData.length,
        saved: savedCount,
        skipped: skippedCount,
        errors: errorCount
      };
    } catch (transactionError) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      console.error(`Transaction failed for station ${stationId}:`, transactionError.message);
      return {
        stationId,
        total: telemetryData.length,
        saved: 0,
        skipped: 0,
        errors: telemetryData.length
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`Failed to save telemetry data for station ${stationId}:`, error.message);
    return {
      stationId,
      total: telemetryData.length,
      saved: 0,
      skipped: 0,
      errors: telemetryData.length
    };
  }
}

// Function to ensure the station exists in the database
async function ensureStationExists(client, stationId, hydroId) {
  if (!stationId) return false;
  
  try {
    // First check if station exists
    const checkQuery = `
      SELECT id FROM telemetry_data_stations 
      WHERE station_id = $1
    `;
    
    const checkResult = await client.query(checkQuery, [stationId]);
    
    if (checkResult.rows.length > 0) {
      return true; // Station exists
    }
    
    // Station doesn't exist, insert it
    const insertQuery = `
      INSERT INTO telemetry_data_stations (
        station_id, station_code, station_name,
        hydro_id, show_hourly_report, show_daily_report, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;
    
    const values = [
      stationId,                               // station_id
      `S.${stationId}`,                        // station_code
      `Station ${stationId}`,                  // station_name
      hydroId ? parseInt(hydroId, 10) : null,  // hydro_id
      true,                                    // show_hourly_report
      true,                                    // show_daily_report
      'active'                                 // status
    ];
    
    const insertResult = await client.query(insertQuery, values);
    
    if (insertResult.rows.length > 0) {
      console.log(`Created new station record for ${stationId}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error ensuring station exists for ${stationId}:`, error.message);
    return false;
  }
}

// Process telemetry data for all stations in a hydro region
async function processTelemetryDataByHydroId(hydroId, telemetryData) {
  // Group telemetry data by station ID
  const stationMap = groupTelemetryDataByStation(telemetryData);
  
  console.log(`Found data for ${stationMap.size} stations in hydro ID ${hydroId}`);
  
  // Process each station
  const results = [];
  
  for (const [stationId, stationData] of stationMap.entries()) {
    try {
      console.log(`\n--- Processing station ${stationId} ---`);
      
      if (stationData.length === 0) {
        console.log(`No telemetry data found for station ${stationId}`);
        results.push({
          stationId,
          success: false,
          message: 'No data found'
        });
        continue;
      }
      
      // Save telemetry data to database
      const saveResult = await saveTelemetryData(stationId, stationData, hydroId);
      
      results.push({
        stationId,
        success: saveResult.saved > 0,
        total: saveResult.total,
        saved: saveResult.saved,
        skipped: saveResult.skipped,
        errors: saveResult.errors
      });
    } catch (error) {
      console.error(`Error processing station ${stationId}:`, error.message);
      results.push({
        stationId,
        success: false,
        message: error.message
      });
    }
  }
  
  return results;
}

// Main function
async function main() {
  try {
    console.log('=== RID Telemetry Data Fetch By Hydro ID Script ===');
    console.log(`Started at: ${new Date().toISOString()}`);
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    let hydroId = null;
    let date = new Date();
    
    // Check for --help flag
    if (args.includes('--help') || args.includes('-h')) {
      printUsage();
      process.exit(0);
    }
    
    // Get hydro ID
    if (args.length > 0 && !args[0].startsWith('--')) {
      hydroId = args[0];
    } else {
      console.error('Error: No hydro ID provided');
      printUsage();
      process.exit(1);
    }
    
    // Check for --date flag
    const dateIndex = args.indexOf('--date');
    if (dateIndex !== -1 && dateIndex + 1 < args.length) {
      const dateString = args[dateIndex + 1];
      const parsedDate = new Date(dateString);
      
      if (!isNaN(parsedDate.getTime())) {
        date = parsedDate;
        console.log(`Will fetch data for date: ${date.toISOString().split('T')[0]}`);
      } else {
        console.error(`Invalid date format: ${dateString}`);
        console.error('Please use YYYY-MM-DD format');
        process.exit(1);
      }
    }
    
    // Fetch telemetry data for the given hydro ID
    const telemetryData = await fetchTelemetryDataByHydroId(hydroId, date);
    
    if (!telemetryData || telemetryData.length === 0) {
      console.error(`No telemetry data found for hydro ID ${hydroId}`);
      process.exit(1);
    }
    
    // Process the telemetry data
    const results = await processTelemetryDataByHydroId(hydroId, telemetryData);
    
    // Print final summary
    console.log('\n=== Fetch Summary ===');
    console.log(`Completed at: ${new Date().toISOString()}`);
    
    let totalReadings = 0;
    let totalSaved = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    let successCount = 0;
    let failureCount = 0;
    
    for (const result of results) {
      if (result.success) {
        console.log(`Station ${result.stationId}: ${result.saved}/${result.total} readings saved`);
        totalReadings += result.total || 0;
        totalSaved += result.saved || 0;
        totalSkipped += result.skipped || 0;
        totalErrors += result.errors || 0;
        successCount++;
      } else {
        console.log(`Station ${result.stationId}: ${result.message || 'Failed'}`);
        failureCount++;
      }
    }
    
    console.log(`\nTotal stations processed: ${results.length}`);
    console.log(`Successful: ${successCount} (${Math.round(successCount / results.length * 100)}%)`);
    console.log(`Failed: ${failureCount} (${Math.round(failureCount / results.length * 100)}%)`);
    
    if (totalReadings > 0) {
      console.log(`\nTotal readings: ${totalReadings}`);
      console.log(`Successfully saved: ${totalSaved} (${Math.round(totalSaved / totalReadings * 100)}%)`);
      console.log(`Skipped: ${totalSkipped} (${Math.round(totalSkipped / totalReadings * 100)}%)`);
      console.log(`Errors: ${totalErrors} (${Math.round(totalErrors / totalReadings * 100)}%)`);
    }
    
    console.log('\nFetch completed successfully.');
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