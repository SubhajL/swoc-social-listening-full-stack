// Enhanced script to geocode ThaiWater station coordinates to Thai administrative boundaries
import pg from 'pg';
import dotenv from 'dotenv';
import axios from 'axios';
import { setTimeout } from 'timers/promises';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Thailand Longdo Map API key
const LONGDO_API_KEY = process.env.LONGDO_API_KEY || 'your-longdo-api-key';

// Thailand Administrative API endpoints
const LONGDO_ADDRESS_API = 'https://api.longdo.com/map/services/address';
const NOMINATIM_API = 'https://nominatim.openstreetmap.org/reverse';
const MAPBOX_API = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || 'your-mapbox-token';

// Thai province to amphure mapping (for fallback)
const PROVINCE_AMPHURE_MAPPING = {};

// Load province-amphure mapping from file if available
try {
  const mappingPath = path.join(__dirname, 'thai-province-amphure-mapping.json');
  if (fs.existsSync(mappingPath)) {
    const mappingData = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
    Object.assign(PROVINCE_AMPHURE_MAPPING, mappingData);
    console.log(`Loaded province-amphure mapping with ${Object.keys(mappingData).length} provinces`);
  }
} catch (error) {
  console.warn('Could not load province-amphure mapping:', error.message);
}

/**
 * Geocodes a coordinate using Longdo Map API
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<{province: string, amphoe: string, tambon: string}>}
 */
async function geocodeWithLongdo(lat, lng) {
  try {
    const response = await axios.get(LONGDO_ADDRESS_API, {
      params: {
        key: LONGDO_API_KEY,
        lat,
        lon: lng
      }
    });
    
    if (response.data && response.data.province) {
      return {
        province: response.data.province,
        amphoe: response.data.district || null,
        tambon: response.data.subdistrict || null,
        source: 'longdo'
      };
    }
    
    return { province: null, amphoe: null, tambon: null, source: 'longdo' };
  } catch (error) {
    console.error(`Error geocoding with Longdo [${lat}, ${lng}]:`, error.message);
    return { province: null, amphoe: null, tambon: null, source: 'longdo' };
  }
}

/**
 * Geocodes a coordinate using OpenStreetMap Nominatim API
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<{province: string, amphoe: string, tambon: string}>}
 */
async function geocodeWithNominatim(lat, lng) {
  try {
    const response = await axios.get(NOMINATIM_API, {
      params: {
        format: 'json',
        lat,
        lon: lng,
        zoom: 10,
        'accept-language': 'th'
      },
      headers: {
        'User-Agent': 'ThaiWater-Geocoding-Script/1.0'
      }
    });
    
    if (response.data && response.data.address) {
      // Extract province and district from the address
      const province = response.data.address.province || 
                      response.data.address.state || 
                      null;
      
      const amphoe = response.data.address.county || 
                    response.data.address.district || 
                    null;
      
      const tambon = response.data.address.suburb || 
                    response.data.address.village || 
                    null;
      
      return { province, amphoe, tambon, source: 'nominatim' };
    }
    
    return { province: null, amphoe: null, tambon: null, source: 'nominatim' };
  } catch (error) {
    console.error(`Error geocoding with Nominatim [${lat}, ${lng}]:`, error.message);
    return { province: null, amphoe: null, tambon: null, source: 'nominatim' };
  }
}

/**
 * Geocodes a coordinate using Mapbox API
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<{province: string, amphoe: string, tambon: string}>}
 */
