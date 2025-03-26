#!/usr/bin/env node

/**
 * TMD Station Information Update Script
 * 
 * This script focuses specifically on:
 * 1. Identifying TMD stations with missing information
 * 2. Fetching complete station data from TMD API endpoints
 * 3. Updating only TMD stations with the fetched data
 * 4. Preserving existing data when new data is not available
 */

import pg from 'pg';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createEnhancedLogger } from '../utils/enhanced-logger.js';

// Get the current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Create enhanced logger
const logger = createEnhancedLogger({
  jobType: 'TMD_STATION_UPDATE',
  filename: 'tmd-station-update.log'
});

// Check if running in dry-run mode (no actual database updates)
const isDryRun = process.argv.includes('--dry-run');

// API configuration with updated endpoints
const TMD_API_BASE_URL = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/api_service';

// API endpoints - using the correct endpoints for station data
const TMD_WEATHER_STATION_ENDPOINT = '?mid=264&eid=skbNrh269YFK3TOaTT7074F_kQKPqfo0Ji_UkABKAnbLZiK_ceQ6ii0zx6HsLGOsYbMRu5Ll6d4wrpZ9jB7SHA';
const TMD_RAINFALL_STATION_ENDPOINT = '?mid=264&eid=skbNrh269YFK3TOaTT7074F_kQKPqfo0Ji_UkABKAnbLZiK_ceQ6ii0zx6HsLGOsYbMRu5Ll6d4wrpZ9jB7SHA';

// Create axios config with headers
const axiosConfig = {
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'SWOC-TMD-Station-Update/1.0'
    // Removed api-key and secret-key as they don't appear to be needed for the new API
  }
};

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'ec2-18-143-195-184.ap-southeast-1.compute.amazonaws.com',
  port: parseInt(process.env.DB_PORT || '15435'),
  database: process.env.DB_NAME || 'swoc-uat-gis-ssl',
  user: process.env.DB_USER || 'swoc-uat-gis-ssl-user',
  password: process.env.DB_PASSWORD || '4c0b269f763d4ce1d1d59ba0e2ef1f9c',
  ssl: { rejectUnauthorized: false }
};

