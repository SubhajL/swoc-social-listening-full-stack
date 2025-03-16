// Script to update HII stations with Amphure and Province information based on coordinates
// Using the same approach as TMD stations but with enhanced debugging
import pg from 'pg';
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';

// Load environment variables
dotenv.config();

const { Pool } = pg;

// Options for the script
class Options {
  constructor() {
    this.batchSize = 10; // Process stations in smaller batches for debugging
    this.forceUpdate = false; // Set to true to update all stations, even those with existing location data
    this.logLevel = 'debug'; // 'debug', 'info', 'warn', 'error'
    this.saveToFile = true; // Save results to a file
    this.debugMode = true; // Enable detailed debugging
    this.testMode = true; // Only process a few stations for testing
    this.maxStations = 5; // Maximum number of stations to process in test mode
    this.gulfOfThailandBounds = {
      minLat: 6.0, // Southern boundary of Gulf of Thailand
      maxLat: 13.5, // Northern boundary of Gulf of Thailand
      minLong: 99.0, // Western boundary of Gulf of Thailand
      maxLong: 104.5 // Eastern boundary of Gulf of Thailand
    };
  }
}

// Logger
class Logger {
  constructor(options) {
    this.logLevel = options.logLevel;
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
  }

  debug(message) {
    if (this.levels[this.logLevel] <= this.levels.debug) {
      console.log(`[DEBUG] ${message}`);
    }
  }

  info(message) {
    if (this.levels[this.logLevel] <= this.levels.info) {
      console.log(`[INFO] ${message}`);
    }
  }

  warn(message) {
    if (this.levels[this.logLevel] <= this.levels.warn) {
      console.log(`[WARN] ${message}`);
    }
  }

  error(message) {
    if (this.levels[this.logLevel] <= this.levels.error) {
      console.log(`[ERROR] ${message}`);
    }
  }
}

// Check if coordinates are within Thailand
function isInThailand(lat, long) {
  // Approximate bounding box for Thailand
  const thailandBounds = {
    minLat: 5.5,
    maxLat: 20.5,
    minLong: 97.0,
    maxLong: 106.0
  };

  return (
    lat >= thailandBounds.minLat &&
    lat <= thailandBounds.maxLat &&
    long >= thailandBounds.minLong &&
    long <= thailandBounds.maxLong
  );
}

// Check if coordinates are in the Gulf of Thailand
function isInGulfOfThailand(lat, long, options) {
  const bounds = options.gulfOfThailandBounds;
  
  return (
    lat >= bounds.minLat &&
    lat <= bounds.maxLat &&
    long >= bounds.minLong &&
    long <= bounds.maxLong &&
    !isOnLand(lat, long)
  );
}

// Simple check to determine if coordinates are on land or in water
function isOnLand(lat, long) {
  // Central Gulf of Thailand
  if (lat >= 8.0 && lat <= 11.0 && long >= 100.5 && long <= 102.5) {
    return false;
  }
  
  // Default to assuming it's on land
  return true;
}

// Get the nearest province for Gulf of Thailand coordinates
function getNearestProvinceForGulf(lat, long) {
  // Simplified mapping of latitude ranges to nearest coastal provinces
  if (lat >= 12.0) {
    return { province: 'จังหวัดชลบุรี', amphure: 'อำเภอเมืองชลบุรี' }; // Northern Gulf - Chonburi
  } else if (lat >= 10.5) {
    return { province: 'จังหวัดประจวบคีรีขันธ์', amphure: 'อำเภอเมืองประจวบคีรีขันธ์' }; // Upper Central Gulf - Prachuap Khiri Khan
  } else if (lat >= 9.0) {
    return { province: 'จังหวัดสุราษฎร์ธานี', amphure: 'อำเภอเมืองสุราษฎร์ธานี' }; // Lower Central Gulf - Surat Thani
  } else if (lat >= 7.5) {
    return { province: 'จังหวัดนครศรีธรรมราช', amphure: 'อำเภอเมืองนครศรีธรรมราช' }; // Upper Southern Gulf - Nakhon Si Thammarat
  } else {
    return { province: 'จังหวัดสงขลา', amphure: 'อำเภอเมืองสงขลา' }; // Lower Southern Gulf - Songkhla
  }
}