async function geocodeWithMapbox(lat, lng) {
  try {
    const response = await axios.get(`${MAPBOX_API}/${lng},${lat}.json`, {
      params: {
        access_token: MAPBOX_ACCESS_TOKEN,
        language: 'th',
        types: 'region,district,locality',
        limit: 1
      }
    });
    
    if (response.data && response.data.features && response.data.features.length > 0) {
      const features = response.data.features;
      let province = null;
      let amphoe = null;
      let tambon = null;
      
      // Extract administrative information from context
      for (const feature of features) {
        if (feature.place_type.includes('region')) {
          province = feature.text;
        } else if (feature.place_type.includes('district')) {
          amphoe = feature.text;
        } else if (feature.place_type.includes('locality')) {
          tambon = feature.text;
        }
        
        // Check context for more information
        if (feature.context) {
          for (const ctx of feature.context) {
            if (ctx.id.startsWith('region')) {
              province = province || ctx.text;
            } else if (ctx.id.startsWith('district')) {
              amphoe = amphoe || ctx.text;
            } else if (ctx.id.startsWith('locality')) {
              tambon = tambon || ctx.text;
            }
          }
        }
      }
      
      return { province, amphoe, tambon, source: 'mapbox' };
    }
    
    return { province: null, amphoe: null, tambon: null, source: 'mapbox' };
  } catch (error) {
    console.error(`Error geocoding with Mapbox [${lat}, ${lng}]:`, error.message);
    return { province: null, amphoe: null, tambon: null, source: 'mapbox' };
  }
}

/**
 * Geocodes a coordinate using multiple services with fallback
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<{province: string, amphoe: string, tambon: string}>}
 */
async function geocodeCoordinateMultiService(lat, lng) {
  // Try Nominatim first (free and reliable for Thailand)
  const nominatimResult = await geocodeWithNominatim(lat, lng);
  
  if (nominatimResult.province && nominatimResult.amphoe) {
    return nominatimResult;
  }
  
  // If we have a province but no amphoe, try to get amphoe from mapping
  if (nominatimResult.province && !nominatimResult.amphoe && 
      PROVINCE_AMPHURE_MAPPING[nominatimResult.province]) {
    
    // Get the list of amphures for this province
    const amphures = PROVINCE_AMPHURE_MAPPING[nominatimResult.province];
    
    if (amphures && amphures.length > 0) {
      console.log(`  Found province ${nominatimResult.province} in mapping with ${amphures.length} amphures`);
      
      // For now, we'll use the first amphure in the list as a placeholder
      // In a more sophisticated implementation, we could try to determine the closest amphure
      // based on the coordinates
      const amphure = amphures[0];
      console.log(`  Using amphure ${amphure} from mapping as placeholder`);
      
      return {
        province: nominatimResult.province,
        amphoe: amphure,
        tambon: nominatimResult.tambon,
        source: 'nominatim+mapping'
      };
    }
  }
  
  // Try Longdo if API key is available
  if (LONGDO_API_KEY && LONGDO_API_KEY !== 'your-longdo-api-key') {
    await setTimeout(500); // Delay to avoid rate limiting
    const longdoResult = await geocodeWithLongdo(lat, lng);
    
    if (longdoResult.province && longdoResult.amphoe) {
      return longdoResult;
    }
    
    // If Nominatim gave us a province but no amphoe, and Longdo gave us an amphoe
    if (nominatimResult.province && !nominatimResult.amphoe && 
        longdoResult.amphoe) {
      return {
        province: nominatimResult.province,
        amphoe: longdoResult.amphoe,
        tambon: longdoResult.tambon || nominatimResult.tambon,
        source: 'nominatim+longdo'
      };
    }
  }
  
  // Try Mapbox if access token is available
  if (MAPBOX_ACCESS_TOKEN && MAPBOX_ACCESS_TOKEN !== 'your-mapbox-token') {
    await setTimeout(500); // Delay to avoid rate limiting
    const mapboxResult = await geocodeWithMapbox(lat, lng);
    
    if (mapboxResult.province && mapboxResult.amphoe) {
      return mapboxResult;
    }
    
    // If we have a province from Nominatim but no amphoe, and Mapbox gave us an amphoe
    if (nominatimResult.province && !nominatimResult.amphoe && 
        mapboxResult.amphoe) {
      return {
        province: nominatimResult.province,
        amphoe: mapboxResult.amphoe,
        tambon: mapboxResult.tambon || nominatimResult.tambon,
        source: 'nominatim+mapbox'
      };
    }
  }
  
  // Return the best result we have
  if (nominatimResult.province) {
    return nominatimResult;
  }
  
  // If all else fails, return null values
  return { province: null, amphoe: null, tambon: null, source: 'none' };
}

