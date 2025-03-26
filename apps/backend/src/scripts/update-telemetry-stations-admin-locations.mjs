// Script to update missing administrative locations for telemetry_data_stations
// This script uses Google Maps API to get province and amphure data for stations with coordinates
import dotenv from 'dotenv';
import pg from 'pg';
import axios from 'axios';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
const envPath = path.join(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.log(`Backend .env file not found at: ${envPath}`);
  dotenv.config(); // Try default location
}

// Google Maps API configuration
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const GOOGLE_MAPS_API_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

if (!GOOGLE_MAPS_API_KEY) {
  console.error('Missing Google Maps API key. Please set GOOGLE_MAPS_API_KEY in your .env file.');
  process.exit(1);
}

// Database configuration
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Configuration
const BATCH_SIZE = 50; // Number of stations to process in one batch
const API_DELAY_MS = 500; // Delay between API requests to avoid rate limiting
const MAX_STATIONS = process.env.MAX_STATIONS ? parseInt(process.env.MAX_STATIONS) : 0; // Max stations to process, 0 for all

// Statistics for reporting
const stats = {
  total: 0,
  processed: 0,
  updated: 0,
  failed: 0,
  skipped: 0
};

// Results for logging
const results = [];

// Sleep function to pause between API requests
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Geocode coordinates using Google Maps API
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<{province: string, amphure: string}>}
 */
async function geocodeWithGoogleMaps(lat, lng) {
  try {
    // Ensure coordinates are valid numbers
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    
    if (isNaN(latitude) || isNaN(longitude)) {
      console.error('Invalid coordinates for Google Maps geocoding', { lat, lng });
      return null;
    }
    
    console.log(`Making Google Maps geocoding request for [${latitude}, ${longitude}]`);
    
    const response = await axios.get(GOOGLE_MAPS_API_URL, {
      params: {
        latlng: `${latitude},${longitude}`,
        key: GOOGLE_MAPS_API_KEY,
        language: 'th',
        result_type: 'administrative_area_level_1|administrative_area_level_2'
      }
    });

    if (response.data.status !== 'OK') {
      console.warn('Google Maps API returned non-OK status', { 
        status: response.data.status, 
        error: response.data.error_message 
      });
      return null;
    }

    if (!response.data.results || response.data.results.length === 0) {
      console.warn('Google Maps API returned no results', { latitude, longitude });
      return null;
    }

    // Extract province and amphure from address components
    const result = response.data.results[0];
    let province = '';
    let amphure = '';

    for (const component of result.address_components) {
      if (component.types.includes('administrative_area_level_1')) {
        province = component.long_name;
      } else if (component.types.includes('administrative_area_level_2')) {
        amphure = component.long_name;
        // Remove "อำเภอ" or "เขต" prefix if present
        amphure = amphure.replace(/^(อำเภอ|เขต)\s+/, '');
      }
    }

    console.log('Successfully geocoded location', { province, amphure });
    
    return { province, amphure };
  } catch (error) {
    console.error('Error while geocoding with Google Maps', {
      error: error.message,
      lat,
      lng
    });
    return null;
  }
}

/**
 * Get telemetry stations missing administrative location information
 * @param {number} limit - Maximum number of stations to retrieve
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Array>} Array of stations
 */
async function getStationsWithMissingLocations(limit = BATCH_SIZE, offset = 0) {
  try {
    const client = await pool.connect();
    
    // Get stations with coordinates but missing province or amphure
    const query = `
      SELECT 
        id, 
        station_id,
        station_name,
        latitude,
        longitude,
        province,
        amphure,
        data_source
      FROM 
        telemetry_data_stations
      WHERE 
        (province IS NULL OR province = '' OR amphure IS NULL OR amphure = '')
        AND latitude IS NOT NULL 
        AND longitude IS NOT NULL
        AND latitude != 0 
        AND longitude != 0
      ORDER BY 
        id
      LIMIT $1 OFFSET $2
    `;
    
    const result = await client.query(query, [limit, offset]);
    client.release();
    
    return result.rows;
  } catch (error) {
    console.error('Error fetching stations with missing locations:', error.message);
    throw error;
  }
}

/**
 * Count total stations with missing locations
 * @returns {Promise<number>} Total count
 */
async function countStationsWithMissingLocations() {
  try {
    const client = await pool.connect();
    
    const query = `
      SELECT COUNT(*) AS total
      FROM telemetry_data_stations
      WHERE 
        (province IS NULL OR province = '' OR amphure IS NULL OR amphure = '')
        AND latitude IS NOT NULL 
        AND longitude IS NOT NULL
        AND latitude != 0 
        AND longitude != 0
    `;
    
    const result = await client.query(query);
    client.release();
    
    return parseInt(result.rows[0].total);
  } catch (error) {
    console.error('Error counting stations with missing locations:', error.message);
    throw error;
  }
}

/**
 * Update station with geocoded admin location
 * @param {number} id - Station ID in database
 * @param {Object} locationData - Location data from geocoding
 * @returns {Promise<boolean>} Success status
 */
