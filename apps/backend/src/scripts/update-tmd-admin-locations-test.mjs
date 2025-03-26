#!/usr/bin/env node

/**
 * TMD Station Administrative Locations Update Script - Test Version
 * 
 * This modified script:
 * 1. Tests updating 50 stations only
 * 2. Has additional error handling and debugging
 * 3. Reports database transaction status throughout the process
 */

import pg from 'pg';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { setTimeout } from 'timers/promises';

// Get the current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Configure console logging
const logToFile = true;
const logPath = path.join(__dirname, '../../../logs/tmd-admin-update-test.log');

/**
 * Enhanced logging function
 */
function enhancedLog(level, message, metadata = {}) {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    level,
    message,
    ...metadata
  };
  
  // Log to console
  console.log(`[${timestamp}] [${level}] ${message}`);
  if (Object.keys(metadata).length > 0) {
    console.log(JSON.stringify(metadata, null, 2));
  }
  
  // Log to file if enabled
  if (logToFile) {
    try {
      const dir = path.dirname(logPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.appendFileSync(
        logPath, 
        `[${timestamp}] [${level}] ${message} ${JSON.stringify(metadata)}\n`
      );
    } catch (error) {
      console.error('Error writing to log file:', error);
    }
  }
}

// Create log shortcuts
const logger = {
  info: (message, metadata) => enhancedLog('INFO', message, metadata),
  error: (message, metadata) => enhancedLog('ERROR', message, metadata),
  warn: (message, metadata) => enhancedLog('WARN', message, metadata),
  debug: (message, metadata) => enhancedLog('DEBUG', message, metadata)
};

// Google Maps API Key
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'ec2-18-143-195-184.ap-southeast-1.compute.amazonaws.com',
  port: parseInt(process.env.DB_PORT || '15435'),
  database: process.env.DB_NAME || 'swoc-uat-gis-ssl',
  user: process.env.DB_USER || 'swoc-uat-gis-ssl-user',
  password: process.env.DB_PASSWORD || '4c0b269f763d4ce1d1d59ba0e2ef1f9c',
  ssl: { rejectUnauthorized: false }
};

// Constants for Thailand geographic bounds
const THAILAND_BOUNDS = {
  minLat: 5.5,
  maxLat: 20.5,
  minLng: 97.5,
  maxLng: 105.5
};

// Global stats for tracking progress
let stats = {
  totalStationsProcessed: 0,
  stationsWithMissingLocations: 0,
  stationsUpdated: 0,
  stationsInGulf: 0,
  apiErrors: 0,
  otherErrors: 0,
  transactionFailures: 0
};