/**
 * Updates a station with geocoded location data
 * @param {object} client - Database client
 * @param {number} stationId - Station ID
 * @param {object} locationData - Location data
 * @param {boolean} dryRun - Whether to run in dry-run mode
 * @returns {Promise<boolean>}
 */
async function updateStationLocation(client, stationId, locationData, dryRun = false) {
  try {
    const { province, amphoe, tambon, source } = locationData;
    
    if (!province) {
      return false;
    }
    
    if (dryRun) {
      console.log(`  [DRY RUN] Would update station ${stationId} with province=${province}, amphure=${amphoe || 'Unknown'}, tambon=${tambon || 'Unknown'} (source: ${source})`);
      return true;
    }
    
    const query = `
      UPDATE thaiwater_tele_stations
      SET 
        province = $1,
        amphure = $2,
        tambon = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE tele_station_id = $4
    `;
    
    await client.query(query, [province, amphoe, tambon, stationId]);
    return true;
  } catch (error) {
    console.error(`Error updating station ${stationId}:`, error.message);
    return false;
  }
}

/**
 * Geocodes ThaiWater stations
 * @param {object} options - Options for geocoding
 * @returns {Promise<void>}
 */
async function geocodeThaiWaterStations(options = {}) {
  const { limit = 10, all = false, dryRun = false, updateAmphure = false } = options;
  
  console.log('Starting enhanced geocoding of ThaiWater stations...');
  console.log(`Options: limit=${limit}, all=${all}, dryRun=${dryRun}, updateAmphure=${updateAmphure}`);
  
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    // Connect to the database
    const client = await pool.connect();
    
    try {
      // Begin transaction if not in dry-run mode
      if (!dryRun) {
        await client.query('BEGIN');
      }
      
      // Get stations that need geocoding
      let stationsQuery;
      
      if (updateAmphure) {
        // Get stations that have province but no amphure
        stationsQuery = `
          SELECT 
            tele_station_id,
            tele_station_name,
            tele_station_lat,
            tele_station_long,
            province,
            data_source
          FROM thaiwater_tele_stations
          WHERE province IS NOT NULL 
            AND province != ''
            AND (amphure IS NULL OR amphure = '' OR amphure = 'Unknown')
            AND tele_station_lat IS NOT NULL 
            AND tele_station_long IS NOT NULL
            AND tele_station_lat::text NOT LIKE 'NaN'
            AND tele_station_long::text NOT LIKE 'NaN'
            AND tele_station_lat != 0
            AND tele_station_long != 0
            AND tele_station_lat BETWEEN 5.5 AND 20.5
            AND tele_station_long BETWEEN 97.5 AND 105.5
          ${all ? '' : `LIMIT ${limit}`}
        `;
      } else {
        // Get stations that need complete geocoding
        stationsQuery = `
          SELECT 
            tele_station_id,
            tele_station_name,
            tele_station_lat,
            tele_station_long,
            data_source
          FROM thaiwater_tele_stations
          WHERE (province IS NULL OR province = '') 
            AND tele_station_lat IS NOT NULL 
            AND tele_station_long IS NOT NULL
            AND tele_station_lat::text NOT LIKE 'NaN'
            AND tele_station_long::text NOT LIKE 'NaN'
            AND tele_station_lat != 0
            AND tele_station_long != 0
            AND tele_station_lat BETWEEN 5.5 AND 20.5
            AND tele_station_long BETWEEN 97.5 AND 105.5
          ${all ? '' : `LIMIT ${limit}`}
        `;
      }
      
      const stationsResult = await client.query(stationsQuery);
      const stations = stationsResult.rows;
      
      console.log(`Found ${stations.length} stations to geocode`);
      
      let successCount = 0;
      let failureCount = 0;
      let amphureFoundCount = 0;
      
      // Process each station
      for (let i = 0; i < stations.length; i++) {
        const station = stations[i];
        console.log(`Processing station ${i+1}/${stations.length}: ID ${station.tele_station_id}, Name: ${station.tele_station_name || 'Unknown'}`);
        
        // Geocode the coordinates using multi-service approach
        const locationData = await geocodeCoordinateMultiService(
          station.tele_station_lat,
          station.tele_station_long
        );
        
        if (locationData.province) {
          console.log(`  Found location: Province: ${locationData.province}, Amphoe: ${locationData.amphoe || 'Unknown'}, Source: ${locationData.source}`);
          
          if (locationData.amphoe) {
            amphureFoundCount++;
          }
          
          // Update the station
          const updated = await updateStationLocation(client, station.tele_station_id, locationData, dryRun);
          
          if (updated) {
            successCount++;
            if (!dryRun) {
              console.log(`  Updated station ${station.tele_station_id}`);
            }
          } else {
            failureCount++;
            console.log(`  Failed to update station ${station.tele_station_id}`);
          }
        } else {
          failureCount++;
          console.log(`  No location data found for coordinates [${station.tele_station_lat}, ${station.tele_station_long}]`);
        }
        
        // Add a delay to avoid rate limiting
        if (i < stations.length - 1) {
          await setTimeout(1000);
        }
      }
      
      // Commit transaction if not in dry-run mode
      if (!dryRun) {
        await client.query('COMMIT');
      } else {
        console.log('\n[DRY RUN] No changes were made to the database');
      }
      
      console.log('\nGeocoding completed:');
      console.log(`  Successful updates: ${successCount}`);
      console.log(`  Failed updates: ${failureCount}`);
      console.log(`  Amphure found: ${amphureFoundCount} (${(amphureFoundCount / stations.length * 100).toFixed(2)}%)`);
      console.log(`  Success rate: ${(successCount / stations.length * 100).toFixed(2)}%`);
      
    } catch (error) {
      // Rollback transaction on error if not in dry-run mode
      if (!dryRun) {
        await client.query('ROLLBACK');
      }
      console.error('Error during geocoding:', error);
    } finally {
      // Release client back to pool
      client.release();
    }
    
  } catch (error) {
    console.error('Database connection error:', error);
  } finally {
    // Close pool
    await pool.end();
  }
}

