// Script to update missing administrative locations for telemetry stations
// Uses Google Maps API to geocode coordinates where province and amphure are NULL
import dotenv from 'dotenv';
import pg from 'pg';
import axios from 'axios';
import winston from 'winston';

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
    new winston.transports.Console()
  ]
});

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
const API_DELAY_MS = 500;

// Sleep function to pause between API requests
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Geocode coordinates using Google Maps API
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<{province: string, amphure: string, tambon: string}>}
 */
async function geocodeWithGoogleMaps(lat, lng) {
  try {
    // Ensure coordinates are valid numbers
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    
    if (isNaN(latitude) || isNaN(longitude)) {
      logger.error('Invalid coordinates for Google Maps geocoding', { lat, lng });
      return null;
    }
    
    logger.info('Making Google Maps geocoding request', { latitude, longitude });
    
    const response = await axios.get(GOOGLE_MAPS_API_URL, {
      params: {
        latlng: `${latitude},${longitude}`,
        key: GOOGLE_MAPS_API_KEY,
        language: 'th',
        result_type: 'administrative_area_level_1|administrative_area_level_2|administrative_area_level_3'
      }
    });

    if (response.data.status !== 'OK') {
      logger.warn('Google Maps API returned non-OK status', { 
        status: response.data.status, 
        error: response.data.error_message 
      });
      return null;
    }

    if (!response.data.results || response.data.results.length === 0) {
      logger.warn('Google Maps API returned no results', { latitude, longitude });
      return null;
    }

    // Extract province, amphure, and tambon from address components
    const result = response.data.results[0];
    let province = '';
    let amphure = '';
    let tambon = '';

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
    }

    logger.info('Successfully geocoded location', { province, amphure, tambon });
    
    return { province, amphure, tambon };
  } catch (error) {
    logger.error('Error while geocoding with Google Maps', {
      error: error.message,
      lat,
      lng
    });
    return null;
  }
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
      error: error.message
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
    
    // Skip update if no valid data was returned
    if (!province && !amphure) {
      logger.warn('Skipping update due to missing location data', { tele_station_id });
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
      province || '',
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
      tele_station_id
    });
    return false;
  }
}

/**
 * Main function to update all stations with missing admin locations
 */
async function updateMissingAdminLocations() {
  logger.info('Starting update of missing admin locations for telemetry stations');
  
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
    
    // Process each station
    for (const station of stations) {
      logger.info(`Processing station ${station.tele_station_id} (${station.tele_station_name_th})`, {
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
        continue;
      }
      
      // Update station with geocoded location
      const success = await updateStationLocation(station.tele_station_id, locationData);
      
      if (success) {
        stats.updated++;
      } else {
        stats.failed++;
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
    
    logger.info('Completed update of missing admin locations', stats);
    
  } catch (error) {
    logger.error('Error in updateMissingAdminLocations', {
      error: error.message,
      stack: error.stack
    });
  } finally {
    // Close the database pool
    await pool.end();
  }
}

// Run the main function
updateMissingAdminLocations()
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