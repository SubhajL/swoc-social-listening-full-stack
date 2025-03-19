// JavaScript script to update ALL TMD stations with Amphure and Province information
// Using the new Google Maps API key
import pg from 'pg';
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';

// Load environment variables
dotenv.config();

/**
 * Options for the update process
 */
class Options {
  /** Number of stations to process in each batch */
  batchSize = 50;
  /** Force update of all stations, even those with existing location data */
  forceUpdate = true; // Set to true to update all stations
  /** Log level: 'debug', 'info', 'warn', 'error' */
  logLevel = 'info';
  /** Save results to file */
  saveToFile = true;
  /** Enable debug mode with additional logging */
  debugMode = false;
  /** Test mode - don't update database */
  testMode = false;
  /** Gulf of Thailand bounds */
  gulfOfThailandBounds = {
    north: 13.0,
    south: 6.0,
    east: 104.0,
    west: 99.0
  };
  /** New Google Maps API key */
  googleMapsApiKey = 'AIzaSyANIYu6U53gD7ASCMRVz16lCC7KVa0yjwg';
  /** Delay between API requests in milliseconds to avoid rate limiting */
  apiRequestDelay = 200;
}

/**
 * Simple logger class
 */
class Logger {
  constructor(logLevel = 'info') {
    this.logLevel = logLevel;
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
  }

  debug(message, data = null) {
    if (this.levels[this.logLevel] <= this.levels.debug) {
      console.log(`[DEBUG] ${message}`, data ? data : '');
    }
  }

  info(message, data = null) {
    if (this.levels[this.logLevel] <= this.levels.info) {
      console.log(`[INFO] ${message}`, data ? data : '');
    }
  }

  warn(message, data = null) {
    if (this.levels[this.logLevel] <= this.levels.warn) {
      console.log(`[WARN] ${message}`, data ? data : '');
    }
  }

  error(message, data = null) {
    if (this.levels[this.logLevel] <= this.levels.error) {
      console.log(`[ERROR] ${message}`, data ? data : '');
    }
  }
}

/**
 * Sleep function to add delay between API requests
 * 
 * @param {number} ms Milliseconds to sleep
 * @returns {Promise<void>} Promise that resolves after the specified time
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Validates if coordinates are within Thailand's boundaries
 * 
 * @param {number} lat Latitude
 * @param {number} lng Longitude
 * @returns {boolean} Boolean indicating if coordinates are within Thailand
 */
function isWithinThailand(lat, lng) {
  // Thailand's approximate bounding box
  const THAILAND_BOUNDS = {
    north: 20.5,
    south: 5.5,
    east: 105.5,
    west: 97.5
  };
  
  return (
    lat >= THAILAND_BOUNDS.south &&
    lat <= THAILAND_BOUNDS.north &&
    lng >= THAILAND_BOUNDS.west &&
    lng <= THAILAND_BOUNDS.east
  );
}

/**
 * Checks if coordinates are valid
 * 
 * @param {number} lat Latitude
 * @param {number} lng Longitude
 * @returns {boolean} Boolean indicating if coordinates are valid
 */
function isValidCoordinates(lat, lng) {
  return (
    lat !== null && 
    lng !== null && 
    !isNaN(lat) && 
    !isNaN(lng) && 
    lat !== 0 && 
    lng !== 0 && 
    Math.abs(lat) <= 90 && 
    Math.abs(lng) <= 180
  );
}

/**
 * Checks if coordinates are in the Gulf of Thailand
 * 
 * @param {number} lat Latitude
 * @param {number} lng Longitude
 * @param {Options} options Options object
 * @returns {boolean} Boolean indicating if coordinates are in the Gulf of Thailand
 */
function isInGulfOfThailand(lat, lng, options) {
  const bounds = options.gulfOfThailandBounds;
  
  return (
    lat >= bounds.south &&
    lat <= bounds.north &&
    lng >= bounds.west &&
    lng <= bounds.east
  );
}

/**
 * Gets the nearest province for coordinates in the Gulf of Thailand
 * 
 * @param {number} lat Latitude
 * @param {number} lng Longitude
 * @returns {Object} Object containing province and amphure
 */
function getNearestProvinceForGulf(lat, lng) {
  // Simple mapping based on latitude ranges
  if (lat < 8.0) {
    return { province: 'สงขลา', amphure: 'เมืองสงขลา' };
  } else if (lat < 9.5) {
    return { province: 'นครศรีธรรมราช', amphure: 'เมืองนครศรีธรรมราช' };
  } else if (lat < 10.5) {
    return { province: 'สุราษฎร์ธานี', amphure: 'เมืองสุราษฎร์ธานี' };
  } else if (lat < 11.5) {
    return { province: 'ชุมพร', amphure: 'เมืองชุมพร' };
  } else if (lat < 12.5) {
    return { province: 'ประจวบคีรีขันธ์', amphure: 'เมืองประจวบคีรีขันธ์' };
  } else {
    return { province: 'ชลบุรี', amphure: 'เมืองชลบุรี' };
  }
}

