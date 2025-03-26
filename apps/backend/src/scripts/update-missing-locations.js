#!/usr/bin/env node

/**
 * Script to use Google Maps API to update administrative locations for all stations
 * that have latitude and longitude coordinates
 */
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import fs from 'fs';

// Get the current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'ec2-18-143-195-184.ap-southeast-1.compute.amazonaws.com',
  port: parseInt(process.env.DB_PORT || '15435'),
  database: process.env.DB_NAME || 'swoc-uat-gis-ssl',
  user: process.env.DB_USER || 'swoc-uat-gis-ssl-user',
  password: process.env.DB_PASSWORD || '4c0b269f763d4ce1d1d59ba0e2ef1f9c',
  ssl: { rejectUnauthorized: false } // Always enable SSL for the remote DB
};

// Create database pool
const pool = new pg.Pool(dbConfig);

// Configure API key and rate limiting
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const DELAY_BETWEEN_REQUESTS = 500; // 500ms delay between requests to avoid rate limiting
const BATCH_SIZE = 50; // Process stations in batches

/**
 * Main function to update location data for all stations with coordinates
 */
async function updateMissingLocations() {
  console.log('Starting update of location data for all stations with coordinates...');
  
  if (!GOOGLE_MAPS_API_KEY) {
    console.error('Error: Google Maps API key not found in environment variables');
    process.exit(1);
  }
  
  console.log(`Using Google Maps API key: ${GOOGLE_MAPS_API_KEY.substring(0, 5)}...${GOOGLE_MAPS_API_KEY.substring(GOOGLE_MAPS_API_KEY.length - 4)}`);
  console.log(`Connecting to database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
  
  try {
    // Get all stations with coordinates
    const stations = await getStationsWithMissingLocationData();
    console.log(`Found ${stations.length} stations with coordinates`);
    
    if (stations.length === 0) {
      console.log('No stations need updating. Exiting.');
      await pool.end();
      return;
    }
    
    // Create log file
    const logFile = path.join(__dirname, '../../logs/update-locations.log');
    console.log(`Logging results to ${logFile}`);
    
    // Create log directory if it doesn't exist
    const logDir = path.dirname(logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // Process stations in batches
    const totalBatches = Math.ceil(stations.length / BATCH_SIZE);
    let updatedCount = 0;
    let failedCount = 0;
    
    for (let i = 0; i < totalBatches; i++) {
      const startIdx = i * BATCH_SIZE;
      const endIdx = Math.min(startIdx + BATCH_SIZE, stations.length);
      const batch = stations.slice(startIdx, endIdx);
      
      console.log(`\nProcessing batch ${i + 1}/${totalBatches} (stations ${startIdx + 1}-${endIdx} of ${stations.length})`);
      
      for (const [index, station] of batch.entries()) {
        try {
          console.log(`\n[${startIdx + index + 1}/${stations.length}] Processing station: ${station.tele_station_id} - ${station.tele_station_name || 'Unnamed'}`);
          console.log(`Coordinates: ${station.tele_station_lat}, ${station.tele_station_long}`);
          
          // Call Google Maps Geocoding API
          const geocodeResult = await reverseGeocode(
            station.tele_station_lat, 
            station.tele_station_long, 
            GOOGLE_MAPS_API_KEY
          );
          
          // Process and log results
          const locationInfo = processGeocodeResult(geocodeResult, station);
          
          // Update database with location information
          const updateResult = await updateStationLocation(station.tele_station_id, locationInfo);
          
          if (updateResult) {
            updatedCount++;
            // Log success
            fs.appendFileSync(logFile, 
              `SUCCESS: Station ${station.tele_station_id} (${station.tele_station_name}) - ` +
              `Updated with province: ${locationInfo.administrative_areas.province}, ` +
              `amphure: ${locationInfo.administrative_areas.amphure}, ` +
              `tambon: ${locationInfo.administrative_areas.tambon}\n`
            );
          } else {
            failedCount++;
            // Log failure
            fs.appendFileSync(logFile, 
              `FAILED: Station ${station.tele_station_id} (${station.tele_station_name}) - ` +
              `No location data found or database update failed\n`
            );
          }
          
          // Delay between requests
          if (index < batch.length - 1) {
            await delay(DELAY_BETWEEN_REQUESTS);
          }
        } catch (error) {
          console.error(`Error processing station ${station.tele_station_id}: ${error.message}`);
          failedCount++;
          // Log error
          fs.appendFileSync(logFile, 
            `ERROR: Station ${station.tele_station_id} (${station.tele_station_name}) - ${error.message}\n`
          );
        }
      }
      
      console.log(`\nCompleted batch ${i + 1}/${totalBatches}`);
      console.log(`Progress: ${updatedCount} updated, ${failedCount} failed, ${updatedCount + failedCount}/${stations.length} processed`);
    }
    
    console.log('\nUpdate process completed');
    console.log(`Total stations processed: ${stations.length}`);
    console.log(`Stations successfully updated: ${updatedCount}`);
    console.log(`Stations failed to update: ${failedCount}`);
    console.log(`Results logged to: ${logFile}`);
    
  } catch (error) {
    console.error(`Error updating station locations: ${error.message}`);
    if (error.stack) {
      console.error(`Error stack: ${error.stack}`);
    }
  } finally {
    // Close database pool
    await pool.end();
  }
}

/**
 * Get stations with latitude and longitude but missing location data
 * 
 * @returns {Array} - Array of stations with missing location data
 */
async function getStationsWithMissingLocationData() {
  try {
    const query = `
      SELECT tele_station_id, tele_station_name, tele_station_lat, tele_station_long, 
             province, amphure, tambon
      FROM thaiwater_tele_stations
      WHERE tele_station_lat IS NOT NULL 
        AND tele_station_long IS NOT NULL
      ORDER BY tele_station_id
    `;
    
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error(`Error getting stations with latitude and longitude: ${error.message}`);
    throw error;
  }
}

/**
 * Call Google Maps Geocoding API to reverse geocode coordinates
 * 
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @param {string} apiKey - Google Maps API key
 * @returns {Object} - Geocoding API response
 */
async function reverseGeocode(latitude, longitude, apiKey) {
  const url = 'https://maps.googleapis.com/maps/api/geocode/json';
  
  const params = {
    latlng: `${latitude},${longitude}`,
    key: apiKey,
    language: 'th', // Get results in Thai language
    result_type: 'administrative_area_level_1|administrative_area_level_2|administrative_area_level_3'
  };
  
  console.log(`Making request to Google Maps Geocoding API...`);
  
  try {
    const response = await axios.get(url, { params });
    
    console.log(`API Response Status: ${response.data.status}`);
    
    if (response.data.status !== 'OK') {
      console.error(`API Error: ${response.data.status} - ${response.data.error_message || 'Unknown error'}`);
    }
    
    return response.data;
  } catch (error) {
    console.error(`Error calling Google Maps API: ${error.message}`);
    throw error;
  }
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
      latitude: station.tele_station_lat,
      longitude: station.tele_station_long,
      name: station.tele_station_name
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
    console.warn(`No geocoding results found for station ${station.tele_station_id}`);
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
  
  console.log('Extracted location information:');
  console.log(` - Province: ${locationInfo.administrative_areas.province || 'Not found'}`);
  console.log(` - Amphure: ${locationInfo.administrative_areas.amphure || 'Not found'}`);
  console.log(` - Tambon: ${locationInfo.administrative_areas.tambon || 'Not found'}`);
  
  return locationInfo;
}

/**
 * Update station location in the database
 * 
 * @param {number} stationId - Station ID
 * @param {Object} locationInfo - Location information
 * @returns {boolean} - True if update was successful
 */
async function updateStationLocation(stationId, locationInfo) {
  if (!locationInfo.administrative_areas.province) {
    console.warn(`No province found for station ${stationId}, skipping update`);
    return false;
  }
  
  try {
    // Always update with new geocoded data, replacing any existing values
    const query = `
      UPDATE thaiwater_tele_stations
      SET province = $1,
          amphure = $2,
          tambon = $3,
          updated_at = NOW()
      WHERE tele_station_id = $4
    `;
    
    const params = [
      locationInfo.administrative_areas.province,
      locationInfo.administrative_areas.amphure || '',
      locationInfo.administrative_areas.tambon || '',
      stationId
    ];
    
    const result = await pool.query(query, params);
    
    console.log(`Updated station ${stationId} with location data: ${result.rowCount} row(s) affected`);
    
    return result.rowCount > 0;
  } catch (error) {
    console.error(`Error updating station ${stationId} location: ${error.message}`);
    return false;
  }
}

/**
 * Delay execution for specified milliseconds
 * 
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} - Promise that resolves after the delay
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the function
updateMissingLocations().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 