// Reverse geocode coordinates to get province and amphure
async function reverseGeocode(lat, long, options, logger) {
  // Check if coordinates are valid
  if (!lat || !long || isNaN(lat) || isNaN(long)) {
    logger.warn(`Invalid coordinates: ${lat}, ${long}`);
    return null;
  }
  
  // Check if coordinates are within Thailand
  if (!isInThailand(lat, long)) {
    logger.warn(`Coordinates outside Thailand: ${lat}, ${long}`);
    return null;
  }
  
  // Check if coordinates are in the Gulf of Thailand
  if (isInGulfOfThailand(lat, long, options)) {
    logger.info(`Coordinates in Gulf of Thailand: ${lat}, ${long}`);
    return getNearestProvinceForGulf(lat, long);
  }
  
  try {
    // Use Google Maps Geocoding API
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    // Debug: Check if API key is available
    if (!apiKey) {
      logger.error('Google Maps API key not found in environment variables');
      logger.debug(`Environment variables: ${JSON.stringify(process.env, null, 2)}`);
      throw new Error('Google Maps API key not found in environment variables');
    }
    
    logger.debug(`Using Google Maps API key: ${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 5)}`);
    
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${long}&key=${apiKey}&language=th&result_type=administrative_area_level_1|administrative_area_level_2`;
    
    logger.debug(`Making API request to: ${url.replace(apiKey, 'API_KEY_HIDDEN')}`);
    
    const response = await axios.get(url);
    
    // Debug: Log the full API response
    if (options.debugMode) {
      logger.debug(`API response status: ${response.status}`);
      logger.debug(`API response data: ${JSON.stringify(response.data, null, 2)}`);
    }
    
    if (response.data.status !== 'OK') {
      logger.warn(`Geocoding API error: ${response.data.status} for coordinates ${lat}, ${long}`);
      logger.debug(`Error details: ${JSON.stringify(response.data, null, 2)}`);
      return null;
    }
    
    // Extract province and amphure from results
    let province = null;
    let amphure = null;
    
    for (const result of response.data.results) {
      for (const component of result.address_components) {
        if (component.types.includes('administrative_area_level_1')) {
          province = component.long_name;
          logger.debug(`Found province: ${province}`);
        } else if (component.types.includes('administrative_area_level_2')) {
          amphure = component.long_name;
          logger.debug(`Found amphure: ${amphure}`);
        }
      }
    }
    
    if (province && amphure) {
      return { province, amphure };
    } else {
      logger.warn(`Could not extract province and amphure for coordinates ${lat}, ${long}`);
      return null;
    }
  } catch (error) {
    logger.error(`Error in reverse geocoding: ${error.message}`);
    logger.debug(`Error stack: ${error.stack}`);
    
    if (error.response) {
      logger.debug(`Error response status: ${error.response.status}`);
      logger.debug(`Error response data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    
    return null;
  }
}