/**
 * Reverse geocodes coordinates to get province and amphure
 * 
 * @param {number} lat Latitude
 * @param {number} lng Longitude
 * @param {Options} options Options object
 * @param {Logger} logger Logger instance
 * @returns {Promise<Object|null>} Promise resolving to object with province and amphure, or null if geocoding failed
 */
async function reverseGeocode(lat, lng, options, logger) {
  // Check if coordinates are valid
  if (!isValidCoordinates(lat, lng)) {
    logger.warn(`Invalid coordinates: ${lat}, ${lng}`);
    return null;
  }
  
  // Check if coordinates are within Thailand
  if (!isWithinThailand(lat, lng)) {
    logger.warn(`Coordinates outside Thailand: ${lat}, ${lng}`);
    return null;
  }
  
  // Check if coordinates are in the Gulf of Thailand
  if (isInGulfOfThailand(lat, lng, options)) {
    logger.info(`Coordinates ${lat}, ${lng} are in the Gulf of Thailand, using nearest province`);
    return getNearestProvinceForGulf(lat, lng);
  }
  
  try {
    logger.info(`Geocoding coordinates: ${lat}, ${lng}`);
    
    // Use the new API key
    const apiKey = options.googleMapsApiKey;
    
    if (options.debugMode) {
      logger.debug(`Using API key: ${apiKey.substring(0, 10)}...`);
    }
    
    // Use the same URL format as the TMD script
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=th&result_type=administrative_area_level_1|administrative_area_level_2|administrative_area_level_3`;
    
    if (options.debugMode) {
      logger.debug(`Request URL: ${url}`);
    }
    
    const response = await axios.get(url);
    
    // Add delay to avoid rate limiting
    await sleep(options.apiRequestDelay);
    
    if (options.debugMode) {
      logger.debug(`API Response status: ${response.data.status}`);
      if (response.data.error_message) {
        logger.debug(`API Error message: ${response.data.error_message}`);
      }
    }
    
    if (response.data.status !== 'OK') {
      logger.warn(`Geocoding API error: ${response.data.status} for coordinates ${lat}, ${lng}`);
      return null;
    }
    
    return processGeocodingResponse(response.data, logger, options);
  } catch (error) {
    logger.error(`Error geocoding coordinates ${lat}, ${lng}: ${error.message}`);
    if (options.debugMode && error.stack) {
      logger.debug(`Error stack: ${error.stack}`);
    }
    return null;
  }
}

/**
 * Process geocoding response to extract province and amphure
 * 
 * @param {Object} data Response data from Google Maps API
 * @param {Logger} logger Logger instance
 * @param {Options} options Options object
 * @returns {Object|null} Object with province and amphure, or null if processing failed
 */
function processGeocodingResponse(data, logger, options) {
  if (!data.results || data.results.length === 0) {
    logger.warn(`No results found in geocoding response`);
    return null;
  }
  
  // Extract administrative components from results
  let province = '';
  let amphure = '';
  
  // Process each result to extract the different administrative levels
  for (const result of data.results) {
    if (options.debugMode) {
      logger.debug(`Processing result: ${result.formatted_address}`);
    }
    
    for (const component of result.address_components) {
      if (options.debugMode) {
        logger.debug(`Component: ${component.long_name}, Types: ${component.types.join(', ')}`);
      }
      
      if (component.types.includes('administrative_area_level_1')) {
        province = component.long_name;
        if (options.debugMode) {
          logger.debug(`Found province: ${province}`);
        }
      } else if (component.types.includes('administrative_area_level_2')) {
        amphure = component.long_name;
        if (options.debugMode) {
          logger.debug(`Found amphure: ${amphure}`);
        }
      }
    }
  }
  
  // Clean up the administrative names
  // Remove "จังหวัด" prefix from province if present
  if (province.startsWith('จังหวัด')) {
    province = province.substring('จังหวัด'.length).trim();
    if (options.debugMode) {
      logger.debug(`Cleaned province: ${province}`);
    }
  }
  
  // Remove "อำเภอ" or "เขต" prefix from amphure if present
  if (amphure.startsWith('อำเภอ')) {
    amphure = amphure.substring('อำเภอ'.length).trim();
    if (options.debugMode) {
      logger.debug(`Cleaned amphure: ${amphure}`);
    }
  } else if (amphure.startsWith('เขต')) {
    amphure = amphure.substring('เขต'.length).trim();
    if (options.debugMode) {
      logger.debug(`Cleaned amphure: ${amphure}`);
    }
  }
  
  logger.info(`Successfully geocoded to ${province}, ${amphure}`);
  
  return {
    province,
    amphure
  };
}

/**
 * Updates TMD stations with location data
 */
async function updateTMDLocations() {
  const options = new Options();
  const logger = new Logger(options.logLevel);
  
  logger.info('Starting update of ALL TMD station locations with new API key...');
  
  // Create a connection pool
  const connectionString = process.env.DATABASE_URL;
  logger.info(`Using connection string: ${connectionString}`);
  
  const pool = new pg.Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    // Get TMD stations
    const stationsToUpdate = [];
    
    const query = `
      SELECT 
        tele_station_id as id, 
        tele_station_name as name, 
        tele_station_lat as latitude, 
        tele_station_long as longitude, 
        province, 
        amphure
      FROM 
        thaiwater_tele_stations
      WHERE 
        data_source = 'TMD'
        ${options.forceUpdate ? '' : 'AND (province IS NULL OR province = \'\' OR amphure IS NULL OR amphure = \'\')'}
    `;
    
    const result = await pool.query(query);
    
    logger.info(`Found ${result.rows.length} TMD stations ${options.forceUpdate ? '' : 'without location data'} in database`);
    
    // Prepare stations for update
    for (const station of result.rows) {
      stationsToUpdate.push({
        id: station.id,
        name: station.name,
        latitude: station.latitude,
        longitude: station.longitude,
        currentProvince: station.province,
        currentAmphure: station.amphure
      });
    }
    
    // Process stations in batches
    const batches = [];
    for (let i = 0; i < stationsToUpdate.length; i += options.batchSize) {
      batches.push(stationsToUpdate.slice(i, i + options.batchSize));
    }
    
    logger.info(`Processing stations in ${batches.length} batches of up to ${options.batchSize} stations each`);
    
    const results = {
      total: stationsToUpdate.length,
      updated: 0,
      skipped: 0,
      errors: 0,
      details: []
    };
    
    // Process each batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      logger.info(`Processing batch ${i + 1}/${batches.length} with ${batch.length} stations`);
      
      // Begin transaction for this batch
      await pool.query('BEGIN');
      
      try {
        for (const station of batch) {
          const { id, latitude, longitude, currentProvince, currentAmphure } = station;
          
          // Skip if already has province and amphure and not forcing update
          if (!options.forceUpdate && currentProvince && currentAmphure) {
            logger.info(`Station ${id} already has location data (${currentProvince}, ${currentAmphure}), skipping`);
            results.skipped++;
            results.details.push({
              id,
              status: 'skipped',
              reason: 'already_has_location',
              province: currentProvince,
              amphure: currentAmphure
            });
            continue;
          }
          
          if (!isValidCoordinates(latitude, longitude)) {
            logger.warn(`Station ${id} has invalid coordinates (${latitude}, ${longitude}), skipping`);
            results.skipped++;
            results.details.push({
              id,
              status: 'skipped',
              reason: 'invalid_coordinates',
              coordinates: { latitude, longitude }
            });
            continue;
          }
          
          logger.info(`Using coordinates for station ${id}: ${latitude}, ${longitude}`);
          
          // Reverse geocode to get province and amphure
          const locationData = await reverseGeocode(latitude, longitude, options, logger);
          
          if (!locationData) {
            logger.warn(`Could not get location data for station ${id} with coordinates ${latitude}, ${longitude}`);
            results.errors++;
            results.details.push({
              id,
              status: 'error',
              reason: 'geocoding_failed',
              coordinates: { latitude, longitude }
            });
            continue;
          }
          
          const { province, amphure } = locationData;
          
          // Skip update if in test mode
          if (options.testMode) {
            logger.info(`[TEST MODE] Would update station ${id} with province: ${province}, amphure: ${amphure}`);
            results.updated++;
            results.details.push({
              id,
              status: 'updated',
              province,
              amphure,
              coordinates: { latitude, longitude }
            });
            continue;
          }
          
          // Update the station in the database
          try {
            await pool.query(
              'UPDATE thaiwater_tele_stations SET province = $1, amphure = $2, updated_at = NOW() WHERE tele_station_id = $3',
              [province, amphure, id]
            );
            
            logger.info(`Updated station ${id} with province: ${province}, amphure: ${amphure}`);
            results.updated++;
            results.details.push({
              id,
              status: 'updated',
              province,
              amphure,
              coordinates: { latitude, longitude }
            });
          } catch (error) {
            logger.error(`Error updating station ${id}: ${error.message}`);
            results.errors++;
            results.details.push({
              id,
              status: 'error',
              reason: 'database_update_failed',
              error: error.message
            });
            throw error; // Rethrow to trigger rollback
          }
        }
        
        // Commit transaction for this batch
        await pool.query('COMMIT');
        logger.info(`Batch ${i + 1} completed successfully`);
      } catch (error) {
        // Rollback transaction on error
        await pool.query('ROLLBACK');
        logger.error(`Error processing batch ${i + 1}: ${error.message}`);
      }
    }
    
    // Save results to file if enabled
    if (options.saveToFile) {
      const resultsFile = 'all_tmd_location_update_results.json';
      fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
      logger.info(`Results saved to ${resultsFile}`);
    }
    
    // Log summary
    logger.info('\nUpdate Summary:');
    logger.info(`Total stations processed: ${results.total}`);
    logger.info(`Successfully updated: ${results.updated}`);
    logger.info(`Skipped (no coordinates or already has location): ${results.skipped}`);
    logger.info(`Errors: ${results.errors}`);
    
  } catch (error) {
    logger.error(`Unexpected error: ${error.message}`);
    if (options.debugMode && error.stack) {
      logger.debug(`Error stack: ${error.stack}`);
    }
  } finally {
    await pool.end();
    logger.info('TMD station location update process completed');
  }
}

// Run the update function
updateTMDLocations().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 