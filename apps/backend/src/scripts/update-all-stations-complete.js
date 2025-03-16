// Script to update tambon, amphure, and province for ALL stations (TMD and HII)
import pg from 'pg';
import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Options for the script
class Options {
  constructor() {
    this.batchSize = 10; // Process stations in batches to avoid rate limiting
    this.delayBetweenBatches = 2000; // Delay between batches in milliseconds
    this.delayBetweenRequests = 200; // Delay between API requests in milliseconds
    this.maxRetries = 3; // Maximum number of retries for failed API requests
    this.logLevel = 'info'; // Log level: 'debug', 'info', 'warn', 'error'
    this.saveResultsToFile = true; // Save results to a file
    this.resultsFile = 'all_stations_location_update_results.json'; // File to save results to
    this.updateDatabase = true; // Whether to update the database with the results
    this.processAllStations = true; // Process all stations, not just those with missing data
    this.dataSources = ['TMD', 'HII']; // Data sources to process
  }
}

// Logger class for consistent logging
class Logger {
  constructor(options) {
    this.logLevel = options.logLevel;
    this.logLevels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
  }

  debug(message) {
    if (this.logLevels[this.logLevel] <= this.logLevels.debug) {
      console.log(`[DEBUG] ${message}`);
    }
  }

  info(message) {
    if (this.logLevels[this.logLevel] <= this.logLevels.info) {
      console.log(`[INFO] ${message}`);
    }
  }

  warn(message) {
    if (this.logLevels[this.logLevel] <= this.logLevels.warn) {
      console.warn(`[WARN] ${message}`);
    }
  }

  error(message) {
    if (this.logLevels[this.logLevel] <= this.logLevels.error) {
      console.error(`[ERROR] ${message}`);
    }
  }
}

// Create options and logger
const options = new Options();
const logger = new Logger(options);

/**
 * Main function to update station locations
 */
async function updateAllStationLocations() {
  logger.info('Starting complete station location update process...');
  
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
    // Get API key from environment variables
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      throw new Error('Google Maps API key not found in environment variables');
    }
    
    logger.info(`Using Google Maps API key: ${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 4)}`);
    
    // Query all stations with valid coordinates
    const allStations = await queryAllStations(pool, options.dataSources);
    logger.info(`Found ${allStations.length} total stations with valid coordinates`);
    
    // Process stations in batches
    const results = await processStationsInBatches(allStations, apiKey, pool, options);
    
    // Save results to file if enabled
    if (options.saveResultsToFile) {
      fs.writeFileSync(options.resultsFile, JSON.stringify(results, null, 2));
      logger.info(`Results saved to ${options.resultsFile}`);
    }
    
    // Log summary
    logSummary(results);
    
  } catch (error) {
    logger.error(`Error updating station locations: ${error.message}`);
    if (error.stack) {
      logger.debug(`Error stack: ${error.stack}`);
    }
  } finally {
    await pool.end();
    logger.info('Complete station location update process completed');
  }
}

/**
 * Query all stations with valid coordinates
 * 
 * @param {pg.Pool} pool - Database connection pool
 * @param {Array<string>} dataSources - Data sources to query
 * @returns {Promise<Array>} - Array of stations
 */
async function queryAllStations(pool, dataSources) {
  logger.info(`Querying all stations from data sources: ${dataSources.join(', ')}...`);
  
  const query = `
    SELECT 
      tele_station_id,
      tele_station_name,
      tele_station_lat,
      tele_station_long,
      province,
      amphure,
      tambon,
      data_source
    FROM 
      thaiwater_tele_stations
    WHERE 
      data_source = ANY($1)
      AND tele_station_lat IS NOT NULL 
      AND tele_station_long IS NOT NULL
      AND tele_station_lat != 0 
      AND tele_station_long != 0
    ORDER BY 
      data_source, tele_station_id;
  `;
  
  const result = await pool.query(query, [dataSources]);
  
  return result.rows.map(station => ({
    id: station.tele_station_id,
    name: station.tele_station_name,
    latitude: parseFloat(station.tele_station_lat),
    longitude: parseFloat(station.tele_station_long),
    province: station.province,
    amphure: station.amphure,
    tambon: station.tambon,
    data_source: station.data_source,
    update_reason: 'complete_update'
  }));
}