/**
 * Parse command line arguments
 * @returns {object} - Parsed options
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    limit: 10,
    all: false,
    dryRun: false,
    updateAmphure: false,
    help: false
  };
  
  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--all') {
      options.all = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--update-amphure') {
      options.updateAmphure = true;
    } else if (arg.startsWith('--limit=')) {
      const limitValue = parseInt(arg.split('=')[1], 10);
      if (!isNaN(limitValue) && limitValue > 0) {
        options.limit = limitValue;
      }
    }
  }
  
  return options;
}

/**
 * Print help message
 */
function printHelp() {
  console.log('Usage: node geocode-thaiwater-stations-enhanced.mjs [options]');
  console.log('');
  console.log('Options:');
  console.log('  --help, -h       Show this help message');
  console.log('  --limit=N        Limit geocoding to N stations (default: 10)');
  console.log('  --all            Geocode all stations needing geocoding');
  console.log('  --dry-run        Run without updating the database');
  console.log('  --update-amphure Focus on updating amphure for stations with province but no amphure');
}

/**
 * Main function
 */
async function main() {
  const options = parseArgs();
  
  if (options.help) {
    printHelp();
    return;
  }
  
  // Run the geocoding
  await geocodeThaiWaterStations(options);
}

// Run the main function
main()
  .then(() => {
    console.log('\nScript completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 