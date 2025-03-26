
// Script to fix remaining administrative locations for telemetry stations
// More gentle approach with longer delays and simplified query
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
      filename: 'fix-remaining-admin-locations.log',
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

// Delay between API requests to avoid rate limiting - much longer delay
const API_DELAY_MS = 3000;
const MAX_RETRIES = 5;
const BATCH_SIZE = 5; // Smaller batch size

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
    
    // Make the API request with a less specific query to maximize chances of getting results
    const response = await axios.get(GOOGLE_MAPS_API_URL, {
      params: {
        latlng: `${latitude},${longitude}`,
        key: GOOGLE_MAPS_API_KEY,
        language: 'th',
        // No result_type filter to get all possible results
      },
      timeout: 20000 // Longer timeout
    });

    if (response.data.status !== 'OK') {
      logger.warn('Google Maps API returned non-OK status', { 
        status: response.data.status, 
        error: response.data.error_message,
        lat,
        lng
      });
      
      if (retryCount < MAX_RETRIES) {
        const retryDelayMs = API_DELAY_MS * (retryCount + 1); // Exponential backoff
        logger.info(`Waiting ${retryDelayMs}ms before retry`, { lat, lng });
        await sleep(retryDelayMs);
        return geocodeWithGoogleMaps(lat, lng, retryCount + 1);
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
    
    if (retryCount < MAX_RETRIES) {
      const retryDelayMs = API_DELAY_MS * (retryCount + 2); // Longer exponential backoff after error
      logger.info(`Retrying geocoding (${retryCount + 1}/${MAX_RETRIES}) after ${retryDelayMs}ms delay`, { lat, lng });
      await sleep(retryDelayMs);
      return geocodeWithGoogleMaps(lat, lng, retryCount + 1);
    }
    
    return null;
  }
}

/**
 * Extract location information from Google Maps API response
 * @param {Object} response - API response from Google Maps
 * @returns {Object} - Location data
 */
function extractLocationFromResponse(response) {
  let province = '';
  let amphure = '';
  let tambon = '';
  let formattedAddress = '';
  
  // Get the formatted address from the first result
  if (response.results && response.results.length > 0) {
    formattedAddress = response.results[0].formatted_address;
    
    // Extract admin components from address components
    for (const result of response.results) {
      for (const component of result.address_components) {
        // Province (administrative_area_level_1)
        if (component.types.includes('administrative_area_level_1') && !province) {
          province = component.long_name;
        }
        
        // Amphure/District (administrative_area_level_2)
        if (component.types.includes('administrative_area_level_2') && !amphure) {
          amphure = component.long_name;
        }
        
        // Tambon/Subdistrict (administrative_area_level_3)
        if (component.types.includes('administrative_area_level_3') && !tambon) {
          tambon = component.long_name;
        }
      }
      
      // Break if we have found all three levels
      if (province && amphure && tambon) {
        break;
      }
    }
  }
  
  // Special case for Bangkok which has districts instead of amphures
  if (province === 'กรุงเทพมหานคร') {
    logger.info('Bangkok location identified', { province, tambon });
    
    // Bangkok often returns subdistrict (แขวง) in the tambon field
    // We need to extract the district (เขต) name
    for (const result of response.results) {
      for (const component of result.address_components) {
        // Look for locality or sublocality as potential district names
        if ((component.types.includes('locality') || 
            component.types.includes('sublocality') || 
            component.types.includes('sublocality_level_1')) && 
            !amphure) {
          amphure = component.long_name;
          
          // Remove "เขต" prefix if present to standardize
          if (amphure.startsWith('เขต')) {
            amphure = amphure.substring(3).trim();
          }
        }
      }
    }
    
    // Last resort - use tambon as a potential district if we still have no amphure
    if (!amphure && tambon) {
      amphure = tambon;
      logger.info('Using tambon as Bangkok district fallback', { amphure });
    }
  }

  logger.info('Successfully geocoded location', { province, amphure, tambon, formattedAddress });
  
  return { province, amphure, tambon };
}

/**
 * Get remaining stations with missing admin locations
 * @returns {Promise<Array>} Array of stations
 */
async function getRemainingStations() {
  const client = await pool.connect();
  try {
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
    
    return result.rows;
  } catch (error) {
    logger.error('Error fetching remaining stations', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Update station with geocoded admin location
 * @param {number} tele_station_id - Station ID in database
 * @param {Object} locationData - Location data from geocoding
 * @returns {Promise<boolean>} Success status
 */
async function updateStationLocation(tele_station_id, locationData) {
  // Skip update if no valid province data was returned
  if (!locationData || !locationData.province) {
    logger.warn('Skipping update due to missing province data', { tele_station_id });
    return false;
  }
  
  const { province, amphure, tambon } = locationData;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
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
    
    await client.query('COMMIT');
    
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
    await client.query('ROLLBACK');
    logger.error('Error updating station location', {
      error: error.message,
      stack: error.stack,
      tele_station_id
    });
    return false;
  } finally {
    client.release();
  }
}

/**
 * Main function to fix remaining admin locations
 */
async function fixRemainingAdminLocations() {
  logger.info('Starting update of remaining admin locations for telemetry stations');
  
  try {
    // Get remaining stations with missing admin locations
    const stations = await getRemainingStations();
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
      failed: 0
    };
    
    // Process stations one by one with long delays
    for (const station of stations) {
      try {
        logger.info(`Processing station ${station.tele_station_id} (${station.tele_station_name_th || 'Unnamed'})`, {
          tele_station_id: station.tele_station_id,
          lat: station.tele_station_lat,
          lng: station.tele_station_long
        });
        
        // Get geocoded location data
        const locationData = await geocodeWithGoogleMaps(
          station.tele_station_lat,
          station.tele_station_long
        );
        
        // Add longer delay between API requests
        logger.info(`Waiting ${API_DELAY_MS}ms before next operation...`);
        await sleep(API_DELAY_MS);
        
        // Update station with geocoded location
        if (locationData && locationData.province) {
          const success = await updateStationLocation(station.tele_station_id, locationData);
          
          if (success) {
            stats.updated++;
          } else {
            stats.failed++;
          }
        } else {
          logger.warn('Failed to geocode coordinates', {
            tele_station_id: station.tele_station_id,
            lat: station.tele_station_lat,
            lng: station.tele_station_long
          });
          stats.failed++;
        }
        
        stats.processed++;
        
        // Log progress
        logger.info(`Progress: ${stats.processed}/${stats.total}`, {
          updated: stats.updated,
          failed: stats.failed
        });
        
        // Add additional delay between stations
        logger.info(`Waiting ${API_DELAY_MS}ms before processing next station...`);
        await sleep(API_DELAY_MS);
        
      } catch (error) {
        logger.error('Error processing station', {
          error: error.message,
          stack: error.stack,
          tele_station_id: station.tele_station_id
        });
        stats.failed++;
        stats.processed++;
        
        // Add longer recovery delay after error
        await sleep(API_DELAY_MS * 2);
      }
    }
    
    logger.info('Completed update of remaining admin locations', stats);
  } catch (error) {
    logger.error('Error in fixRemainingAdminLocations', {
      error: error.message,
      stack: error.stack
    });
  } finally {
    // Close the database pool
    await pool.end();
  }
}

// Run the main function
fixRemainingAdminLocations()
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