// Parse command line arguments
const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
const batchLimitArg = process.argv.find(arg => arg.startsWith('--batch='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 50;
const batchSize = batchLimitArg ? parseInt(batchLimitArg.split('=')[1]) : 50;

/**
 * Initialize database connection with retry capability
 */
async function initDatabase(retries = 3) {
  logger.info('Initializing database connection', { retries });
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const pool = new pg.Pool(dbConfig);
      
      // Test connection
      const client = await pool.connect();
      try {
        const result = await client.query('SELECT NOW() as time');
        logger.info('Database connection established', { 
          time: result.rows[0].time,
          poolSize: pool.totalCount,
          idleConnections: pool.idleCount,
          attempt 
        });
        
        return pool;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error(`Failed to connect to database (attempt ${attempt}/${retries})`, { error: error.message });
      
      if (attempt === retries) {
        throw error;
      }
      
      // Wait before retry
      await setTimeout(2000);
    }
  }
}

/**
 * Get TMD stations with missing administrative location information
 */
async function getStationsWithMissingLocations(pool, limit = 50) {
  logger.info('Fetching TMD stations with missing location information', { limit });
  
  try {
    // Query to find stations with missing administrative information but valid coordinates
    const query = `
      SELECT 
        tele_station_id,
        tele_station_name,
        tele_station_name_th,
        province,
        amphure,
        tambon,
        tele_station_lat as latitude,
        tele_station_long as longitude
      FROM thaiwater_tele_stations
      WHERE data_source = 'TMD'
        AND tele_station_lat IS NOT NULL 
        AND tele_station_long IS NOT NULL
        AND tele_station_lat != 0
        AND tele_station_long != 0
        AND (
          province IS NULL OR province = '' OR
          amphure IS NULL OR amphure = '' OR
          tambon IS NULL OR tambon = ''
        )
        AND tele_station_lat BETWEEN $1 AND $2
        AND tele_station_long BETWEEN $3 AND $4
      LIMIT $5
    `;
    
    const values = [
      THAILAND_BOUNDS.minLat,
      THAILAND_BOUNDS.maxLat,
      THAILAND_BOUNDS.minLng,
      THAILAND_BOUNDS.maxLng,
      limit
    ];
    
    const result = await pool.query(query, values);
    
    logger.info(`Found ${result.rows.length} TMD stations with missing location information`, {
      count: result.rows.length,
      sample: result.rows.length > 0 ? result.rows[0] : null
    });
    
    stats.stationsWithMissingLocations = result.rows.length;
    return result.rows;
  } catch (error) {
    logger.error('Failed to fetch TMD stations with missing locations', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Geocode coordinates to get administrative locations using Google Maps API
 */
async function geocodeCoordinates(lat, lng) {
  if (!GOOGLE_MAPS_API_KEY) {
    logger.error('Google Maps API key not found');
    throw new Error('Google Maps API key not configured');
  }
  
  try {
    logger.info(`Geocoding coordinates [${lat}, ${lng}]`);
    
    // Configure Google Maps API request
    // Filter for administrative areas in Thailand (language=th)
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}&language=th&result_type=administrative_area_level_1|administrative_area_level_2|administrative_area_level_3`;
    
    const response = await axios.get(url);
    
    if (response.data.status !== 'OK') {
      logger.error(`Geocoding API error: ${response.data.status}`, {
        error: response.data.error_message,
        coordinates: [lat, lng]
      });
      stats.apiErrors++;
      return null;
    }
    
    return processGeocodingResponse(response.data);
  } catch (error) {
    logger.error(`Error geocoding coordinates [${lat}, ${lng}]`, {
      error: error.message,
      stack: error.stack
    });
    stats.apiErrors++;
    return null;
  }
}

/**
 * Process Google Maps Geocoding API response
 */
function processGeocodingResponse(data) {
  if (!data.results || data.results.length === 0) {
    logger.warn('No results found in geocoding response');
    return null;
  }
  
  // Extract admin areas from results
  let province = null;
  let amphure = null;
  let tambon = null;
  
  for (const result of data.results) {
    for (const component of result.address_components) {
      if (component.types.includes('administrative_area_level_1')) {
        province = component.long_name;
        
        // Remove 'จังหวัด' prefix if present
        if (province.startsWith('จังหวัด')) {
          province = province.substring('จังหวัด'.length).trim();
        }
      } else if (component.types.includes('administrative_area_level_2')) {
        amphure = component.long_name;
        
        // Remove 'อำเภอ' or 'เขต' prefix if present
        if (amphure.startsWith('อำเภอ')) {
          amphure = amphure.substring('อำเภอ'.length).trim();
        } else if (amphure.startsWith('เขต')) {
          amphure = amphure.substring('เขต'.length).trim();
        }
      } else if (component.types.includes('administrative_area_level_3')) {
        tambon = component.long_name;
        
        // Remove 'ตำบล' or 'แขวง' prefix if present
        if (tambon.startsWith('ตำบล')) {
          tambon = tambon.substring('ตำบล'.length).trim();
        } else if (tambon.startsWith('แขวง')) {
          tambon = tambon.substring('แขวง'.length).trim();
        }
      }
    }
  }
  
  logger.debug(`Geocoding results: province=${province}, amphure=${amphure}, tambon=${tambon}`);
  
  return { province, amphure, tambon };
}

/**
 * Update a station with geocoded administrative locations
 */
async function updateStationLocations(client, stationId, locationData) {
  try {
    const { province, amphure, tambon } = locationData;
    
    if (!province && !amphure && !tambon) {
      logger.warn(`No location data to update for station ${stationId}`);
      return false;
    }
    
    // Update only non-null fields
    const updateFields = [];
    const values = [];
    let paramCounter = 1;
    
    if (province) {
      updateFields.push(`province = $${paramCounter++}`);
      values.push(province);
    }
    
    if (amphure) {
      updateFields.push(`amphure = $${paramCounter++}`);
      values.push(amphure);
    }
    
    if (tambon) {
      updateFields.push(`tambon = $${paramCounter++}`);
      values.push(tambon);
    }
    
    // Add updated_at timestamp
    updateFields.push(`updated_at = NOW()`);
    
    // Add station ID as the last parameter
    values.push(stationId);
    
    const query = `
      UPDATE thaiwater_tele_stations
      SET ${updateFields.join(', ')}
      WHERE tele_station_id = $${paramCounter}
      AND data_source = 'TMD'
      RETURNING tele_station_id, province, amphure, tambon
    `;
    
    // Log query details for debugging
    logger.debug(`Update query for station ${stationId}`, { 
      query,
      values,
      stationId 
    });
    
    const result = await client.query(query, values);
    
    if (result.rowCount > 0) {
      logger.info(`Updated station ${stationId} with province=${province}, amphure=${amphure}, tambon=${tambon}`, {
        updated: result.rows[0]
      });
      return true;
    } else {
      logger.warn(`Station ${stationId} not found or not updated`);
      return false;
    }
  } catch (error) {
    logger.error(`Error updating station ${stationId}`, {
      error: error.message,
      stack: error.stack
    });
    stats.otherErrors++;
    return false;
  }
}

/**
 * Process stations one at a time with individual transactions
 */
async function processStations(pool, stations) {
  const results = {
    success: 0,
    failure: 0
  };
  
  // Process stations one by one
  for (let i = 0; i < stations.length; i++) {
    const station = stations[i];
    
    logger.info(`Processing station ${i+1}/${stations.length}: ID=${station.tele_station_id}, Name=${station.tele_station_name || station.tele_station_name_th || 'Unknown'}`, {
      id: station.tele_station_id,
      name: station.tele_station_name || station.tele_station_name_th,
      coordinates: [station.latitude, station.longitude]
    });
    
    const client = await pool.connect();
    
    try {
      // Begin transaction for this station
      await client.query('BEGIN');
      logger.debug(`Started transaction for station ${station.tele_station_id}`);
      
      // Geocode the coordinates
      const locationData = await geocodeCoordinates(station.latitude, station.longitude);
      
      if (locationData) {
        // Update the station with the location data
        const updated = await updateStationLocations(client, station.tele_station_id, locationData);
        
        if (updated) {
          // Commit transaction
          await client.query('COMMIT');
          logger.debug(`Committed transaction for station ${station.tele_station_id}`);
          
          results.success++;
          stats.stationsUpdated++;
        } else {
          // Rollback if update failed
          await client.query('ROLLBACK');
          logger.debug(`Rolled back transaction for station ${station.tele_station_id} - update failed`);
          
          results.failure++;
        }
      } else {
        // Rollback if geocoding failed
        await client.query('ROLLBACK');
        logger.debug(`Rolled back transaction for station ${station.tele_station_id} - geocoding failed`);
        
        logger.warn(`No location data found for station ${station.tele_station_id}`);
        results.failure++;
      }
      
      // Add a delay to avoid hitting rate limits
      if (i < stations.length - 1) {
        await setTimeout(300); // 300ms delay between requests
      }
    } catch (error) {
      // Rollback transaction on error
      try {
        await client.query('ROLLBACK');
        logger.debug(`Rolled back transaction for station ${station.tele_station_id} due to error`);
      } catch (rollbackError) {
        logger.error(`Error rolling back transaction for station ${station.tele_station_id}`, {
          error: rollbackError.message
        });
      }
      
      logger.error(`Error processing station ${station.tele_station_id}`, {
        error: error.message,
        stack: error.stack
      });
      
      results.failure++;
      stats.otherErrors++;
      stats.transactionFailures++;
    } finally {
      client.release();
    }
    
    stats.totalStationsProcessed++;
  }
  
  return results;
}

/**
 * Verify updates by checking the database
 */
async function verifyUpdates(pool, stationIds) {
  if (stationIds.length === 0) return [];
  
  try {
    logger.info(`Verifying updates for ${stationIds.length} stations`);
    
    const query = `
      SELECT 
        tele_station_id,
        tele_station_name,
        tele_station_name_th,
        province,
        amphure,
        tambon,
        updated_at
      FROM thaiwater_tele_stations
      WHERE tele_station_id = ANY($1)
    `;
    
    const result = await pool.query(query, [stationIds]);
    
    const verifiedStations = result.rows.filter(
      s => s.province && s.province !== '' && 
           s.amphure && s.amphure !== '' && 
           s.tambon && s.tambon !== ''
    );
    
    logger.info(`Verification complete: ${verifiedStations.length}/${stationIds.length} stations have complete location data`);
    
    return verifiedStations;
  } catch (error) {
    logger.error('Error verifying updates', {
      error: error.message,
      stack: error.stack
    });
    return [];
  }
}

/**
 * Main function to run the script
 */
async function main() {
  logger.info('Starting TMD Admin Location Update Test Script', {
    targetLimit: limit,
    batchSize: batchSize
  });
  
  if (!GOOGLE_MAPS_API_KEY) {
    logger.error('Google Maps API key not configured in environment variables');
    process.exit(1);
  }
  
  const startTime = Date.now();
  
  try {
    // Initialize database
    const pool = await initDatabase();
    
    // Get stations with missing locations (using the limit from command line)
    const stations = await getStationsWithMissingLocations(pool, limit);
    
    if (stations.length === 0) {
      logger.info('No TMD stations with missing locations found, exiting');
      await pool.end();
      return;
    }
    
    logger.info(`Found ${stations.length} TMD stations with missing location information to process`);
    
    // Process stations in batches if there are many
    let processedStations = 0;
    let successCount = 0;
    let failureCount = 0;
    
    // Process in batches of batchSize
    for (let i = 0; i < stations.length; i += batchSize) {
      const batchStart = i;
      const batchEnd = Math.min(i + batchSize, stations.length);
      const batch = stations.slice(batchStart, batchEnd);
      
      logger.info(`Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(stations.length/batchSize)}: stations ${batchStart+1}-${batchEnd} (${batch.length} stations)`);
      
      // Process this batch
      const results = await processStations(pool, batch);
      
      processedStations += batch.length;
      successCount += results.success;
      failureCount += results.failure;
      
      logger.info(`Batch ${Math.floor(i/batchSize) + 1} complete: ${results.success} succeeded, ${results.failure} failed (${processedStations}/${stations.length} total processed)`);
      
      // Add a delay between batches to avoid overwhelming the system
      if (batchEnd < stations.length) {
        logger.info('Pausing for 5 seconds before the next batch...');
        await setTimeout(5000);
      }
    }
    
    logger.info(`Processed ${processedStations} stations in total: ${successCount} succeeded, ${failureCount} failed`);
    
    // Verify the updates
    const stationIds = stations.map(s => s.tele_station_id);
    const verifiedStations = await verifyUpdates(pool, stationIds);
    
    // Close pool
    await pool.end();
    
    const duration = Date.now() - startTime;
    
    logger.info('TMD Admin Location Update Test Script completed', {
      duration: `${duration}ms`,
      stats,
      totalVerified: verifiedStations.length
    });
    
    // Display verified stations
    logger.info('Sample of verified stations:');
    verifiedStations.slice(0, 5).forEach(station => {
      logger.info(`Station ${station.tele_station_id}: ${station.province}, ${station.amphure}, ${station.tambon}`);
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('TMD Admin Location Update Test Script failed', {
      duration: `${duration}ms`,
      error: error.message,
      stack: error.stack
    });
    
    process.exit(1);
  }
}

// Run the script
main().catch(err => {
  logger.error('Unhandled error in main function', {
    error: err.message,
    stack: err.stack
  });
  process.exit(1);
}); 