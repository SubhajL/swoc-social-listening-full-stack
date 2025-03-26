// Script to update remaining administrative locations for telemetry stations
// Uses Google Maps API with improved error handling and retry logic
import dotenv from 'dotenv';
import pg from 'pg';
import axios from 'axios';
import winston from 'winston';
import fs from 'fs';

// Configure environment variables
dotenv.config();

// Setup logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: 'admin-locations-update.log',
      dirname: './logs'
    })
  ]
});

// Ensure logs directory exists
try {
  if (!fs.existsSync('./logs')) {
    fs.mkdirSync('./logs');
  }
} catch (error) {
  console.error('Error creating logs directory:', error);
}

// Database configuration
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Google Maps API configuration
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const GOOGLE_MAPS_API_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

if (!GOOGLE_MAPS_API_KEY) {
  logger.error('Missing Google Maps API key. Please set GOOGLE_MAPS_API_KEY in your .env file.');
  process.exit(1);
}

// Delay between API requests to avoid rate limiting
const API_DELAY_MS = 1000;
const MAX_RETRIES = 3;

// Sleep function to pause between API requests
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Geocode coordinates using Google Maps API with retry
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} retryCount - Current retry attempt 
 * @returns {Promise<{province: string, amphure: string, tambon: string}>}
 */
async function geocodeWithGoogleMaps(lat, lng, retryCount = 0) {
  try {
    // Ensure coordinates are valid numbers
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    
    if (isNaN(latitude) || isNaN(longitude)) {
      logger.error('Invalid coordinates for Google Maps geocoding', { lat, lng });
      return null;
    }
    
    logger.info('Making Google Maps geocoding request', { latitude, longitude, retryCount });
    
    // Make API call with timeout to prevent hanging
    const response = await axios.get(GOOGLE_MAPS_API_URL, {
      params: {
        latlng: `${latitude},${longitude}`,
        key: GOOGLE_MAPS_API_KEY,
        language: 'th',
        result_type: 'administrative_area_level_1|administrative_area_level_2|administrative_area_level_3'
      },
      timeout: 10000 // 10 second timeout
    });

    if (response.data.status === 'OVER_QUERY_LIMIT') {
      logger.warn('Google Maps API quota exceeded. Waiting before retry...', { retryCount });
      if (retryCount < MAX_RETRIES) {
        // Exponential backoff for quota limits
        await sleep(API_DELAY_MS * Math.pow(2, retryCount));
        return geocodeWithGoogleMaps(lat, lng, retryCount + 1);
      } else {
        logger.error('Failed after maximum retries due to quota limits', { lat, lng });
        return null;
      }
    }

    if (response.data.status !== 'OK') {
      logger.warn('Google Maps API returned non-OK status', { 
        status: response.data.status, 
        error: response.data.error_message,
        lat,
        lng
      });
      
      if (retryCount < MAX_RETRIES && response.data.status !== 'ZERO_RESULTS') {
        await sleep(API_DELAY_MS);
        return geocodeWithGoogleMaps(lat, lng, retryCount + 1);
      }
      
      // For ZERO_RESULTS, we'll try a less specific query
      if (response.data.status === 'ZERO_RESULTS' && retryCount < 1) {
        logger.info('Trying less specific query after ZERO_RESULTS', { lat, lng });
        // Make a second attempt with a less specific result type
        const broadResponse = await axios.get(GOOGLE_MAPS_API_URL, {
          params: {
            latlng: `${latitude},${longitude}`,
            key: GOOGLE_MAPS_API_KEY,
            language: 'th'
          },
          timeout: 10000
        });
        
        if (broadResponse.data.status === 'OK' && broadResponse.data.results.length > 0) {
          return extractLocationFromResponse(broadResponse.data);
        }
      }
      
      return null;
    }

    if (!response.data.results || response.data.results.length === 0) {
      logger.warn('Google Maps API returned no results', { latitude, longitude });
      return null;
    }

    return extractLocationFromResponse(response.data);
    
  } catch (error) {
    logger.error('Error while geocoding with Google Maps', {
      error: error.message,
      lat,
      lng,
      retryCount
    });
    
    if (error.code === 'ECONNABORTED' && retryCount < MAX_RETRIES) {
      logger.info('Request timed out, retrying...', { retryCount });
      await sleep(API_DELAY_MS);
      return geocodeWithGoogleMaps(lat, lng, retryCount + 1);
    }
    
    return null;
  }
}

