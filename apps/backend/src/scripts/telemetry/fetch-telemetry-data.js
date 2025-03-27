import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import pkg from 'pg';
const { Pool } = pkg;
import axios from 'axios';
import fs from 'fs';
import https from 'https';
import crypto from 'crypto';

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

// Get current file's directory path in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend .env file
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// API configuration
const RID_API_BASE_URL = 'http://hyd-app.rid.go.th/webservice';
const RID_API_SERVICE = `${RID_API_BASE_URL}/HydroAuthenticateService.svc`;
const TELEMETRY_ENDPOINT = `${RID_API_SERVICE}/getHourlyTodayFromStationID`;

// Consumer credentials from environment variables
const CONSUMER_KEY = process.env.RID_CONSUMER_KEY || '38b992bd1c9d445ba5305bc90edd2b4a';
const CONSUMER_SECRET = process.env.RID_CONSUMER_SECRET || '1974b85763c2496d80911b48dfbb53af';

// Database connection configuration
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
});

// Function to format date for API request
function formatDateForAPI(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Percent-encodes a string according to OAuth 1.0a spec
 */
function percentEncode(str) {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
}

/**
 * Generate OAuth 1.0 signature using the approach from the API documentation
 */
function generateSignedUrl(url, method, requestBody) {
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

  // Add request body parameters
  if (requestBody?.hydro) {
    Object.entries(requestBody.hydro).forEach(([key, value]) => {
      oauthParams[`hydro.${key}`] = String(value);
    });
  }
  
  // Create parameter string
  const paramString = Object.entries(oauthParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${percentEncode(key)}=${percentEncode(value)}`)
    .join('&');
  
  // Create signature base string
  const signatureBaseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(paramString)
  ].join('&');
  
  // Create signing key
  const signingKey = `${CONSUMER_SECRET}&`;
  
  // Generate signature
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBaseString)
    .digest('base64');
  
  // Create signed URL
  return `${url}?${paramString}&oauth_signature=${percentEncode(signature)}`;
}

// Function to fetch telemetry data for a specific station
async function fetchTelemetryData(stationId, date) {
  try {
    console.log(`Fetching telemetry data for station ${stationId} on ${date.toISOString().split('T')[0]}...`);
    
    // Format date in Thai Buddhist calendar format (dd/MM/yyyy)
    const now = new Date();
    const buddhistYear = now.getFullYear() + 543;
    const time_start = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${buddhistYear}`;
    
    // Prepare request body
    const requestBody = {
      hydro: {
        StationID: stationId,
        TimeStart: time_start
      }
    };
    
    console.log('Request Body:', JSON.stringify(requestBody, null, 2));
    
    // Create axios instance with SSL verification disabled
    const axiosInstance = axios.create({
      httpsAgent: new https.Agent({
        rejectUnauthorized: false // Allow self-signed certificates
      }),
      timeout: 30000,
      validateStatus: () => true
    });
    
    // Make API request
    const signedUrl = generateSignedUrl(TELEMETRY_ENDPOINT, 'POST', requestBody);
    console.log('Signed URL:', signedUrl);

    const response = await axiosInstance.post(
      signedUrl,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'RID-Telemetry-Client/1.0'
        }
      }
    );
    
    // Log response details for debugging
    console.log('Response Status:', response.status, response.statusText);
    console.log('Response Headers:', JSON.stringify(response.headers, null, 2));
    if (response.data) {
      console.log('Response Data:', typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2));
    }
    
    // Check response status
    if (response.status !== 200) {
      throw new Error(`Failed to fetch telemetry data: HTTP ${response.status} ${response.statusText}`);
    }
    
    // Parse response data
    let telemetryData = response.data;
    if (typeof telemetryData === 'string') {
      try {
        telemetryData = JSON.parse(telemetryData);
      } catch (parseErr) {
        throw new Error(`Failed to parse telemetry data: ${parseErr.message}`);
      }
    }
    
    // Save raw data to file for debugging
    const fileTimestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `telemetry_${stationId}_${fileTimestamp}.json`;
    fs.writeFileSync(filename, JSON.stringify(telemetryData, null, 2));
    console.log(`Saved raw telemetry data to ${filename}`);
    
    return telemetryData;
  } catch (error) {
    console.error('Error fetching telemetry data for station', stationId, ':', error.message);
    throw error;
  }
}

// Function to save telemetry data to database
async function saveTelemetryData(stationId, telemetryData) {
  if (!telemetryData || telemetryData.length === 0) {
    console.warn(`No telemetry data to save for station ${stationId}`);
    return;
  }
  
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
    console.log(`- Saved: ${savedCount}`);
    console.log(`- Skipped: ${skippedCount}`);
    console.log(`- Errors: ${errorCount}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Error saving telemetry data for station ${stationId}:`, error.message);
  } finally {
    client.release();
  }
}

// Main execution
async function main() {
  try {
    // Get station ID from command line arguments
    const stationId = process.argv[2];
    if (!stationId) {
      console.error('Please provide a station ID');
      process.exit(1);
    }
    
    // Get optional date from command line arguments (--date YYYY-MM-DD)
    let date = new Date();
    const dateArgIndex = process.argv.indexOf('--date');
    if (dateArgIndex > -1 && process.argv[dateArgIndex + 1]) {
      date = new Date(process.argv[dateArgIndex + 1]);
      if (isNaN(date.getTime())) {
        console.error('Invalid date format. Please use YYYY-MM-DD');
        process.exit(1);
      }
    }
    
    // Fetch telemetry data
    const telemetryData = await fetchTelemetryData(stationId, date);
    if (!telemetryData) {
      console.error('Failed to fetch telemetry data');
      process.exit(1);
    }
    
    // Save telemetry data to database
    await saveTelemetryData(stationId, telemetryData);
  } catch (error) {
    console.error('Error in main execution:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
main(); 