async function updateStationLocation(id, locationData) {
  try {
    const { province, amphure } = locationData;
    
    // Skip update if no valid data was returned
    if (!province && !amphure) {
      console.warn(`Skipping update due to missing location data for station ID ${id}`);
      return false;
    }
    
    const client = await pool.connect();
    const result = await client.query(`
      UPDATE telemetry_data_stations
      SET 
        province = $1,
        amphure = $2,
        updated_at = NOW()
      WHERE 
        id = $3
      RETURNING id, station_id, station_name
    `, [
      province || '',
      amphure || '',
      id
    ]);
    
    client.release();
    
    if (result.rowCount === 0) {
      console.warn(`No station updated with ID ${id}`);
      return false;
    }
    
    console.log(`Successfully updated station ${id} (${result.rows[0].station_id}: ${result.rows[0].station_name}) location:`, {
      province,
      amphure
    });
    
    return true;
  } catch (error) {
    console.error(`Error updating station ${id} location:`, error.message);
    return false;
  }
}

/**
 * Process stations in batches
 */
async function processStationsInBatches() {
  try {
    // Get total count for progress tracking
    stats.total = await countStationsWithMissingLocations();
    console.log(`Found ${stats.total} stations with missing location information`);
    
    // Limit total if MAX_STATIONS is set
    if (MAX_STATIONS > 0 && MAX_STATIONS < stats.total) {
      console.log(`Limiting to ${MAX_STATIONS} stations as specified`);
      stats.total = MAX_STATIONS;
    }
    
    // Process in batches
    let offset = 0;
    let batchNumber = 1;
    
    while (stats.processed < stats.total) {
      const limit = Math.min(BATCH_SIZE, stats.total - stats.processed);
      console.log(`\nProcessing batch ${batchNumber}, stations ${offset+1} to ${offset+limit}`);
      
      const stations = await getStationsWithMissingLocations(limit, offset);
      if (stations.length === 0) {
        console.log('No more stations to process');
        break;
      }
      
      for (const station of stations) {
        console.log(`\nProcessing station ID ${station.id} (${station.station_id}: ${station.station_name || 'Unnamed'})`);
        console.log(`Coordinates: [${station.latitude}, ${station.longitude}]`);
        console.log(`Current data: Province=${station.province || 'NULL'}, Amphure=${station.amphure || 'NULL'}`);
        
        // Skip if invalid coordinates (should be caught by query, but double check)
        if (!station.latitude || !station.longitude || 
            station.latitude === 0 || station.longitude === 0) {
          console.warn(`Skipping station ${station.id} with invalid coordinates`);
          stats.skipped++;
          stats.processed++;
          
          results.push({
            id: station.id,
            station_id: station.station_id,
            station_name: station.station_name,
            status: 'skipped',
            reason: 'Invalid coordinates'
          });
          
          continue;
        }
        
        // Geocode coordinates
        const locationData = await geocodeWithGoogleMaps(
          station.latitude,
          station.longitude
        );
        
        // Add delay to avoid rate limiting
        await sleep(API_DELAY_MS);
        
        if (!locationData || (!locationData.province && !locationData.amphure)) {
          console.warn(`Failed to geocode coordinates for station ${station.id}`);
          stats.failed++;
          stats.processed++;
          
          results.push({
            id: station.id,
            station_id: station.station_id,
            station_name: station.station_name,
            status: 'failed',
            reason: 'Geocoding failed'
          });
          
          continue;
        }
        
        // Update station with geocoded location
        const success = await updateStationLocation(station.id, locationData);
        
        if (success) {
          stats.updated++;
          
          results.push({
            id: station.id,
            station_id: station.station_id,
            station_name: station.station_name,
            status: 'updated',
            location: locationData
          });
        } else {
          stats.failed++;
          
          results.push({
            id: station.id,
            station_id: station.station_id,
            station_name: station.station_name,
            status: 'failed',
            reason: 'Database update failed'
          });
        }
        
        stats.processed++;
        console.log(`Progress: ${stats.processed}/${stats.total} (${Math.round(stats.processed/stats.total*100)}%)`);
      }
      
      offset += stations.length;
      batchNumber++;
    }
    
    // Print summary
    console.log('\nGeocoding Summary:');
    console.log(`Total stations processed: ${stats.processed}/${stats.total}`);
    console.log(`Updated: ${stats.updated}`);
    console.log(`Failed: ${stats.failed}`);
    console.log(`Skipped: ${stats.skipped}`);
    
    // Save results to file
    const resultsJson = JSON.stringify(results, null, 2);
    const resultsFilename = `telemetry-stations-location-update-results-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(resultsFilename, resultsJson);
    console.log(`\nDetailed results saved to ${resultsFilename}`);
    
  } catch (error) {
    console.error('Error during station processing:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

/**
 * Main function
 */
async function main() {
  console.log('Starting update of missing administrative locations for telemetry stations');
  console.log(`Using Google Maps API with key: ${GOOGLE_MAPS_API_KEY.substring(0, 6)}...`);
  
  try {
    await processStationsInBatches();
  } catch (error) {
    console.error('Unhandled error:', error);
    process.exit(1);
  }
}

// Run the main function
main(); 