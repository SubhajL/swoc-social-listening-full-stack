#!/usr/bin/env node

/**
 * RID Telemetry Data Fetch Script
 * 
 * This script fetches telemetry data from the RID API for specified stations and stores it in the database.
 * It implements OAuth 1.0a authentication, proper error handling, and data validation.
 * 
 * Usage:
 *   node fetch-telemetry-data-clone.js [station_id] [--all] [--date YYYY-MM-DD]
 * 
 * Options:
 *   station_id: Numeric station ID to fetch data for (e.g., "7", "669")
 *   --all: Fetch data for all stations in the telemetry_data_stations table
 *   --date: Fetch data for a specific date (default: today)
 * 
 * Examples:
 *   node fetch-telemetry-data-clone.js 7
 *   node fetch-telemetry-data-clone.js --all
 *   node fetch-telemetry-data-clone.js 669 --date 2025-03-20
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

// API configuration
const RID_API_BASE_URL = 'http://hyd-app.rid.go.th/webservice';
const RID_API_SERVICE = `${RID_API_BASE_URL}/HydroAuthenticateService.svc`;
const TELEMETRY_ENDPOINT = `${RID_API_SERVICE}/getHourlyTodayFromStationID`;

// Consumer credentials - Fix issue where environment variables might have extra text
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
  console.log('Usage: node fetch-telemetry-data-clone.js [station_id] [--all] [--date YYYY-MM-DD]');
  console.log('');
  console.log('Options:');
  console.log('  station_id: Numeric station ID to fetch data for (e.g., "7", "669")');
  console.log('  --all: Fetch data for all stations in the telemetry_data_stations table');
  console.log('  --date: Fetch data for a specific date (default: today)');
  console.log('');
  console.log('Examples:');
  console.log('  node fetch-telemetry-data-clone.js 7');
  console.log('  node fetch-telemetry-data-clone.js --all');
  console.log('  node fetch-telemetry-data-clone.js 669 --date 2025-03-20');
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
 * Direct copy from test-rid-api-alt.ts to ensure consistency
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

// Function to get all stations from database
async function getAllStations() {
  try {
    console.log('Fetching all active telemetry stations from database...');
    
    const query = `
      SELECT station_id, station_code, station_name 
      FROM telemetry_data_stations
      WHERE status = 'active'
      AND (show_hourly_report = true OR show_daily_report = true)
    `;
    
    const result = await pool.query(query);
    console.log(`Found ${result.rows.length} active telemetry stations in database`);
    
    return result.rows;
  } catch (error) {
    console.error('Error fetching stations from database:', error.message);
    return [];
  }
}

// Function to fetch telemetry data for a specific station
async function fetchTelemetryData(stationId, date) {
  try {
    console.log(`Fetching telemetry data for station ${stationId} on ${date.toISOString().split('T')[0]}...`);
    
    // Format date for API
    const formattedDate = formatDateForAPI(date);
    
    // Prepare request body - always use stringified stationId
    const requestBody = {
      hydro: {
        stationid: String(stationId),
        TimeStart: formattedDate
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
    
    let telemetryData = null;
    
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
      
      console.log('Response Status (Approach 1):', response1.status, response1.statusText || '');
      console.log('Response Headers (Approach 1):', JSON.stringify(response1.headers, null, 2));
      
      if (response1.status === 200) {
        // Parse response data if needed
        telemetryData = response1.data;
        
        if (typeof telemetryData === 'string' && telemetryData.trim()) {
          try {
            telemetryData = JSON.parse(telemetryData);
          } catch (parseErr) {
            console.error('Error parsing JSON response:', parseErr.message);
          }
        }
        
        console.log('Response Data (Approach 1) - First few records:', 
          Array.isArray(telemetryData) && telemetryData.length > 0 
            ? JSON.stringify(telemetryData.slice(0, 2), null, 2) 
            : (typeof telemetryData === 'string' ? telemetryData : JSON.stringify(telemetryData, null, 2)));
            
        // Save raw data to file for debugging
        const fileTimestamp = new Date().toISOString().replace(/:/g, '-');
        const filename = `telemetry_${stationId}_${fileTimestamp}.json`;
        fs.writeFileSync(filename, JSON.stringify(telemetryData, null, 2));
        console.log(`Saved raw telemetry data to ${filename}`);
      } else {
        console.error(`Error in Approach 1: HTTP ${response1.status}`);
      }
    } catch (error) {
      console.error('Error in Approach 1:', error.message);
    }
    
    // If approach 1 failed, try approach 2
    if (!telemetryData) {
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
        
        console.log('Response Status (Approach 2):', response2.status, response2.statusText || '');
        console.log('Response Headers (Approach 2):', JSON.stringify(response2.headers, null, 2));
        
        if (response2.status === 200) {
          // Parse response data if needed
          telemetryData = response2.data;
          
          if (typeof telemetryData === 'string' && telemetryData.trim()) {
            try {
              telemetryData = JSON.parse(telemetryData);
            } catch (parseErr) {
              console.error('Error parsing JSON response:', parseErr.message);
            }
          }
          
          console.log('Response Data (Approach 2) - First few records:', 
            Array.isArray(telemetryData) && telemetryData.length > 0 
              ? JSON.stringify(telemetryData.slice(0, 2), null, 2) 
              : (typeof telemetryData === 'string' ? telemetryData : JSON.stringify(telemetryData, null, 2)));
              
          // Save raw data to file for debugging
          const fileTimestamp = new Date().toISOString().replace(/:/g, '-');
          const filename = `telemetry_${stationId}_${fileTimestamp}.json`;
          fs.writeFileSync(filename, JSON.stringify(telemetryData, null, 2));
          console.log(`Saved raw telemetry data to ${filename}`);
        } else {
          console.error(`Error in Approach 2: HTTP ${response2.status}`);
        }
      } catch (error) {
        console.error('Error in Approach 2:', error.message);
      }
    }
    
    // Check if we got any data from either approach
    if (!telemetryData) {
      console.log(`No telemetry data found for station ${stationId}`);
      return [];
    }
    
    // Validate data format
    if (!Array.isArray(telemetryData)) {
      console.error(`Invalid response format for station ${stationId}, expected array but got:`, typeof telemetryData);
      return [];
    }
    
    if (telemetryData.length === 0) {
      console.log(`No telemetry records found for station ${stationId}`);
      return [];
    }
    
    console.log(`Successfully fetched ${telemetryData.length} telemetry records for station ${stationId}`);
    return telemetryData;
  } catch (error) {
    console.error(`Failed to fetch telemetry data for station ${stationId}:`, error.message);
    return [];
  }
}

// Function to save telemetry data to database
async function saveTelemetryData(stationId, telemetryData) {
  try {
    console.log(`Saving ${telemetryData.length} telemetry records for station ${stationId} to database...`);
    
    // Begin transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
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
            'RID API'
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

// Process a single station
async function processStation(stationId, date) {
  try {
    console.log(`\n--- Processing station ${stationId} ---`);
    
    // Fetch telemetry data
    const telemetryData = await fetchTelemetryData(stationId, date);
    
    if (!telemetryData || telemetryData.length === 0) {
      console.log(`No telemetry data found for station ${stationId}`);
      return {
        stationId,
        success: false,
        message: 'No data found'
      };
    }
    
    // Save telemetry data to database
    const saveResult = await saveTelemetryData(stationId, telemetryData);
    
    return {
      stationId,
      success: saveResult.saved > 0,
      total: saveResult.total,
      saved: saveResult.saved,
      skipped: saveResult.skipped,
      errors: saveResult.errors
    };
  } catch (error) {
    console.error(`Error processing station ${stationId}:`, error.message);
    return {
      stationId,
      success: false,
      message: error.message
    };
  }
}

// Main function
async function main() {
  try {
    console.log('=== RID Telemetry Data Fetch Script ===');
    console.log(`Started at: ${new Date().toISOString()}`);
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    let stationIds = [];
    let fetchAll = false;
    let date = new Date();
    
    // Check for --help flag
    if (args.includes('--help') || args.includes('-h')) {
      printUsage();
      process.exit(0);
    }
    
    // Check for --all flag
    if (args.includes('--all')) {
      fetchAll = true;
      console.log('Will fetch data for all active telemetry stations');
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
    
    // Get stations to process
    if (fetchAll) {
      // Fetch all active stations from database
      const allStations = await getAllStations();
      stationIds = allStations.map(station => station.station_id);
    } else if (args.length > 0 && !args[0].startsWith('--')) {
      // Use provided station ID
      stationIds = [args[0]];
    } else {
      console.error('Error: No station ID provided and --all flag not specified');
      printUsage();
      process.exit(1);
    }
    
    console.log(`Will fetch telemetry data for ${stationIds.length} stations: ${stationIds.join(', ')}`);
    
    // Process each station
    const results = [];
    
    for (const stationId of stationIds) {
      const result = await processStation(stationId, date);
      results.push(result);
    }
    
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