// Global stats for tracking progress
let stats = {
  totalTMDStations: 0,
  incompleteStations: 0,
  weatherStationsFetched: 0,
  rainfallStationsFetched: 0,
  stationsUpdated: 0,
  errors: []
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
 * Get TMD stations with incomplete information
 */
async function getIncompleteTMDStations(pool) {
  logger.info('Fetching incomplete TMD stations from database', {
    component: 'Database',
    operation: 'FetchIncomplete'
  });
  
  try {
    // Use a query that avoids type conversion issues
    const query = `
      SELECT 
        tele_station_id,
        tele_station_name,
        tele_station_name_th,
        province,
        amphure,
        tambon,
        tele_station_type,
        CAST(tele_station_lat AS TEXT) as tele_station_lat_str,
        CAST(tele_station_long AS TEXT) as tele_station_long_str
      FROM thaiwater_tele_stations
      WHERE data_source = 'TMD'
    `;
    
    const result = await pool.query(query);
    
    // Filter the rows in JavaScript to find incomplete stations
    const incompleteStations = result.rows.filter(station => 
      !station.tele_station_name || 
      !station.tele_station_name_th || 
      !station.province ||
      !station.tele_station_lat_str ||
      station.tele_station_lat_str === '0' ||
      !station.tele_station_long_str ||
      station.tele_station_long_str === '0'
    );
    
    logger.info(`Found ${incompleteStations.length} TMD stations with incomplete information`, {
      component: 'Database',
      operation: 'IncompleteStationsFound',
      data: {
        count: incompleteStations.length,
        sample: incompleteStations.length > 0 ? incompleteStations[0] : null
      }
    });
    
    stats.incompleteStations = incompleteStations.length;
    return incompleteStations;
  } catch (error) {
    logger.error('Failed to fetch incomplete TMD stations', {
      component: 'Database',
      operation: 'FetchIncompleteFailed',
      error
    });
    stats.errors.push({
      stage: 'getIncompleteTMDStations',
      message: error.message,
      timestamp: new Date().toISOString()
    });
    return [];
  }
}

/**
 * Fetch all TMD weather stations from the API
 */
async function fetchTMDWeatherStations() {
  logger.info('Fetching TMD weather stations from API', {
    component: 'API',
    operation: 'FetchWeatherStations'
  });
  
  try {
    // Construct the exact URL that worked with curl
    // Note: We're using encodeURI to ensure special characters are properly encoded
    const stationUrl = encodeURI(`${TMD_API_BASE_URL}${TMD_WEATHER_STATION_ENDPOINT}`);
    
    logger.debug('Using weather station API URL', {
      component: 'API',
      operation: 'FetchWeatherStations',
      data: {
        url: stationUrl
      }
    });
    
    // Set up a basic request config without any custom headers that might interfere
    const requestConfig = {
      headers: {
        'Accept': '*/*',
        'User-Agent': 'SWOC-TMD-Station-Update/1.0'
      },
      // Don't automatically parse JSON to handle potential errors better
      transformResponse: [(data) => data]
    };
    
    // Make API request
    const response = await axios.get(stationUrl, requestConfig);
    
    // Parse the JSON manually to avoid issues
    let data;
    try {
      data = JSON.parse(response.data);
    } catch (e) {
      logger.error('Failed to parse JSON response', {
        component: 'API',
        operation: 'ParseJSON',
        error: e.message,
        rawData: response.data.substring(0, 1000) // Log first 1000 chars to debug
      });
      return [];
    }
    
    // The API should return an array of stations
    const stations = Array.isArray(data) ? data : [];
    
    if (stations.length === 0) {
      logger.warn('API returned empty station array or invalid format', {
        component: 'API',
        operation: 'EmptyResponse',
        data: {
          responseType: typeof data,
          sampleData: JSON.stringify(data).substring(0, 1000) // Log first 1000 chars
        }
      });
    }
    
    if (stations.length > 0) {
      logger.info('Sample of raw station data from API:', {
        component: 'API',
        operation: 'FetchWeatherStationsRawSample',
        data: {
          sampleStation: stations[0]
        }
      });
    }
    
    // Transform the data to match our expected format
    const transformedStations = stations.map(station => {
      // Try to extract the numeric ID from tele_station_oldcode
      // if available, otherwise use the id property
      let numericId;
      
      // Check if the station has a numeric id directly
      if (station.id && !isNaN(parseInt(station.id))) {
        numericId = parseInt(station.id);
      } 
      // Use tele_station_id as fallback if present
      else if (station.tele_station_id && !isNaN(parseInt(station.tele_station_id))) {
        numericId = parseInt(station.tele_station_id);
      }
      // If we can't find a valid ID, skip this station
      else {
        logger.warn('Station missing valid ID, skipping', {
          component: 'API',
          operation: 'InvalidStationId',
          data: { stationData: JSON.stringify(station).substring(0, 500) }
        });
        return null;
      }

      return {
        id: numericId,
        name: station.tele_station_name?.en || '',
        name_th: station.tele_station_name?.th || '',
        // Don't use oldcode as requested
        station_id: station.id?.toString() || '',
        latitude: station.tele_station_lat || '',
        longitude: station.tele_station_long || '',
        province_name: { th: station.province_name?.th || '' },
        amphoe_name: { th: station.amphoe_name?.th || '' },
        tambon_name: { th: station.tambon_name?.th || '' }
      };
    }).filter(station => station !== null); // Remove any null stations
    
    logger.info(`Successfully fetched ${transformedStations.length} TMD weather stations`, {
      component: 'API',
      operation: 'FetchWeatherStationsSuccess',
      data: {
        count: transformedStations.length,
        sample: transformedStations.length > 0 ? transformedStations[0] : null
      }
    });
    
    stats.weatherStationsFetched = transformedStations.length;
    return transformedStations;
  } catch (error) {
    logger.error('Failed to fetch TMD weather stations', {
      component: 'API',
      operation: 'FetchWeatherStationsFailed',
      error: error.message,
      response: error.response?.data || 'No response data'
    });
    stats.errors.push({
      stage: 'fetchTMDWeatherStations',
      message: error.message,
      timestamp: new Date().toISOString()
    });
    return [];
  }
}

/**
 * Fetch all TMD rainfall stations from the API
 */
async function fetchTMDRainfallStations() {
  logger.info('Fetching TMD rainfall stations from API', {
    component: 'API',
    operation: 'FetchRainfallStations'
  });
  
  try {
    // Skip fetching rainfall stations separately since we're using the same endpoint
    logger.info('Using same endpoint as weather stations, skipping duplicate fetch', {
      component: 'API',
      operation: 'SkipRainfallStations'
    });
    
    // Return empty array as we've already processed these stations in fetchTMDWeatherStations
    return [];
  } catch (error) {
    logger.error('Failed to fetch TMD rainfall stations', {
      component: 'API',
      operation: 'FetchRainfallStationsFailed',
      error: error.message,
      response: error.response?.data
    });
    stats.errors.push({
      stage: 'fetchTMDRainfallStations',
      message: error.message,
      timestamp: new Date().toISOString()
    });
    return [];
  }
}

/**
 * Process and merge all station data
 */
function mergeStationData(weatherStations, rainfallStations) {
  logger.info('Merging station data from different sources', {
    component: 'DataProcessing',
    operation: 'MergeStations',
    data: {
      weatherStationsCount: weatherStations.length,
      rainfallStationsCount: rainfallStations.length
    }
  });
  
  const allStations = new Map();
  
  // Add weather stations to the map
  for (const station of weatherStations) {
    if (station.id) {
      station.station_type = 'Weather';
      allStations.set(station.id, station);
    }
  }
  
  // Add or update with rainfall stations
  for (const station of rainfallStations) {
    if (station.id) {
      if (allStations.has(station.id)) {
        // If station already exists as a weather station, add rainfall type
        const existingStation = allStations.get(station.id);
        existingStation.station_type = 'Weather,Rainfall';
      } else {
        station.station_type = 'Rainfall';
        allStations.set(station.id, station);
      }
    }
  }
  
  const mergedStations = Array.from(allStations.values());
  
  logger.info(`Merged ${mergedStations.length} unique stations`, {
    component: 'DataProcessing',
    operation: 'MergeStationsComplete',
    data: {
      totalUniqueStations: mergedStations.length
    }
  });
  
  return mergedStations;
}

/**
 * Update TMD stations in the database
 */
async function updateTMDStations(pool, incompleteStations, apiStations) {
  logger.info('Updating incomplete TMD stations with API data', {
    component: 'Database',
    operation: 'UpdateStations',
    data: {
      incompleteCount: incompleteStations.length,
      apiStationsCount: apiStations.length
    }
  });
  
  // Log the first few API stations to debug
  logger.debug('Sample API station data for debugging', {
    component: 'Database',
    operation: 'APIStationSample',
    data: {
      sampleStations: apiStations.slice(0, 3)
    }
  });
  
  // Log a sample of raw station IDs for debugging
  if (apiStations.length > 0) {
    const sampleStationIds = apiStations.slice(0, 10).map(s => s.id);
    logger.info('Sample API station IDs:', {
      component: 'Database',
      operation: 'SampleStationIds',
      data: {
        sampleIds: sampleStationIds
      }
    });
  }

  // Log IDs from the database for comparison
  if (incompleteStations.length > 0) {
    const sampleDbStationIds = incompleteStations.slice(0, 10).map(s => s.tele_station_id);
    logger.info('Sample DB station IDs:', {
      component: 'Database',
      operation: 'SampleDBStationIds',
      data: {
        sampleIds: sampleDbStationIds,
        sampleIdsNumeric: sampleDbStationIds.map(id => parseInt(id))
      }
    });
  }
  
  // Create lookup map for API stations by ID
  const stationMap = new Map();
  for (const station of apiStations) {
    if (station.id) {
      stationMap.set(station.id, station);
    }
  }
  
  // Count successful updates
  let updatedCount = 0;
  let errorCount = 0;
  
  // Process each station in its own transaction
  for (const incompleteStation of incompleteStations) {
    const client = await pool.connect();
    
    try {
      const stationId = parseInt(incompleteStation.tele_station_id);
      
      if (isNaN(stationId)) {
        logger.warn(`Invalid station ID format: ${incompleteStation.tele_station_id}`, {
          component: 'Database',
          operation: 'InvalidStationId',
          data: { stationData: incompleteStation }
        });
        client.release();
        continue;
      }
      
      const apiStation = stationMap.get(stationId);
      
      if (!apiStation) {
        logger.debug(`No API data found for station ID ${stationId}`, {
          component: 'Database',
          operation: 'NoAPIData',
          data: { stationId }
        });
        client.release();
        continue;
      }
      
      // Extract station data and handle type conversion
      const stationName = (apiStation.name || '').substring(0, 100);
      const stationNameTh = (apiStation.name_th || '').substring(0, 100);
      const stationType = (apiStation.station_type || 'Weather').substring(0, 100);
      const province = (apiStation.province_name?.th || '').substring(0, 100);
      const amphure = (apiStation.amphoe_name?.th || '').substring(0, 100);
      const tambon = (apiStation.tambon_name?.th || '').substring(0, 100);
      
      // Properly handle numeric values
      let latitude = null;
      let longitude = null;
      
      // Try to parse latitude and longitude as numbers
      if (apiStation.latitude && apiStation.latitude.trim() !== '') {
        try {
          latitude = parseFloat(apiStation.latitude);
          if (isNaN(latitude)) latitude = null;
        } catch (e) {
          latitude = null;
        }
      }
      
      if (apiStation.longitude && apiStation.longitude.trim() !== '') {
        try {
          longitude = parseFloat(apiStation.longitude);
          if (isNaN(longitude)) longitude = null;
        } catch (e) {
          longitude = null;
        }
      }
      
      // Log the data we're about to use for update
      logger.debug(`Updating station ${stationId} with API data`, {
        component: 'Database',
        operation: 'UpdateStationData',
        data: {
          stationId,
          apiStation: {
            name: stationName,
            nameTh: stationNameTh,
            lat: latitude,
            long: longitude,
            type: stationType,
            province: province
          }
        }
      });
      
      if (isDryRun) {
        logger.info(`[DRY RUN] Would update station ${stationId} with data from API`, {
          component: 'Database',
          operation: 'DryRunUpdate',
          data: {
            stationId,
            newData: {
              name: stationName,
              nameTh: stationNameTh,
              lat: latitude,
              long: longitude,
              type: stationType,
              province: province
            }
          }
        });
        updatedCount++;
        client.release();
        continue;
      }
      
      // Begin transaction for this specific station
      await client.query('BEGIN');
      
      // Update the station with data preservation logic - using explicit type casting
      const query = `
        UPDATE thaiwater_tele_stations
        SET 
          tele_station_name = CASE WHEN $1::text IS NOT NULL AND $1::text != '' THEN $1::text ELSE tele_station_name END,
          tele_station_name_th = CASE WHEN $2::text IS NOT NULL AND $2::text != '' THEN $2::text ELSE tele_station_name_th END,
          tele_station_lat = CASE WHEN $3::numeric IS NOT NULL THEN $3::numeric ELSE tele_station_lat END,
          tele_station_long = CASE WHEN $4::numeric IS NOT NULL THEN $4::numeric ELSE tele_station_long END,
          tele_station_type = CASE WHEN $5::text IS NOT NULL AND $5::text != '' THEN $5::text ELSE tele_station_type END,
          province = CASE WHEN $6::text IS NOT NULL AND $6::text != '' THEN $6::text ELSE province END,
          amphure = CASE WHEN $7::text IS NOT NULL AND $7::text != '' THEN $7::text ELSE amphure END,
          tambon = CASE WHEN $8::text IS NOT NULL AND $8::text != '' THEN $8::text ELSE tambon END,
          updated_at = NOW()
        WHERE 
          tele_station_id = $9
          AND data_source = 'TMD'
        RETURNING *
      `;
      
      const values = [
        stationName,
        stationNameTh,
        latitude,
        longitude,
        stationType,
        province,
        amphure,
        tambon,
        stationId
      ];
      
      const result = await client.query(query, values);
      
      // Commit this station's transaction
      await client.query('COMMIT');
      
      if (result.rowCount > 0) {
        logger.info(`Updated station ${stationId} with data from API`, {
          component: 'Database',
          operation: 'StationUpdated',
          data: {
            stationId,
            updatedFields: {
              name: stationName,
              nameTh: stationNameTh,
              lat: latitude,
              long: longitude,
              type: stationType
            }
          }
        });
        updatedCount++;
      } else {
        logger.warn(`Failed to update station ${stationId} - no matching row found`, {
          component: 'Database',
          operation: 'StationUpdateFailed',
          data: { stationId }
        });
      }
    } catch (error) {
      // Rollback transaction for this station if there was an error
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        logger.error(`Error rolling back transaction: ${rollbackError.message}`, {
          component: 'Database',
          operation: 'RollbackError'
        });
      }
      
      errorCount++;
      logger.error(`Error updating station ${incompleteStation.tele_station_id}`, {
        component: 'Database',
        operation: 'UpdateStationError',
        error,
        data: { stationId: incompleteStation.tele_station_id }
      });
    } finally {
      // Always release client back to pool
      client.release();
    }
  }
  
  logger.info('Station update process completed', {
    component: 'Database',
    operation: 'UpdateComplete',
    data: {
      updatedCount,
      errorCount,
      dryRun: isDryRun
    }
  });
  
  stats.stationsUpdated = updatedCount;
  return { updatedCount, errorCount };
}

