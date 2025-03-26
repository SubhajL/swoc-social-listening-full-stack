// Script to geocode specific telemetry stations using Google Maps API
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
const envPath = path.join(__dirname, 'apps/backend/.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.log(`Backend .env file not found at: ${envPath}`);
  dotenv.config(); // Try default location
}

// Station IDs from the screenshot
const STATION_IDS = [
  '1128781',
  '1128919',
  '1128728',
  '1128411',
  '1128683',
  '1128155',
  '1128954',
  '457560',
  '1128951',
  '1128319'
];

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
      console.error('Invalid coordinates for Google Maps geocoding', { lat, lng });
      return null;
    }
    
    console.log(`Making Google Maps geocoding request for [${latitude}, ${longitude}]`);
    
    const response = await axios.get(GOOGLE_MAPS_API_URL, {
      params: {
        latlng: `${latitude},${longitude}`,
        key: GOOGLE_MAPS_API_KEY,
        language: 'th',
        result_type: 'administrative_area_level_1|administrative_area_level_2|administrative_area_level_3'
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

    console.log('Successfully geocoded location', { province, amphure, tambon });
    
    return { province, amphure, tambon };
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
 * Get specific stations by IDs
 * @returns {Promise<Array>} Array of stations
 */
async function getSpecificStations() {
  try {
    const client = await pool.connect();
    const placeholders = STATION_IDS.map((_, i) => `$${i + 1}`).join(',');
    
    const query = `
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
        tele_station_id IN (${placeholders})
      ORDER BY 
        tele_station_id
    `;
    
    const result = await client.query(query, STATION_IDS);
    client.release();
    
    return result.rows;
  } catch (error) {
    console.error('Error fetching specific stations:', error.message);
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
      console.warn(`Skipping update due to missing location data for station ${tele_station_id}`);
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
      console.warn(`No station updated with ID ${tele_station_id}`);
      return false;
    }
    
    console.log(`Successfully updated station ${tele_station_id} location:`, {
      province,
      amphure,
      tambon
    });
    
    return true;
  } catch (error) {
    console.error(`Error updating station ${tele_station_id} location:`, error.message);
    return false;
  }
}

/**
 * Main function to geocode specific stations
 */
async function geocodeSpecificStations() {
  console.log('Starting geocoding of specific telemetry stations');
  console.log(`Station IDs to process: ${STATION_IDS.join(', ')}`);
  
  try {
    // Get specific stations
    const stations = await getSpecificStations();
    console.log(`Found ${stations.length} stations to process`);
    
    if (stations.length === 0) {
      console.log('No stations found with the specified IDs');
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
    
    // Create results array
    const results = [];
    
    // Process each station
    for (const station of stations) {
      console.log(`\nProcessing station ${station.tele_station_id} (${station.tele_station_name_th || 'Unnamed'})`);
      console.log(`Coordinates: [${station.tele_station_lat}, ${station.tele_station_long}]`);
      console.log(`Current data: Province=${station.province || 'NULL'}, Amphure=${station.amphure || 'NULL'}, Tambon=${station.tambon || 'NULL'}`);
      
      // Skip if invalid coordinates
      if (!station.tele_station_lat || !station.tele_station_long || 
          station.tele_station_lat === 0 || station.tele_station_long === 0) {
        console.warn(`Skipping station ${station.tele_station_id} with invalid coordinates`);
        stats.skipped++;
        stats.processed++;
        
        results.push({
          tele_station_id: station.tele_station_id,
          tele_station_name_th: station.tele_station_name_th,
          status: 'skipped',
          reason: 'Invalid coordinates'
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
      
      if (!locationData || (!locationData.province && !locationData.amphure)) {
        console.warn(`Failed to geocode coordinates for station ${station.tele_station_id}`);
        stats.failed++;
        stats.processed++;
        
        results.push({
          tele_station_id: station.tele_station_id,
          tele_station_name_th: station.tele_station_name_th,
          status: 'failed',
          reason: 'Geocoding failed'
        });
        
        continue;
      }
      
      // Update station with geocoded location
      const success = await updateStationLocation(station.tele_station_id, locationData);
      
      if (success) {
        stats.updated++;
        
        results.push({
          tele_station_id: station.tele_station_id,
          tele_station_name_th: station.tele_station_name_th,
          status: 'updated',
          location: locationData
        });
      } else {
        stats.failed++;
        
        results.push({
          tele_station_id: station.tele_station_id,
          tele_station_name_th: station.tele_station_name_th,
          status: 'failed',
          reason: 'Database update failed'
        });
      }
      
      stats.processed++;
    }
    
    // Print summary
    console.log('\nGeocoding Summary:');
    console.log(`Total stations: ${stats.total}`);
    console.log(`Processed: ${stats.processed}`);
    console.log(`Updated: ${stats.updated}`);
    console.log(`Failed: ${stats.failed}`);
    console.log(`Skipped: ${stats.skipped}`);
    
    // Save results to file
    const resultsJson = JSON.stringify(results, null, 2);
    const resultsFilename = `geocoding-results-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(resultsFilename, resultsJson);
    console.log(`\nDetailed results saved to ${resultsFilename}`);
    
  } catch (error) {
    console.error('Error during geocoding process:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the main function
geocodeSpecificStations().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 