/**
 * Process stations in batches
 * 
 * @param {Array} stations - Array of stations to process
 * @param {string} apiKey - Google Maps API key
 * @param {pg.Pool} pool - Database connection pool
 * @param {Options} options - Script options
 * @returns {Promise<Object>} - Results of the processing
 */
async function processStationsInBatches(stations, apiKey, pool, options) {
  logger.info(`Processing ${stations.length} stations in batches of ${options.batchSize}...`);
  
  const results = {
    total: stations.length,
    processed: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    stations: []
  };
  
  // Process stations in batches
  for (let i = 0; i < stations.length; i += options.batchSize) {
    const batch = stations.slice(i, i + options.batchSize);
    logger.info(`Processing batch ${Math.floor(i / options.batchSize) + 1} of ${Math.ceil(stations.length / options.batchSize)} (${batch.length} stations)...`);
    
    // Process each station in the batch
    for (const station of batch) {
      try {
        logger.info(`Processing station ${station.id} (${station.name})...`);
        
        // Skip if latitude or longitude is missing or zero
        if (!station.latitude || !station.longitude || station.latitude === 0 || station.longitude === 0) {
          logger.warn(`Skipping station ${station.id} (${station.name}): Missing or zero coordinates`);
          results.skipped++;
          results.stations.push({
            ...station,
            status: 'skipped',
            reason: 'missing_coordinates'
          });
          continue;
        }
        
        // Geocode the coordinates
        const geocodeResult = await reverseGeocode(station.latitude, station.longitude, apiKey, options);
        
        // Process the geocode result
        const locationInfo = processGeocodeResult(geocodeResult, station);
        
        // Check if location info has changed
        const hasChanged = hasLocationChanged(station, locationInfo.administrative_areas);
        
        // Update the station in the database if enabled and location has changed
        if (options.updateDatabase && locationInfo.administrative_areas.province) {
          if (hasChanged) {
            await updateStationLocation(pool, station.id, locationInfo.administrative_areas);
            results.updated++;
            
            results.stations.push({
              ...station,
              status: 'updated',
              reason: 'location_changed',
              geocode_result: locationInfo,
              changes: getLocationChanges(station, locationInfo.administrative_areas)
            });
          } else {
            logger.info(`No changes for station ${station.id} (${station.name})`);
            results.skipped++;
            
            results.stations.push({
              ...station,
              status: 'skipped',
              reason: 'no_changes',
              geocode_result: locationInfo
            });
          }
        } else {
          results.skipped++;
          
          results.stations.push({
            ...station,
            status: 'skipped',
            reason: locationInfo.administrative_areas.province ? 'update_disabled' : 'geocoding_failed',
            geocode_result: locationInfo
          });
        }
        
        results.processed++;
        
      } catch (error) {
        logger.error(`Error processing station ${station.id} (${station.name}): ${error.message}`);
        results.errors++;
        results.processed++;
        results.stations.push({
          ...station,
          status: 'error',
          reason: error.message
        });
      }
      
      // Delay between requests to avoid rate limiting
      await delay(options.delayBetweenRequests);
    }
    
    // Delay between batches to avoid rate limiting
    if (i + options.batchSize < stations.length) {
      logger.debug(`Delaying ${options.delayBetweenBatches}ms before next batch...`);
      await delay(options.delayBetweenBatches);
    }
  }
  
  return results;
}

/**
 * Check if location information has changed
 * 
 * @param {Object} station - Station information
 * @param {Object} newLocation - New location information
 * @returns {boolean} - True if location has changed
 */
function hasLocationChanged(station, newLocation) {
  // If any field is different, return true
  return (
    station.province !== newLocation.province ||
    station.amphure !== newLocation.amphure ||
    station.tambon !== newLocation.tambon
  );
}