/**
 * Extract location information from Google Maps API response
 * @param {Object} responseData - Google Maps API response data
 * @returns {Object} Location data with province, amphure, and tambon
 */
function extractLocationFromResponse(responseData) {
  // Extract province, amphure, and tambon from address components
  const result = responseData.results[0];
  let province = '';
  let amphure = '';
  let tambon = '';
  let district = ''; // For Bangkok districts (เขต)

  // Store the full address for debugging and additional analysis
  const formattedAddress = result.formatted_address;
  
  // First extract all potential address components
  for (const component of result.address_components) {
    if (component.types.includes('administrative_area_level_1')) {
      province = component.long_name;
    } else if (component.types.includes('administrative_area_level_2')) {
      amphure = component.long_name;
      // Remove "อำเภอ" or "เขต" prefix if present
      amphure = amphure.replace(/^(อำเภอ|เขต)\s+/, '');
    } else if (component.types.includes('administrative_area_level_3')) {
      tambon = component.long_name;
      // Remove "ตำบล" or "แขวง" prefix if present
      tambon = tambon.replace(/^(ตำบล|แขวง)\s+/, '');
    } 
    // Specifically look for Bangkok districts in sublocality_level_1
    else if (component.types.includes('sublocality_level_1')) {
      district = component.long_name;
      // Remove "เขต" prefix if present
      district = district.replace(/^เขต\s+/, '');
    }
    // Also check for sublocality (broader) as a fallback
    else if (component.types.includes('sublocality') && !district) {
      district = component.long_name;
      district = district.replace(/^เขต\s+/, '');
    }
  }

  // Special handling for Bangkok
  if (province === 'กรุงเทพมหานคร') {
    logger.info('Bangkok location identified', { province, district, tambon, formattedAddress });
    
    // If we have a district from sublocality but no amphure, use the district value
    if (district && !amphure) {
      amphure = `เขต${district}`;
      logger.info('Using Bangkok district as amphure', { amphure });
    } 
    
    // Try to extract district name from the formatted address if still empty
    if (!amphure && formattedAddress) {
      // Try multiple regex patterns to extract district from the formatted address
      let districtMatch = formattedAddress.match(/เขต(\w+)/);
      if (districtMatch && districtMatch[1]) {
        amphure = `เขต${districtMatch[1].trim()}`;
        logger.info('Extracted Bangkok district from address using regex pattern 1', { amphure });
      } else {
        // Additional patterns to try
        const parts = formattedAddress.split(' ');
        // Check if any part matches a known Bangkok district name pattern
        for (let i = 0; i < parts.length; i++) {
          // If this part is followed by กรุงเทพมหานคร, it's likely a district
          if (i < parts.length - 1 && parts[i+1] === 'กรุงเทพมหานคร') {
            amphure = `เขต${parts[i]}`;
            logger.info('Extracted Bangkok district from address parts', { amphure });
            break;
          }
        }
      }
    }
    
    // Last resort - use tambon as a potential district if we still have no amphure
    if (!amphure && tambon) {
      amphure = `เขต${tambon}`;
      logger.info('Using tambon as Bangkok district fallback', { amphure });
    }
  }

  logger.info('Successfully geocoded location', { province, amphure, tambon, formattedAddress });
  
  return { province, amphure, tambon };
}

/**
 * Get all stations with missing admin locations
 * @returns {Promise<Array>} Array of stations
 */