/**
 * Count total number of TMD stations
 */
async function countTMDStations(pool) {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) AS total
      FROM thaiwater_tele_stations
      WHERE data_source = 'TMD'
    `);
    
    const total = parseInt(result.rows[0].total);
    logger.info(`Found ${total} total TMD stations in database`, {
      component: 'Database',
      operation: 'CountTMDStations',
      data: { total }
    });
    
    stats.totalTMDStations = total;
    return total;
  } catch (error) {
    logger.error('Failed to count TMD stations', {
      component: 'Database',
      operation: 'CountFailed',
      error
    });
    return 0;
  }
}

/**
 * Close database connection
 */
async function closeDatabase(pool) {
  try {
    if (pool) {
      logger.info('Closing database connection', {
        component: 'Database',
        operation: 'CloseConnection'
      });
      
      await pool.end();
      
      logger.info('Database connection closed', {
        component: 'Database',
        operation: 'ConnectionClosed'
      });
    }
  } catch (error) {
    logger.error('Error closing database connection', {
      component: 'Database',
      operation: 'CloseConnectionError',
      error
    });
  }
}

/**
 * Main function
 */
async function main() {
  logger.info('TMD Station Update Script starting', {
    component: 'Job',
    operation: 'StartJob',
    data: {
      dryRun: isDryRun
    }
  });
  
  if (isDryRun) {
    logger.info('Running in DRY RUN mode - no database changes will be made', {
      component: 'Job',
      operation: 'DryRunMode'
    });
  }
  
  const startTime = Date.now();
  
  try {
    // Initialize database
    const pool = await initDatabase();
    
    // Count total TMD stations
    await countTMDStations(pool);
    
    // Get incomplete TMD stations
    let incompleteStations = await getIncompleteTMDStations(pool);
    
    if (incompleteStations.length === 0) {
      logger.info('No incomplete TMD stations found, exiting', {
        component: 'Job',
        operation: 'NoIncompleteStations'
      });
      await closeDatabase(pool);
      return;
    }
    
    // TESTING: Limit to first 10 stations
    const isTestingMode = false; // Set to false to process all stations
    if (isTestingMode) {
      const originalCount = incompleteStations.length;
      incompleteStations = incompleteStations.slice(0, 10);
      logger.info(`TESTING MODE: Limited processing to first 10 stations (out of ${originalCount})`, {
        component: 'Job',
        operation: 'TestingMode'
      });
    }
    
    // Fetch TMD stations from API
    const weatherStations = await fetchTMDWeatherStations();
    const rainfallStations = await fetchTMDRainfallStations();
    
    if (weatherStations.length === 0 && rainfallStations.length === 0) {
      logger.error('Failed to fetch any station data from TMD API', {
        component: 'API',
        operation: 'NoAPIData'
      });
      await closeDatabase(pool);
      process.exit(1);
    }
    
    // Merge station data
    const allStations = mergeStationData(weatherStations, rainfallStations);
    
    // Update TMD stations
    const updateResult = await updateTMDStations(pool, incompleteStations, allStations);
    
    // Close database
    await closeDatabase(pool);
    
    const duration = Date.now() - startTime;
    
    logger.info('TMD Station Update Script completed', {
      component: 'Job',
      operation: 'CompleteJob',
      duration,
      data: {
        stats: {
          totalTMDStations: stats.totalTMDStations,
          incompleteStations: stats.incompleteStations,
          weatherStationsFetched: stats.weatherStationsFetched,
          rainfallStationsFetched: stats.rainfallStationsFetched,
          stationsUpdated: stats.stationsUpdated,
          errorCount: stats.errors.length
        },
        dryRun: isDryRun
      }
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('TMD Station Update Script failed', {
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