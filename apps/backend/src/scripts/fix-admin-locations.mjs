// Script to update remaining administrative locations for telemetry stations
// Uses Google Maps API with improved error handling, retry logic and better transaction handling
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
      filename: 'fix-admin-locations.log',
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
const API_DELAY_MS = 300;
const MAX_RETRIES = 3;
const BATCH_SIZE = 20;
const MAX_CONCURRENT_BATCHES = 5;
const CACHE_SIZE = 1000;

// Sleep function to pause between API requests
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Simple geocoding cache to avoid redundant API calls for nearby locations
const geocodingCache = new Map();

// Function to find nearest cached location
function findNearestCachedLocation(lat, lng, maxDistanceKm = 0.5) {
  for (const [key, value] of geocodingCache.entries()) {
    const [cachedLat, cachedLng] = key.split(',').map(parseFloat);
    
    // Calculate distance using Haversine formula (simplified for nearby locations)
    const latDiff = (cachedLat - lat) * 111; // 1 degree ≈ 111km
    const lngDiff = (cachedLng - lng) * 111 * Math.cos(lat * Math.PI / 180);
    const distanceKm = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
    
    if (distanceKm <= maxDistanceKm) {
      logger.info('Using cached geocoding result for nearby location', {
        distance: distanceKm.toFixed(2),
        original: `${lat},${lng}`,
        cached: `${cachedLat},${cachedLng}`
      });
      return value;
    }
  }
  return null;
}

/**
 * Geocode coordinates using Google Maps API with retry and caching
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
    
    // Check cache first
    const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    if (geocodingCache.has(cacheKey)) {
      return geocodingCache.get(cacheKey);
    }
    
    // Check for nearby cached locations
    const nearbyResult = findNearestCachedLocation(latitude, longitude);
    if (nearbyResult) {
      return nearbyResult;
    }
    
    logger.info('Making Google Maps geocoding request', { latitude, longitude, retryCount });
    
    // Make the API request
    const response = await axios.get(GOOGLE_MAPS_API_URL, {
      params: {
        latlng: `${latitude},${longitude}`,
        key: GOOGLE_MAPS_API_KEY,
        language: 'th',
        result_type: 'administrative_area_level_1|administrative_area_level_2|administrative_area_level_3'
      },
      timeout: 10000
    });

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
          const result = extractLocationFromResponse(broadResponse.data);
          if (result && result.province) {
            // Cache the result
            if (geocodingCache.size >= CACHE_SIZE) {
              // Remove oldest entry if cache is full
              const oldestKey = geocodingCache.keys().next().value;
              geocodingCache.delete(oldestKey);
            }
            geocodingCache.set(cacheKey, result);
          }
          return result;
        }
      }
      
      return null;
    }

    if (!response.data.results || response.data.results.length === 0) {
      logger.warn('Google Maps API returned no results', { latitude, longitude });
      return null;
    }

    const result = extractLocationFromResponse(response.data);
    
    // Cache the result
    if (result && result.province) {
      if (geocodingCache.size >= CACHE_SIZE) {
        // Remove oldest entry if cache is full
        const oldestKey = geocodingCache.keys().next().value;
        geocodingCache.delete(oldestKey);
      }
      geocodingCache.set(cacheKey, result);
    }
    
    return result;
    
  } catch (error) {
    logger.error('Error while geocoding with Google Maps', {
      error: error.message,
      lat,
      lng,
      retryCount
    });
    
    if (retryCount < MAX_RETRIES) {
      logger.info(`Retrying geocoding (${retryCount + 1}/${MAX_RETRIES})`, { lat, lng });
      await sleep(API_DELAY_MS * 2); // Longer delay for retry after error
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
 * Get stations with missing admin locations with pagination
 * @param {number} offset - Pagination offset
 * @param {number} limit - Number of records to retrieve
 * @returns {Promise<Array>} Array of stations
 */
