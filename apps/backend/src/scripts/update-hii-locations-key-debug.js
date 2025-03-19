// JavaScript script to update HII stations with Amphure and Province information
// With enhanced debugging for API key issues
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
  batchSize = 2;
  /** Force update of all stations, even those with existing location data */
  forceUpdate = false;
  /** Log level: 'debug', 'info', 'warn', 'error' */
  logLevel = 'debug';
  /** Save results to file */
  saveToFile = true;
  /** Enable debug mode with additional logging */
  debugMode = true;
  /** Test mode - don't update database */
  testMode = false;
  /** Gulf of Thailand bounds */
  gulfOfThailandBounds = {
    north: 13.0,
    south: 6.0,
    east: 104.0,
    west: 99.0
  };
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
 * Test the Google Maps API key with a simple request
 * 
 * @param {string} apiKey API key to test
 * @param {Logger} logger Logger instance
 * @returns {Promise<boolean>} Promise resolving to true if the API key is valid, false otherwise
 */
async function testApiKey(apiKey, logger) {
  try {
    logger.info(`Testing Google Maps API key: ${apiKey.substring(0, 10)}...`);
    
    // Use a known location in Thailand (Bangkok)
    const testLat = 13.7563;
    const testLng = 100.5018;
    
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${testLat},${testLng}&key=${apiKey}`;
    logger.debug(`Test request URL: ${url}`);
    
    const response = await axios.get(url);
    
    logger.debug(`API test response status: ${response.data.status}`);
    if (response.data.error_message) {
      logger.debug(`API test error message: ${response.data.error_message}`);
    }
    
    return response.data.status === 'OK';
  } catch (error) {
    logger.error(`Error testing API key: ${error.message}`);
    return false;
  }
}

/**
 * Test the Google Maps API key with the exact same parameters as the TMD script
 * 
 * @param {string} apiKey API key to test
 * @param {Logger} logger Logger instance
 * @returns {Promise<boolean>} Promise resolving to true if the API key is valid, false otherwise
 */
async function testApiKeyWithTmdParams(apiKey, logger) {
  try {
    logger.info(`Testing Google Maps API key with TMD parameters: ${apiKey.substring(0, 10)}...`);
    
    // Use a known location in Thailand (Bangkok)
    const testLat = 13.7563;
    const testLng = 100.5018;
    
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${testLat},${testLng}&key=${apiKey}&language=th&result_type=administrative_area_level_1|administrative_area_level_2|administrative_area_level_3`;
    logger.debug(`TMD-style test request URL: ${url}`);
    
    const response = await axios.get(url);
    
    logger.debug(`API TMD-style test response status: ${response.data.status}`);
    if (response.data.error_message) {
      logger.debug(`API TMD-style test error message: ${response.data.error_message}`);
    }
    
    return response.data.status === 'OK';
  } catch (error) {
    logger.error(`Error testing API key with TMD parameters: ${error.message}`);
    return false;
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
  // Check if coordinates are in the Gulf of Thailand
  if (isInGulfOfThailand(lat, lng, options)) {
    logger.info(`Coordinates ${lat}, ${lng} are in the Gulf of Thailand, using nearest province`);
    return getNearestProvinceForGulf(lat, lng);
  }
  
  try {
    logger.info(`Geocoding coordinates: ${lat}, ${lng}`);
    
    // Use the exact same API key and parameters as the TMD script
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    // Debug API key
    logger.debug(`API Key from environment: ${apiKey ? apiKey.substring(0, 10) + '...' : 'not set'}`);
    
    // Use the exact same URL format as the TMD script
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=th&result_type=administrative_area_level_1|administrative_area_level_2|administrative_area_level_3`;
    logger.debug(`Request URL: ${url}`);
    
    // Log the full request headers for debugging
    const requestConfig = {
      headers: {
        'User-Agent': 'HII-Station-Updater/1.0',
        'Accept': 'application/json',
        'Accept-Language': 'th,en;q=0.9'
      }
    };
    
    logger.debug(`Request headers: ${JSON.stringify(requestConfig.headers)}`);
    
    const response = await axios.get(url, requestConfig);
    
    logger.debug(`API Response status: ${response.data.status}`);
    if (response.data.error_message) {
      logger.debug(`API Error message: ${response.data.error_message}`);
    }
    
    if (response.data.status !== 'OK') {
      logger.warn(`Geocoding API error: ${response.data.status} for coordinates ${lat}, ${lng}`);
      return null;
    }
    
    return processGeocodingResponse(response.data, logger);
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
 * @returns {Object|null} Object with province and amphure, or null if processing failed
 */
function processGeocodingResponse(data, logger) {
  if (!data.results || data.results.length === 0) {
    logger.warn(`No results found in geocoding response`);
    return null;
  }
  
  // Extract administrative components from results
  let province = '';
  let amphure = '';
  
  // Process each result to extract the different administrative levels
  for (const result of data.results) {
    logger.debug(`Processing result: ${result.formatted_address}`);
    
    for (const component of result.address_components) {
      logger.debug(`Component: ${component.long_name}, Types: ${component.types.join(', ')}`);
      
      if (component.types.includes('administrative_area_level_1')) {
        province = component.long_name;
        logger.debug(`Found province: ${province}`);
      } else if (component.types.includes('administrative_area_level_2')) {
        amphure = component.long_name;
        logger.debug(`Found amphure: ${amphure}`);
      }
    }
  }
  
  // Clean up the administrative names
  // Remove "จังหวัด" prefix from province if present
  if (province.startsWith('จังหวัด')) {
    province = province.substring('จังหวัด'.length).trim();
    logger.debug(`Cleaned province: ${province}`);
  }
  
  // Remove "อำเภอ" or "เขต" prefix from amphure if present
  if (amphure.startsWith('อำเภอ')) {
    amphure = amphure.substring('อำเภอ'.length).trim();
    logger.debug(`Cleaned amphure: ${amphure}`);
  } else if (amphure.startsWith('เขต')) {
    amphure = amphure.substring('เขต'.length).trim();
    logger.debug(`Cleaned amphure: ${amphure}`);
  }
  
  logger.info(`Successfully geocoded to ${province}, ${amphure}`);
  
  return {
    province,
    amphure
  };
}

/**
 * Updates HII stations with location data
 */
async function updateHIILocations() {
  const options = new Options();
  const logger = new Logger(options.logLevel);
  
  logger.info('Starting update of HII station locations with enhanced API key debugging...');
  
  // Debug environment variables
  logger.debug('Environment variables:');
  logger.debug(`NODE_ENV: ${process.env.NODE_ENV}`);
  logger.debug(`GOOGLE_MAPS_API_KEY: ${process.env.GOOGLE_MAPS_API_KEY ? process.env.GOOGLE_MAPS_API_KEY.substring(0, 10) + '...' : 'not set'}`);
  
  // Test the API key first
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const isApiKeyValid = await testApiKey(apiKey, logger);
  logger.info(`API key basic test result: ${isApiKeyValid ? 'VALID' : 'INVALID'}`);
  
  // Test with TMD parameters
  const isTmdParamsValid = await testApiKeyWithTmdParams(apiKey, logger);
  logger.info(`API key TMD parameters test result: ${isTmdParamsValid ? 'VALID' : 'INVALID'}`);
  
  if (!isApiKeyValid) {
    logger.error('The Google Maps API key is invalid. Please check your API key and try again.');
    return;
  }
  
  // Load HII stations from API data file
  const hiiStationsPath = 'thaiwater_api_hii_stations.json';
  if (!fs.existsSync(hiiStationsPath)) {
    logger.error(`HII stations data file not found at ${hiiStationsPath}`);
    return;
  }
  
  const hiiStations = JSON.parse(fs.readFileSync(hiiStationsPath, 'utf8'));
  logger.info(`Loaded ${hiiStations.length} HII stations from API data file`);
  
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
    // Get HII stations without location data
    const stationsToUpdate = [];
    
    const result = await pool.query(`
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
        data_source = 'HII'
        AND (province IS NULL OR province = '' OR amphure IS NULL OR amphure = '')
      LIMIT 2
    `);
    
    logger.info(`Found ${result.rows.length} HII stations without location data in database`);
    
    // Map database stations to API stations
    for (const dbStation of result.rows) {
      const apiStation = hiiStations.find(s => s.id === dbStation.id);
      
      if (apiStation) {
        stationsToUpdate.push({
          id: dbStation.id,
          name: dbStation.name,
          latitude: apiStation.latitude || dbStation.latitude,
          longitude: apiStation.longitude || dbStation.longitude,
          currentProvince: dbStation.province,
          currentAmphure: dbStation.amphure
        });
      }
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
      
      for (const station of batch) {
        const { id, latitude, longitude } = station;
        
        if (!latitude || !longitude) {
          logger.warn(`Station ${id} has no coordinates, skipping`);
          results.skipped++;
          results.details.push({
            id,
            status: 'skipped',
            reason: 'no_coordinates'
          });
          continue;
        }
        
        logger.info(`Using coordinates from API for station ${id}: ${latitude}, ${longitude}`);
        
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
            'UPDATE thaiwater_tele_stations SET province = $1, amphure = $2 WHERE tele_station_id = $3',
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
        }
      }
      
      logger.info(`Batch ${i + 1} completed successfully`);
    }
    
    // Save results to file if enabled
    if (options.saveToFile) {
      const resultsFile = 'hii_location_update_key_debug_results.json';
      fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
      logger.info(`Results saved to ${resultsFile}`);
    }
    
    // Log summary
    logger.info('\nUpdate Summary:');
    logger.info(`Total stations processed: ${results.total}`);
    logger.info(`Successfully updated: ${results.updated}`);
    logger.info(`Skipped (no coordinates): ${results.skipped}`);
    logger.info(`Errors: ${results.errors}`);
    
  } catch (error) {
    logger.error(`Unexpected error: ${error.message}`);
    if (options.debugMode && error.stack) {
      logger.debug(`Error stack: ${error.stack}`);
    }
  } finally {
    await pool.end();
    logger.info('HII station location update process completed');
  }
}

// Run the update function
updateHIILocations().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 