async function getStationsWithMissingLocations() {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT 
        tele_station_id, 
        tele_station_name_th,
        tele_station_lat,
        tele_station_long,
        province,
        amphure,
        tambon
      FROM 
        thaiwater_tele_stations
      WHERE 
        (province IS NULL OR province = '' OR amphure IS NULL OR amphure = '')
        AND tele_station_lat IS NOT NULL 
        AND tele_station_long IS NOT NULL
      ORDER BY 
        tele_station_id
    `);
    
    client.release();
    return result.rows;
  } catch (error) {
    logger.error('Error fetching stations with missing locations', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Update station with geocoded admin location
 * @param {number} tele_station_id - Station ID in database
 * @param {Object} locationData - Location data from geocoding
 * @returns {Promise<boolean>} Success status
 */
async function updateStationLocation(tele_station_id, locationData) {
  try {
    const { province, amphure, tambon } = locationData;
    
    // Skip update if no valid province data was returned
    if (!province) {
      logger.warn('Skipping update due to missing province data', { tele_station_id });
      return false;
    }
    
    const client = await pool.connect();
    const result = await client.query(`
      UPDATE thaiwater_tele_stations
      SET 
        province = $1,
        amphure = $2,
        tambon = $3,
        updated_at = NOW()
      WHERE 
        tele_station_id = $4
      RETURNING *
    `, [
      province,
      amphure || '',
      tambon || '',
      tele_station_id
    ]);
    
    client.release();
    
    if (result.rowCount === 0) {
      logger.warn('No station updated', { tele_station_id });
      return false;
    }
    
    logger.info('Successfully updated station location', {
      tele_station_id,
      province,
      amphure,
      tambon
    });
    
    return true;
  } catch (error) {
    logger.error('Error updating station location', {
      error: error.message,
      stack: error.stack,
      tele_station_id
    });
    return false;
  }
}

/**
 * Main function to update all stations with missing admin locations
 */
async function updateRemainingAdminLocations() {
  logger.info('Starting update of remaining admin locations for telemetry stations');
  
  try {
    // Get all stations with missing admin locations
    const stations = await getStationsWithMissingLocations();
    logger.info(`Found ${stations.length} stations with missing admin locations`);
    
    if (stations.length === 0) {
      logger.info('No stations with missing admin locations found');
      return;
    }
    
    // Statistics for reporting
    const stats = {
      total: stations.length,
      processed: 0,
      updated: 0,
      failed: 0,
      skipped: 0
    };
    
    // Create a log file for failed stations to allow manual intervention
    const failedStations = [];
    
    // Process each station
    for (const station of stations) {
      logger.info(`Processing station ${station.tele_station_id} (${station.tele_station_name_th || 'Unnamed'})`, {
        tele_station_id: station.tele_station_id,
        lat: station.tele_station_lat,
        lng: station.tele_station_long
      });
      
      // Skip if invalid coordinates
      if (!station.tele_station_lat || !station.tele_station_long) {
        logger.warn('Skipping station with invalid coordinates', {
          tele_station_id: station.tele_station_id
        });
        stats.skipped++;
        stats.processed++;
        
        failedStations.push({
          tele_station_id: station.tele_station_id,
          tele_station_name_th: station.tele_station_name_th,
          error: 'Missing or invalid coordinates'
        });
        
        continue;
      }
      
      // Geocode coordinates
      const locationData = await geocodeWithGoogleMaps(
        station.tele_station_lat,
        station.tele_station_long
      );
      
      // Add delay to avoid rate limiting
      await sleep(API_DELAY_MS);
      
      if (!locationData) {
        logger.warn('Failed to geocode coordinates', {
          tele_station_id: station.tele_station_id,
          lat: station.tele_station_lat,
          lng: station.tele_station_long
        });
        stats.failed++;
        stats.processed++;
        
        // Record failed station for manual intervention
        failedStations.push({
          tele_station_id: station.tele_station_id,
          tele_station_name_th: station.tele_station_name_th,
          lat: station.tele_station_lat,
          lng: station.tele_station_long,
          error: 'Geocoding failed'
        });
        
        continue;
      }
      
      // Update station with geocoded location
      const success = await updateStationLocation(station.tele_station_id, locationData);
      
      if (success) {
        stats.updated++;
      } else {
        stats.failed++;
        
        // Record failed station for manual intervention
        failedStations.push({
          tele_station_id: station.tele_station_id,
          tele_station_name_th: station.tele_station_name_th,
          lat: station.tele_station_lat,
          lng: station.tele_station_long,
          error: 'Database update failed'
        });
      }
      
      stats.processed++;
      
      // Log progress
      if (stats.processed % 10 === 0 || stats.processed === stats.total) {
        logger.info(`Progress: ${stats.processed}/${stats.total} stations processed`, {
          updated: stats.updated,
          failed: stats.failed,
          skipped: stats.skipped
        });
      }
    }
    
    // Write failed stations to file for manual intervention
    if (failedStations.length > 0) {
      fs.writeFileSync(
        './logs/failed-stations.json', 
        JSON.stringify(failedStations, null, 2)
      );
      logger.info(`Wrote ${failedStations.length} failed stations to logs/failed-stations.json`);
    }
    
    logger.info('Completed update of remaining admin locations', stats);
    
  } catch (error) {
    logger.error('Error in updateRemainingAdminLocations', {
      error: error.message,
      stack: error.stack
    });
  } finally {
    // Close the database pool
    await pool.end();
  }
}

// Run the main function
updateRemainingAdminLocations()
  .then(() => {
    logger.info('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Script failed', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }); 