async function getStationsWithMissingLocations(offset = 0, limit = 100) {
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
        AND tele_station_lat BETWEEN 5.5 AND 20.5
        AND tele_station_long BETWEEN 97.5 AND 105.5
      ORDER BY 
        tele_station_id
      OFFSET $1
      LIMIT $2
    `, [offset, limit]);
    
    return result.rows;
  } catch (error) {
    logger.error('Error fetching stations with missing locations', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Count total stations with missing admin locations
 * @returns {Promise<number>} Total count
 */
async function countStationsWithMissingLocations() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        COUNT(*) as total
      FROM 
        thaiwater_tele_stations
      WHERE 
        (province IS NULL OR province = '' OR amphure IS NULL OR amphure = '')
        AND tele_station_lat IS NOT NULL 
        AND tele_station_long IS NOT NULL
        AND tele_station_lat BETWEEN 5.5 AND 20.5
        AND tele_station_long BETWEEN 97.5 AND 105.5
    `);
    
    return parseInt(result.rows[0].total, 10);
  } catch (error) {
    logger.error('Error counting stations with missing locations', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Update station with geocoded admin location using a transaction
 * @param {Object} client - Database client
 * @param {number} tele_station_id - Station ID in database
 * @param {Object} locationData - Location data from geocoding
 * @returns {Promise<boolean>} Success status
 */
async function updateStationLocation(client, tele_station_id, locationData) {
  // Skip update if no valid province data was returned
  if (!locationData || !locationData.province) {
    logger.warn('Skipping update due to missing province data', { tele_station_id });
    return false;
  }
  
  const { province, amphure, tambon } = locationData;
  
  try {
    // Use the passed client to ensure it's part of the transaction
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
    logger.error('Error updating station location within transaction', {
      error: error.message,
      stack: error.stack,
      tele_station_id
    });
    throw error; // Throw to trigger transaction rollback
  }
}

/**
 * Process a batch of stations with a single transaction
 * @param {Array} stations - Batch of stations to process
 * @returns {Promise<{updated: number, failed: number, processed: number}>} Batch statistics
 */
async function processBatch(stations) {
  const batchStats = {
    processed: 0,
    updated: 0,
    failed: 0
  };
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    for (const station of stations) {
      logger.info(`Processing station ${station.tele_station_id} (${station.tele_station_name_th || 'Unnamed'})`, {
        tele_station_id: station.tele_station_id,
        lat: station.tele_station_lat,
        lng: station.tele_station_long
      });
      
      try {
        // Get geocoded location data
        const locationData = await geocodeWithGoogleMaps(
          station.tele_station_lat,
          station.tele_station_long
        );
        
        // Add delay to avoid rate limiting
        await sleep(API_DELAY_MS);
        
        if (!locationData || !locationData.province) {
          logger.warn('Failed to geocode coordinates', {
            tele_station_id: station.tele_station_id,
            lat: station.tele_station_lat,
            lng: station.tele_station_long
          });
          batchStats.failed++;
          batchStats.processed++;
          continue;
        }
        
        // Update station with geocoded location in the transaction
        const success = await updateStationLocation(client, station.tele_station_id, locationData);
        
        if (success) {
          batchStats.updated++;
        } else {
          batchStats.failed++;
        }
        
        batchStats.processed++;
      } catch (error) {
        logger.error('Error processing station', {
          error: error.message,
          stack: error.stack,
          tele_station_id: station.tele_station_id
        });
        batchStats.failed++;
        batchStats.processed++;
      }
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    logger.info(`Batch completed: ${batchStats.updated} updated, ${batchStats.failed} failed`);
    
    return batchStats;
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    logger.error('Transaction error in batch processing', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Process stations in parallel
 * @param {Array} stations - Array of stations to process
 * @returns {Promise<{updated: number, failed: number, processed: number}>} Batch statistics
 */
async function processStationsParallel(stations) {
  // Split stations into smaller batches
  const batches = [];
  for (let i = 0; i < stations.length; i += BATCH_SIZE) {
    batches.push(stations.slice(i, i + BATCH_SIZE));
  }
  
  // Process batches with concurrency control
  const results = { updated: 0, failed: 0, processed: 0 };
  
  // Process batches in chunks to control concurrency
  for (let i = 0; i < batches.length; i += MAX_CONCURRENT_BATCHES) {
    const currentBatches = batches.slice(i, i + MAX_CONCURRENT_BATCHES);
    logger.info(`Processing ${currentBatches.length} batches concurrently (${i+1}-${Math.min(i+MAX_CONCURRENT_BATCHES, batches.length)} of ${batches.length})`);
    
    // Process current set of batches in parallel
    const batchPromises = currentBatches.map(batch => processBatch(batch));
    const batchResults = await Promise.all(batchPromises);
    
    // Aggregate results
    for (const result of batchResults) {
      results.updated += result.updated;
      results.failed += result.failed;
      results.processed += result.processed;
    }
    
    logger.info(`Completed ${currentBatches.length} batches, progress: ${results.processed}/${stations.length}`, {
      updated: results.updated,
      failed: results.failed
    });
  }
  
  return results;
}

/**
 * Main function to update stations with missing admin locations
 */
async function fixAdminLocations() {
  logger.info('Starting update of admin locations for telemetry stations');
  
  try {
    // Get total count of stations with missing admin locations
    const totalStations = await countStationsWithMissingLocations();
    logger.info(`Found ${totalStations} stations with missing admin locations`);
    
    if (totalStations === 0) {
      logger.info('No stations with missing admin locations found');
      return;
    }
    
    // Statistics for reporting
    const stats = {
      total: totalStations,
      processed: 0,
      updated: 0,
      failed: 0
    };
    
    // Pagination settings
    const PAGE_SIZE = 200;
    let currentOffset = 0;
    
    // Process all stations with pagination
    while (currentOffset < totalStations) {
      // Get current page of stations
      const stations = await getStationsWithMissingLocations(currentOffset, PAGE_SIZE);
      logger.info(`Processing page ${Math.floor(currentOffset/PAGE_SIZE) + 1}, size: ${stations.length}`);
      
      if (stations.length === 0) {
        break; // No more stations to process
      }
      
      // Process stations in parallel
      const pageResults = await processStationsParallel(stations);
      
      // Update overall statistics
      stats.processed += pageResults.processed;
      stats.updated += pageResults.updated;
      stats.failed += pageResults.failed;
      
      // Log progress
      logger.info(`Completed page ${Math.floor(currentOffset/PAGE_SIZE) + 1}, overall progress: ${stats.processed}/${stats.total}`, {
        updated: stats.updated,
        failed: stats.failed
      });
      
      // Move to next page
      currentOffset += PAGE_SIZE;
      logger.info(`Moving to next page, offset: ${currentOffset}`);
    }
    
    logger.info('Completed update of admin locations', stats);
  } catch (error) {
    logger.error('Error in fixAdminLocations', {
      error: error.message,
      stack: error.stack
    });
  } finally {
    // Close the database pool
    await pool.end();
  }
}

// Run the main function
fixAdminLocations()
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