/**
 * Get location changes
 * 
 * @param {Object} station - Station information
 * @param {Object} newLocation - New location information
 * @returns {Object} - Location changes
 */
function getLocationChanges(station, newLocation) {
  return {
    province: {
      old: station.province,
      new: newLocation.province,
      changed: station.province !== newLocation.province
    },
    amphure: {
      old: station.amphure,
      new: newLocation.amphure,
      changed: station.amphure !== newLocation.amphure
    },
    tambon: {
      old: station.tambon,
      new: newLocation.tambon,
      changed: station.tambon !== newLocation.tambon
    }
  };
}

/**
 * Reverse geocode coordinates using Google Maps API
 * 
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @param {string} apiKey - Google Maps API key
 * @param {Options} options - Script options
 * @returns {Promise<Object>} - Geocoding API response
 */
async function reverseGeocode(latitude, longitude, apiKey, options) {
  logger.debug(`Geocoding coordinates: ${latitude}, ${longitude}...`);
  
  const url = 'https://maps.googleapis.com/maps/api/geocode/json';
  
  const params = {
    latlng: `${latitude},${longitude}`,
    key: apiKey,
    language: 'th', // Get results in Thai language
    result_type: 'administrative_area_level_1|administrative_area_level_2|administrative_area_level_3'
  };
  
  let retries = 0;
  
  while (retries <= options.maxRetries) {
    try {
      const response = await axios.get(url, { params });
      
      if (response.data.status === 'OK') {
        return response.data;
      } else if (response.data.status === 'OVER_QUERY_LIMIT') {
        // If over query limit, wait longer and retry
        retries++;
        logger.warn(`Over query limit, retrying in ${options.delayBetweenBatches * 2}ms (retry ${retries}/${options.maxRetries})...`);
        await delay(options.delayBetweenBatches * 2);
      } else {
        logger.warn(`Geocoding API error: ${response.data.status} - ${response.data.error_message || 'Unknown error'}`);
        return response.data;
      }
    } catch (error) {
      retries++;
      if (retries <= options.maxRetries) {
        logger.warn(`Error calling Google Maps API, retrying in ${options.delayBetweenBatches}ms (retry ${retries}/${options.maxRetries}): ${error.message}`);
        await delay(options.delayBetweenBatches);
      } else {
        throw error;
      }
    }
  }
  
  throw new Error(`Failed to geocode coordinates after ${options.maxRetries} retries`);
}

/**
 * Process geocode result to extract administrative information
 * 
 * @param {Object} geocodeResult - Google Maps Geocoding API response
 * @param {Object} station - Station information
 * @returns {Object} - Processed location information
 */
function processGeocodeResult(geocodeResult, station) {
  const locationInfo = {
    coordinates: {
      latitude: station.latitude,
      longitude: station.longitude,
      name: station.name
    },
    formatted_address: null,
    administrative_areas: {
      province: null,
      amphure: null,
      tambon: null
    },
    raw_components: []
  };
  
  if (geocodeResult.status !== 'OK' || !geocodeResult.results || geocodeResult.results.length === 0) {
    locationInfo.error = geocodeResult.status;
    locationInfo.error_message = geocodeResult.error_message || 'No results found';
    return locationInfo;
  }
  
  // Get the most detailed result
  const result = geocodeResult.results[0];
  locationInfo.formatted_address = result.formatted_address;
  
  // Extract administrative components
  if (result.address_components) {
    locationInfo.raw_components = result.address_components;
    
    for (const component of result.address_components) {
      // Extract province (administrative_area_level_1)
      if (component.types.includes('administrative_area_level_1')) {
        locationInfo.administrative_areas.province = component.long_name;
      }
      
      // Extract amphure/district (administrative_area_level_2)
      if (component.types.includes('administrative_area_level_2')) {
        locationInfo.administrative_areas.amphure = component.long_name;
      }
      
      // Extract tambon/subdistrict (administrative_area_level_3)
      if (component.types.includes('administrative_area_level_3')) {
        locationInfo.administrative_areas.tambon = component.long_name;
      }
    }
  }
  
  // Check if the location is in water
  const isWater = checkIfWater(result);
  locationInfo.is_water = isWater;
  
  // Add all results for reference
  locationInfo.all_results = geocodeResult.results.map(r => ({
    formatted_address: r.formatted_address,
    types: r.types
  }));
  
  return locationInfo;
}

