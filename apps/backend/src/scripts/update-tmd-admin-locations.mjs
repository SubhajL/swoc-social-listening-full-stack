#!/usr/bin/env node

/**
 * TMD Station Administrative Locations Update Script
 * 
 * This script specifically:
 * 1. Identifies TMD stations with missing administrative location information
 * 2. Uses Google Maps Geocoding API to get province, amphure, tambon information
 * 3. Updates the stations with this information
 * 4. Handles edge cases like Gulf of Thailand coordinates
 */

import pg from 'pg';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { setTimeout } from 'timers/promises';
import { createEnhancedLogger } from '../utils/enhanced-logger.js';

// Get the current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Create enhanced logger
const logger = createEnhancedLogger({
  jobType: 'TMD_ADMIN_LOCATION_UPDATE',
  filename: 'tmd-admin-location-update.log'
});

// Check if running in dry-run mode (no actual database updates)
const isDryRun = process.argv.includes('--dry-run');

// Limit option (default to 10 for testing)
const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 0;

// Process all stations flag
const processAll = process.argv.includes('--all');

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

// Gulf of Thailand bounds (approximate)
const GULF_OF_THAILAND_BOUNDS = {
  // Central Gulf
  central: {
    minLat: 8.0,
    maxLat: 12.0,
    minLng: 100.0,
    maxLng: 102.5
  },
  // Upper Gulf
  upper: {
    minLat: 12.0,
    maxLat: 13.5,
    minLng: 99.5,
    maxLng: 101.0
  }
};

// Global stats for tracking progress
let stats = {
  totalStationsProcessed: 0,
  stationsWithMissingLocations: 0,
  stationsUpdated: 0,
  stationsInGulf: 0,
  apiErrors: 0,
  otherErrors: 0
};

/**
 * Initialize database connection
 */
async function initDatabase() {
  logger.info('Initializing database connection', {
    component: 'Database',
    operation: 'Connect'
  });
  
  const pool = new pg.Pool(dbConfig);
  
  try {
    // Test connection
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT NOW()');
      logger.info('Database connection established', {
        component: 'Database',
        operation: 'ConnectSuccess',
        data: {
          time: result.rows[0].now,
          poolSize: pool.totalCount,
          idleConnections: pool.idleCount
        }
      });
    } finally {
      client.release();
    }
    
    return pool;
  } catch (error) {
    logger.error('Failed to connect to database', {
      component: 'Database',
      operation: 'ConnectFailed',
      error
    });
    throw error;
  }
}

/**
 * Get TMD stations with missing administrative location information
 */