// Main function to update HII station locations
async function updateHIILocations() {
  const options = new Options();
  const logger = new Logger(options);
  
  logger.info('Starting update of HII station locations with debugging...');
  
  // Debug: Log environment variables (excluding sensitive data)
  const envVars = { ...process.env };
  if (envVars.GOOGLE_MAPS_API_KEY) {
    envVars.GOOGLE_MAPS_API_KEY = `${envVars.GOOGLE_MAPS_API_KEY.substring(0, 5)}...${envVars.GOOGLE_MAPS_API_KEY.substring(envVars.GOOGLE_MAPS_API_KEY.length - 5)}`;
  }
  logger.debug(`Environment variables: ${JSON.stringify(envVars, null, 2)}`);
  
  // Load HII stations from API data file
  let apiStations = [];
  try {
    const apiData = fs.readFileSync('thaiwater_api_hii_stations.json', 'utf8');
    apiStations = JSON.parse(apiData);
    logger.info(`Loaded ${apiStations.length} HII stations from API data file`);
    
    // Debug: Log a sample of API stations
    logger.debug(`Sample API station: ${JSON.stringify(apiStations[0], null, 2)}`);
  } catch (error) {
    logger.error(`Error loading API data: ${error.message}`);
    logger.info('Please run query-thaiwater-hii-api.js first to generate the API data file');
    return;
  }
  
  // Create a map of API stations by ID for easier lookup
  const apiStationsById = {};
  apiStations.forEach(station => {
    apiStationsById[station.id] = station;
  });
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  logger.info(`Using connection string: ${process.env.DATABASE_URL.replace(/:[^:]*@/, ':***@')}`);
  
  try {
    // Get HII stations from database that need location data
    const query = `
      SELECT 
        tele_station_id as id,
        tele_station_name,
        tele_station_oldcode,
        province,
        amphure
      FROM 
        thaiwater_tele_stations 
      WHERE 
        data_source = 'HII'
        ${options.forceUpdate ? '' : 'AND (province IS NULL OR amphure IS NULL)'}
      ORDER BY 
        tele_station_id
      ${options.testMode ? `LIMIT ${options.maxStations}` : ''};
    `;
    
    logger.debug(`Executing query: ${query}`);
    
    const result = await pool.query(query);
    const stations = result.rows;
    
    logger.info(`Found ${stations.length} HII stations ${options.forceUpdate ? '' : 'without location data'} in database`);
    
    // Debug: Log the stations found
    if (options.debugMode) {
      logger.debug(`Stations found: ${JSON.stringify(stations, null, 2)}`);
    }
    
    // Process stations in batches
    const batches = [];
    for (let i = 0; i < stations.length; i += options.batchSize) {
      batches.push(stations.slice(i, i + options.batchSize));
    }
    
    logger.info(`Processing stations in ${batches.length} batches of up to ${options.batchSize} stations each`);
    
    let updatedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      logger.info(`Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} stations`);
      
      // Begin transaction for this batch
      await pool.query('BEGIN');
      
      try {
        for (const station of batch) {
          // Get coordinates from API since they're not available in the database
          const apiStation = apiStationsById[station.id];
          
          if (!apiStation || !apiStation.tele_station_lat || !apiStation.tele_station_long) {
            logger.warn(`No API data or coordinates for station ${station.id}, skipping`);
            skippedCount++;
            continue;
          }
          
          const lat = parseFloat(apiStation.tele_station_lat);
          const long = parseFloat(apiStation.tele_station_long);
          
          // Skip if invalid coordinates
          if (isNaN(lat) || isNaN(long)) {
            logger.warn(`Invalid coordinates for station ${station.id}: ${apiStation.tele_station_lat}, ${apiStation.tele_station_long}`);
            skippedCount++;
            continue;
          }
          
          logger.debug(`Using coordinates from API for station ${station.id}: ${lat}, ${long}`);
          
          // Reverse geocode to get province and amphure
          const locationData = await reverseGeocode(lat, long, options, logger);
          
          if (locationData) {
            // Update station in database
            const updateQuery = `
              UPDATE thaiwater_tele_stations
              SET 
                province = $1,
                amphure = $2,
                updated_at = NOW()
              WHERE 
                tele_station_id = $3
            `;
            
            logger.debug(`Executing update query: ${updateQuery} with params: ${locationData.province}, ${locationData.amphure}, ${station.id}`);
            
            await pool.query(updateQuery, [locationData.province, locationData.amphure, station.id]);
            
            logger.info(`Updated station ${station.id} with location: ${locationData.amphure}, ${locationData.province}`);
            updatedCount++;
          } else {
            logger.warn(`Could not get location data for station ${station.id} with coordinates ${lat}, ${long}`);
            errorCount++;
          }
        }
        
        // Commit transaction for this batch
        await pool.query('COMMIT');
        logger.info(`Batch ${batchIndex + 1} completed successfully`);
      } catch (error) {
        // Rollback transaction on error
        await pool.query('ROLLBACK');
        logger.error(`Error processing batch ${batchIndex + 1}: ${error.message}`);
        logger.debug(`Error stack: ${error.stack}`);
        errorCount += batch.length;
      }
    }
    
    // Log summary
    logger.info('\nUpdate Summary:');
    logger.info(`Total stations processed: ${stations.length}`);
    logger.info(`Successfully updated: ${updatedCount}`);
    logger.info(`Skipped (no coordinates): ${skippedCount}`);
    logger.info(`Errors: ${errorCount}`);
    
    // Save results to file if enabled
    if (options.saveToFile) {
      const results = {
        timestamp: new Date().toISOString(),
        totalStations: stations.length,
        updatedCount,
        skippedCount,
        errorCount,
        testMode: options.testMode
      };
      
      fs.writeFileSync('hii_location_update_debug_results.json', JSON.stringify(results, null, 2));
      logger.info('Results saved to hii_location_update_debug_results.json');
    }
    
  } catch (error) {
    logger.error(`Error updating HII station locations: ${error.message}`);
    logger.debug(`Error stack: ${error.stack}`);
  } finally {
    await pool.end();
    logger.info('HII station location update process completed');
  }
}

// Run the update function
updateHIILocations().catch(error => {
  console.error('Unhandled error:', error);
  console.error(error.stack);
  process.exit(1);
}); 