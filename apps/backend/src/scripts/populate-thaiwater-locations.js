// JavaScript version of populate-thaiwater-locations.ts
import pg from 'pg';
import dotenv from 'dotenv';
import axios from 'axios';
import { logger } from '../utils/logger.js';

// Load environment variables
dotenv.config();

const { Pool } = pg;

// Configuration
const BATCH_SIZE = 50;
const DELAY_BETWEEN_REQUESTS_MS = 200;

/**
 * Options for populating ThaiWater locations
 */
class PopulateThaiWaterLocationsOptions {
  /** Limit the number of stations to process (for testing) */
  limit;
  /** Only process stations without location data */
  newOnly;
  /** Force update of all stations, even those with existing location data */
  forceUpdate;
}

/**
 * Geocoding result containing administrative boundaries
 */
class GeocodingResult {
  province;
  amphure;
  tambon;
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
 * @returns {boolean} Boolean indicating if coordinates are in the Gulf of Thailand
 */
function isInGulfOfThailand(lat, lng) {
  // Approximate bounding box for the Gulf of Thailand
  const GULF_OF_THAILAND_BOUNDS = {
    north: 13.0,
    south: 6.0,
    east: 104.0,
    west: 99.0
  };
  
  return (
    lat >= GULF_OF_THAILAND_BOUNDS.south &&
    lat <= GULF_OF_THAILAND_BOUNDS.north &&
    lng >= GULF_OF_THAILAND_BOUNDS.west &&
    lng <= GULF_OF_THAILAND_BOUNDS.east
  );
}

/**
 * Determines the nearest province for coordinates in the Gulf of Thailand
 * 
 * @param {number} lat Latitude
 * @param {number} lng Longitude
 * @returns {GeocodingResult} Object containing province, amphure, and tambon
 */
function getNearestProvinceForGulfOfThailand(lat, lng) {
  // Simple mapping based on coordinates
  if (lat < 8.0) {
    return {
      province: 'สงขลา',
      amphure: 'เมืองสงขลา',
      tambon: ''
    };
  } else if (lat < 9.5) {
    return {
      province: 'นครศรีธรรมราช',
      amphure: 'เมืองนครศรีธรรมราช',
      tambon: ''
    };
  } else if (lat < 11.0) {
    return {
      province: 'สุราษฎร์ธานี',
      amphure: 'เมืองสุราษฎร์ธานี',
      tambon: ''
    };
  } else {
    return {
      province: 'ชุมพร',
      amphure: 'เมืองชุมพร',
      tambon: ''
    };
  }
}

/**
 * Reverse geocodes coordinates to get administrative boundaries using Google Maps API
 * 
 * @param {number} lat Latitude
 * @param {number} lng Longitude
 * @returns {Promise<GeocodingResult|null>} Object containing province, amphure, and tambon or null if geocoding fails
 */
async function reverseGeocode(lat, lng) {
  // Check if coordinates are in the Gulf of Thailand
  if (isInGulfOfThailand(lat, lng)) {
    logger.info(`[ReverseGeocoding] Coordinates ${lat}, ${lng} are in the Gulf of Thailand, using nearest province`);
    return getNearestProvinceForGulfOfThailand(lat, lng);
  }
  
  try {
    logger.info(`[ReverseGeocoding] Geocoding coordinates: ${lat}, ${lng}`);
    
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.GOOGLE_MAPS_API_KEY}&language=th&result_type=administrative_area_level_1|administrative_area_level_2|administrative_area_level_3`
    );
    
    if (response.data.status !== 'OK' || !response.data.results || response.data.results.length === 0) {
      logger.warn(`[ReverseGeocoding] No results found for coordinates: ${lat}, ${lng}`, {
        status: response.data.status,
        errorMessage: response.data.error_message
      });
      return null;
    }
    
    // Extract administrative components from results
    let province = '';
    let amphure = '';
    let tambon = '';
    
    // Process each result to extract the different administrative levels
    for (const result of response.data.results) {
      for (const component of result.address_components) {
        if (component.types.includes('administrative_area_level_1')) {
          province = component.long_name;
        } else if (component.types.includes('administrative_area_level_2')) {
          amphure = component.long_name;
        } else if (component.types.includes('administrative_area_level_3')) {
          tambon = component.long_name;
        }
      }
    }
    
    // Clean up the administrative names
    // Remove "จังหวัด" prefix from province if present
    if (province.startsWith('จังหวัด')) {
      province = province.substring('จังหวัด'.length).trim();
    }
    
    // Remove "อำเภอ" or "เขต" prefix from amphure if present
    if (amphure.startsWith('อำเภอ')) {
      amphure = amphure.substring('อำเภอ'.length).trim();
    } else if (amphure.startsWith('เขต')) {
      amphure = amphure.substring('เขต'.length).trim();
    }
    
    // Remove "ตำบล" or "แขวง" prefix from tambon if present
    if (tambon.startsWith('ตำบล')) {
      tambon = tambon.substring('ตำบล'.length).trim();
    } else if (tambon.startsWith('แขวง')) {
      tambon = tambon.substring('แขวง'.length).trim();
    }
    
    logger.info(`[ReverseGeocoding] Successfully geocoded coordinates: ${lat}, ${lng}`, {
      province,
      amphure,
      tambon
    });
    
    return {
      province,
      amphure,
      tambon
    };
  } catch (error) {
    logger.error('[ReverseGeocoding] Error geocoding coordinates', {
      lat, 
      lng, 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return null;
  }
}

/**
 * Populates administrative location data (province, amphure, tambon) for ThaiWater stations
 * using the Google Maps API for geocoding
 */
async function populateThaiWaterLocations(options = {}) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  logger.info('[LocationPopulation] Starting population of ThaiWater station locations');
  logger.info(`[LocationPopulation] Using connection string: ${process.env.DATABASE_URL}`);

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get stations that need geocoding
    let stationsQuery = `
      SELECT 
        tele_station_id, 
        tele_station_lat, 
        tele_station_long,
        data_source
      FROM 
        thaiwater_tele_stations 
      WHERE 
        tele_station_lat IS NOT NULL 
        AND tele_station_long IS NOT NULL
    `;
    
    // Add condition for stations without location data unless force update is enabled
    if (!options.forceUpdate) {
      stationsQuery += ` AND (province IS NULL OR province = '')`;
    }
    
    // Add condition for coordinates within Thailand
    stationsQuery += `
      AND tele_station_lat BETWEEN 5.5 AND 20.5
      AND tele_station_long BETWEEN 97.5 AND 105.5
    `;
    
    // Add additional filters based on options
    if (options.newOnly) {
      stationsQuery += ` AND created_at > (NOW() - INTERVAL '7 days')`;
    }
    
    // Add limit if specified
    if (options.limit && options.limit > 0) {
      stationsQuery += ` LIMIT ${options.limit}`;
    }
    
    const stationsResult = await client.query(stationsQuery);
    const stations = stationsResult.rows;
    
    logger.info(`[LocationPopulation] Found ${stations.length} stations for API geocoding`);
    
    // Process stations in batches
    let processedCount = 0;
    let successCount = 0;
    let failureCount = 0;
    
    for (let i = 0; i < stations.length; i += BATCH_SIZE) {
      const batch = stations.slice(i, i + BATCH_SIZE);
      
      logger.info(`[LocationPopulation] Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(stations.length/BATCH_SIZE)}`);
      
      for (const station of batch) {
        try {
          const lat = parseFloat(station.tele_station_lat);
          const lng = parseFloat(station.tele_station_long);
          
          // Skip if coordinates are invalid or outside Thailand
          if (isNaN(lat) || isNaN(lng) || !isWithinThailand(lat, lng)) {
            logger.warn(`[LocationPopulation] Skipping station ${station.tele_station_id} with invalid or out-of-bounds coordinates: ${lat}, ${lng}`);
            failureCount++;
            continue;
          }
          
          // Use Google Maps API for geocoding
          const location = await reverseGeocode(lat, lng);
          
          if (location && location.province) {
            await client.query(`
              UPDATE thaiwater_tele_stations
              SET 
                province = $1,
                amphure = $2,
                tambon = $3,
                updated_at = NOW()
              WHERE tele_station_id = $4
            `, [location.province, location.amphure, location.tambon, station.tele_station_id]);
            
            logger.info(`[LocationPopulation] Updated station ${station.tele_station_id} (${station.data_source || 'unknown'}) with location: ${location.province}, ${location.amphure}, ${location.tambon}`);
            successCount++;
          } else {
            logger.warn(`[LocationPopulation] Failed to geocode station ${station.tele_station_id} at coordinates: ${lat}, ${lng}`);
            failureCount++;
          }
        } catch (error) {
          logger.error(`[LocationPopulation] Error processing station ${station.tele_station_id}`, {
            error: error instanceof Error ? error.message : String(error)
          });
          failureCount++;
        }
        
        processedCount++;
        
        // Add delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS_MS));
      }
      
      logger.info(`[LocationPopulation] Progress: ${processedCount}/${stations.length} stations processed`);
    }
    
    // Generate a report of stations still missing location data
    const missingLocationReport = await client.query(`
      SELECT 
        COUNT(*) as total_missing,
        data_source,
        COUNT(*) FILTER (WHERE tele_station_type = 'R') as missing_rain_stations
      FROM 
        thaiwater_tele_stations 
      WHERE 
        (province IS NULL OR province = '')
        AND tele_station_lat BETWEEN 5.5 AND 20.5
        AND tele_station_long BETWEEN 97.5 AND 105.5
      GROUP BY data_source
    `);
    
    // Commit transaction
    await client.query('COMMIT');
    
    // Log summary
    logger.info('[LocationPopulation] Location population completed', {
      totalStations: stations.length,
      apiGeocodingSuccess: successCount,
      apiGeocodingFailure: failureCount,
      missingLocationReport: missingLocationReport.rows
    });
    
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
    logger.error('[LocationPopulation] Error populating locations', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Log the full error object for debugging
    console.error('[LocationPopulation] Full error object:', error);
    
  } finally {
    // Release client back to pool
    client.release();
    await pool.end();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  newOnly: args.includes('--new-only'),
  forceUpdate: args.includes('--force-update')
};

// Check for limit flag
const limitArg = args.find(arg => arg.startsWith('--limit='));
if (limitArg) {
  options.limit = parseInt(limitArg.split('=')[1], 10);
}

// Run the population function if this script is executed directly
populateThaiWaterLocations(options).catch(error => {
  logger.error('[LocationPopulation] Unhandled error', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  });
  console.error('[LocationPopulation] Full unhandled error object:', error);
  process.exit(1);
}); 