async function getStationsWithMissingLocations(pool, options = {}) {
  logger.info('Fetching TMD stations with missing location information', {
    component: 'Database',
    operation: 'FetchMissingLocations',
    data: options
  });
  
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
      ${options.limit ? `LIMIT ${options.limit}` : ''}
    `;
    
    const values = [
      THAILAND_BOUNDS.minLat,
      THAILAND_BOUNDS.maxLat,
      THAILAND_BOUNDS.minLng,
      THAILAND_BOUNDS.maxLng
    ];
    
    const result = await pool.query(query, values);
    
    logger.info(`Found ${result.rows.length} TMD stations with missing location information`, {
      component: 'Database',
      operation: 'MissingLocationsFound',
      data: {
        count: result.rows.length,
        sample: result.rows.length > 0 ? result.rows[0] : null
      }
    });
    
    stats.stationsWithMissingLocations = result.rows.length;
    return result.rows;
  } catch (error) {
    logger.error('Failed to fetch TMD stations with missing locations', {
      component: 'Database',
      operation: 'FetchMissingLocationsFailed',
      error
    });
    throw error;
  }
}

/**
 * Check if coordinates are in the Gulf of Thailand
 */
function isInGulfOfThailand(lat, lng) {
  // Check central gulf
  if (
    lat >= GULF_OF_THAILAND_BOUNDS.central.minLat &&
    lat <= GULF_OF_THAILAND_BOUNDS.central.maxLat &&
    lng >= GULF_OF_THAILAND_BOUNDS.central.minLng &&
    lng <= GULF_OF_THAILAND_BOUNDS.central.maxLng
  ) {
    return true;
  }
  
  // Check upper gulf
  if (
    lat >= GULF_OF_THAILAND_BOUNDS.upper.minLat &&
    lat <= GULF_OF_THAILAND_BOUNDS.upper.maxLat &&
    lng >= GULF_OF_THAILAND_BOUNDS.upper.minLng &&
    lng <= GULF_OF_THAILAND_BOUNDS.upper.maxLng
  ) {
    return true;
  }
  
  return false;
}

/**
 * Gets the nearest province for coordinates in the Gulf of Thailand
 */
function getNearestProvinceForGulf(lat, lng) {
  // Simple mapping based on latitude ranges
  if (lat < 8.0) {
    return { province: 'สงขลา', amphure: 'เมืองสงขลา', tambon: 'บ่อยาง' };
  } else if (lat < 9.5) {
    return { province: 'นครศรีธรรมราช', amphure: 'เมืองนครศรีธรรมราช', tambon: 'ในเมือง' };
  } else if (lat < 10.5) {
    return { province: 'สุราษฎร์ธานี', amphure: 'เมืองสุราษฎร์ธานี', tambon: 'ตลาด' };
  } else if (lat < 11.5) {
    return { province: 'ชุมพร', amphure: 'เมืองชุมพร', tambon: 'ท่าตะเภา' };
  } else if (lat < 12.5) {
    return { province: 'ประจวบคีรีขันธ์', amphure: 'เมืองประจวบคีรีขันธ์', tambon: 'ประจวบคีรีขันธ์' };
  } else {
    return { province: 'ชลบุรี', amphure: 'เมืองชลบุรี', tambon: 'บางปลาสร้อย' };
  }
}

/**
 * Geocode coordinates to get administrative locations using Google Maps API
 */
async function geocodeCoordinates(lat, lng) {
  if (!GOOGLE_MAPS_API_KEY) {
    logger.error('Google Maps API key not found', {
      component: 'API',
      operation: 'GeocodeNoApiKey'
    });
    throw new Error('Google Maps API key not configured');
  }
  
  // Check if coordinates are in the Gulf of Thailand
  if (isInGulfOfThailand(lat, lng)) {
    logger.info(`Coordinates [${lat}, ${lng}] are in the Gulf of Thailand, assigning nearest province`, {
      component: 'Geocoding',
      operation: 'GulfLocation'
    });
    stats.stationsInGulf++;
    return getNearestProvinceForGulf(lat, lng);
  }
  
  try {
    logger.info(`Geocoding coordinates [${lat}, ${lng}]`, {
      component: 'API',
      operation: 'GeocodeCoordinates'
    });
    
    // Configure Google Maps API request
    // Filter for administrative areas in Thailand (language=th)
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}&language=th&result_type=administrative_area_level_1|administrative_area_level_2|administrative_area_level_3`;
    
    const response = await axios.get(url);
    
    if (response.data.status !== 'OK') {
      logger.error(`Geocoding API error: ${response.data.status}`, {
        component: 'API',
        operation: 'GeocodeError',
        data: {
          error: response.data.error_message,
          coordinates: [lat, lng]
        }
      });
      stats.apiErrors++;
      return null;
    }
    
    return processGeocodingResponse(response.data);
  } catch (error) {
    logger.error(`Error geocoding coordinates [${lat}, ${lng}]`, {
      component: 'API',
      operation: 'GeocodeException',
      error
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
    logger.warn('No results found in geocoding response', {
      component: 'API',
      operation: 'NoResults'
    });
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
  
  logger.debug(`Geocoding results: province=${province}, amphure=${amphure}, tambon=${tambon}`, {
    component: 'API',
    operation: 'GeocodeResults'
  });
  
  return { province, amphure, tambon };
}

/**
 * Update a station with geocoded administrative locations
 */
async function updateStationLocations(client, stationId, locationData) {
  try {
    const { province, amphure, tambon } = locationData;
    
    if (!province && !amphure && !tambon) {
      logger.warn(`No location data to update for station ${stationId}`, {
        component: 'Database',
        operation: 'NoLocationData'
      });
      return false;
    }
    
    if (isDryRun) {
      logger.info(`[DRY RUN] Would update station ${stationId} with province=${province}, amphure=${amphure}, tambon=${tambon}`, {
        component: 'Database',
        operation: 'DryRunUpdate'
      });
      return true;
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
      RETURNING *
    `;
    
    const result = await client.query(query, values);
    
    if (result.rowCount > 0) {
      logger.info(`Updated station ${stationId} with province=${province}, amphure=${amphure}, tambon=${tambon}`, {
        component: 'Database',
        operation: 'StationUpdated'
      });
      return true;
    } else {
      logger.warn(`Station ${stationId} not found or not updated`, {
        component: 'Database',
        operation: 'StationNotUpdated'
      });
      return false;
    }
  } catch (error) {
    logger.error(`Error updating station ${stationId}`, {
      component: 'Database',
      operation: 'UpdateError',
      error
    });
    stats.otherErrors++;
    return false;
  }
}

/**
 * Process a batch of stations
 */
async function processStationBatch(client, stations, batchSize = 10) {
  const results = {
    success: 0,
    failure: 0
  };
  
  // Process stations in the batch
  for (let i = 0; i < stations.length; i++) {
    const station = stations[i];
    
    logger.info(`Processing station ${i+1}/${stations.length}: ID=${station.tele_station_id}, Name=${station.tele_station_name || station.tele_station_name_th || 'Unknown'}`, {
      component: 'Processing',
      operation: 'StationStart'
    });
    
    try {
      // Geocode the coordinates
      const locationData = await geocodeCoordinates(station.latitude, station.longitude);
      
      if (locationData) {
        // Update the station with the location data
        const updated = await updateStationLocations(client, station.tele_station_id, locationData);
        
        if (updated) {
          results.success++;
          stats.stationsUpdated++;
        } else {
          results.failure++;
        }
      } else {
        logger.warn(`No location data found for station ${station.tele_station_id}`, {
          component: 'Processing',
          operation: 'NoLocationData'
        });
        results.failure++;
      }
      
      // Add a delay to avoid hitting rate limits
      if (i < stations.length - 1) {
        await setTimeout(200); // 200ms delay between requests
      }
    } catch (error) {
      logger.error(`Error processing station ${station.tele_station_id}`, {
        component: 'Processing',
        operation: 'StationError',
        error
      });
      results.failure++;
      stats.otherErrors++;
    }
    
    stats.totalStationsProcessed++;
  }
  
  return results;
}

/**
 * Main function to run the script
 */
async function main() {
  logger.info('Starting TMD Admin Location Update Script', {
    component: 'Job',
    operation: 'StartJob',
    data: {
      dryRun: isDryRun,
      limit: limit || 'none',
      processAll
    }
  });
  
  if (!GOOGLE_MAPS_API_KEY) {
    logger.error('Google Maps API key not configured in environment variables', {
      component: 'Config',
      operation: 'MissingApiKey'
    });
    process.exit(1);
  }
  
  const startTime = Date.now();
  
  try {
    // Initialize database
    const pool = await initDatabase();
    
    // Get stations with missing locations
    const options = {
      limit: processAll ? 0 : (limit || 10) // Default to 10 if not specified and not processing all
    };
    
    const stations = await getStationsWithMissingLocations(pool, options);
    
    if (stations.length === 0) {
      logger.info('No TMD stations with missing locations found, exiting', {
        component: 'Job',
        operation: 'NoStationsToProcess'
      });
      await pool.end();
      return;
    }
    
    logger.info(`Found ${stations.length} TMD stations with missing location information to process`, {
      component: 'Job',
      operation: 'ProcessingStations'
    });
    
    // Process stations
    const client = await pool.connect();
    
    try {
      // Begin transaction if not in dry run mode
      if (!isDryRun) {
        await client.query('BEGIN');
      }
      
      // Process stations
      const results = await processStationBatch(client, stations);
      
      logger.info(`Processed ${stations.length} stations: ${results.success} succeeded, ${results.failure} failed`, {
        component: 'Job',
        operation: 'BatchComplete'
      });
      
      // Commit transaction if not in dry run mode
      if (!isDryRun) {
        await client.query('COMMIT');
        logger.info('Transaction committed successfully', {
          component: 'Database',
          operation: 'Commit'
        });
      } else {
        logger.info('Dry run mode: Transaction would be committed here', {
          component: 'Database',
          operation: 'DryRunCommit'
        });
      }
    } catch (error) {
      // Rollback transaction if not in dry run mode
      if (!isDryRun) {
        await client.query('ROLLBACK');
        logger.error('Transaction rolled back due to error', {
          component: 'Database',
          operation: 'Rollback',
          error
        });
      }
      throw error;
    } finally {
      client.release();
    }
    
    // Close pool
    await pool.end();
    
    const duration = Date.now() - startTime;
    
    logger.info('TMD Admin Location Update Script completed', {
      component: 'Job',
      operation: 'CompleteJob',
      duration,
      data: {
        stats,
        dryRun: isDryRun
      }
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('TMD Admin Location Update Script failed', {
      component: 'Job',
      operation: 'JobFailed',
      duration,
      error
    });
    
    process.exit(1);
  }
}

// Run the script
main().catch(err => {
  logger.error('Unhandled error in main function', {
    component: 'Job',
    operation: 'UnhandledError',
    error: err
  });
  process.exit(1);
}); 