/**
 * Check if the location is in water
 * 
 * @param {Object} result - Google Maps Geocoding API result
 * @returns {boolean} - True if the location is in water
 */
function checkIfWater(result) {
  if (!result || !result.types) {
    return false;
  }
  
  // Check if any of these types are present
  const waterTypes = ['natural_feature', 'point_of_interest', 'establishment'];
  const isWaterFeature = result.types.some(type => waterTypes.includes(type));
  
  // Check if administrative areas are missing
  const hasAdminAreas = result.address_components.some(component => 
    component.types.includes('administrative_area_level_1') || 
    component.types.includes('administrative_area_level_2')
  );
  
  return isWaterFeature || !hasAdminAreas;
}

/**
 * Update station location in the database
 * 
 * @param {pg.Pool} pool - Database connection pool
 * @param {number} stationId - Station ID
 * @param {Object} locationInfo - Location information
 * @returns {Promise<void>} - Promise that resolves when the update is complete
 */
async function updateStationLocation(pool, stationId, locationInfo) {
  logger.debug(`Updating station ${stationId} with location: ${JSON.stringify(locationInfo)}`);
  
  const query = `
    UPDATE thaiwater_tele_stations
    SET 
      province = $1,
      amphure = $2,
      tambon = $3,
      updated_at = CURRENT_TIMESTAMP
    WHERE 
      tele_station_id = $4
  `;
  
  await pool.query(query, [
    locationInfo.province,
    locationInfo.amphure,
    locationInfo.tambon,
    stationId
  ]);
  
  logger.info(`Updated station ${stationId} with province: ${locationInfo.province}, amphure: ${locationInfo.amphure}, tambon: ${locationInfo.tambon}`);
}

/**
 * Log summary of results
 * 
 * @param {Object} results - Results of the processing
 */
function logSummary(results) {
  logger.info('\n=== Complete Station Location Update Summary ===');
  logger.info(`Total stations: ${results.total}`);
  logger.info(`Processed: ${results.processed}`);
  logger.info(`Updated: ${results.updated}`);
  logger.info(`Skipped: ${results.skipped}`);
  logger.info(`Errors: ${results.errors}`);
  
  // Group by data source
  const byDataSource = {};
  for (const station of results.stations) {
    byDataSource[station.data_source] = byDataSource[station.data_source] || { total: 0, updated: 0, skipped: 0, errors: 0 };
    byDataSource[station.data_source].total++;
    
    if (station.status === 'updated') {
      byDataSource[station.data_source].updated++;
    } else if (station.status === 'skipped') {
      byDataSource[station.data_source].skipped++;
    } else if (station.status === 'error') {
      byDataSource[station.data_source].errors++;
    }
  }
  
  logger.info('\nBy Data Source:');
  for (const [dataSource, counts] of Object.entries(byDataSource)) {
    logger.info(`${dataSource}: ${counts.total} total, ${counts.updated} updated, ${counts.skipped} skipped, ${counts.errors} errors`);
  }
  
  // Group by reason
  const byReason = {};
  for (const station of results.stations) {
    byReason[station.reason] = byReason[station.reason] || 0;
    byReason[station.reason]++;
  }
  
  logger.info('\nBy Reason:');
  for (const [reason, count] of Object.entries(byReason)) {
    logger.info(`${reason}: ${count}`);
  }
}

/**
 * Delay function
 * 
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>} - Promise that resolves after the delay
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the function
updateAllStationLocations().catch(error => {
  logger.error('Unhandled error:', error);
  process.exit(1);
}); 