// Script to geocode ThaiWater station coordinates to Thai administrative boundaries
import pg from 'pg';
import dotenv from 'dotenv';
import axios from 'axios';
import { setTimeout } from 'timers/promises';

// Load environment variables
dotenv.config();

// Thailand Longdo Map API key (you need to replace this with your actual API key)
const LONGDO_API_KEY = process.env.LONGDO_API_KEY || 'your-longdo-api-key';

// Alternative API: Thailand Administrative API
const THAILAND_ADMIN_API = 'https://api.longdo.com/map/services/address';

/**
 * Geocodes a coordinate to Thai administrative boundaries using Longdo Map API
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<{province: string, amphoe: string, tambon: string}>}
 */
async function geocodeCoordinate(lat, lng) {
  try {
    const response = await axios.get(THAILAND_ADMIN_API, {
      params: {
        key: LONGDO_API_KEY,
        lat,
        lon: lng
      }
    });
    
    if (response.data && response.data.province) {
      return {
        province: response.data.province,
        amphoe: response.data.district,
        tambon: response.data.subdistrict
      };
    }
    
    return { province: null, amphoe: null, tambon: null };
  } catch (error) {
    console.error(`Error geocoding coordinates [${lat}, ${lng}]:`, error.message);
    return { province: null, amphoe: null, tambon: null };
  }
}

/**
 * Alternative geocoding using a free API
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<{province: string, amphoe: string, tambon: string}>}
 */
async function geocodeCoordinateAlternative(lat, lng) {
  try {
    // Using the free Nominatim API (OpenStreetMap)
    const response = await axios.get(`https://nominatim.openstreetmap.org/reverse`, {
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
      
      return { province, amphoe, tambon };
    }
    
    return { province: null, amphoe: null, tambon: null };
  } catch (error) {
    console.error(`Error geocoding coordinates [${lat}, ${lng}] with alternative API:`, error.message);
    return { province: null, amphoe: null, tambon: null };
  }
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
    const { province, amphoe, tambon } = locationData;
    
    if (!province && !amphoe) {
      return false;
    }
    
    if (dryRun) {
      console.log(`  [DRY RUN] Would update station ${stationId} with province=${province}, amphure=${amphoe}, tambon=${tambon}`);
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
  const { limit = 10, all = false, dryRun = false } = options;
  
  console.log('Starting geocoding of ThaiWater stations...');
  console.log(`Options: limit=${limit}, all=${all}, dryRun=${dryRun}`);
  
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
      const stationsQuery = `
        SELECT 
          tele_station_id,
          tele_station_name,
          tele_station_lat,
          tele_station_long,
          data_source
        FROM thaiwater_tele_stations
        WHERE (province IS NULL OR province = '') 
          AND (amphure IS NULL OR amphure = '')
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
      
      const stationsResult = await client.query(stationsQuery);
      const stations = stationsResult.rows;
      
      console.log(`Found ${stations.length} stations to geocode`);
      
      let successCount = 0;
      let failureCount = 0;
      
      // Process each station
      for (let i = 0; i < stations.length; i++) {
        const station = stations[i];
        console.log(`Processing station ${i+1}/${stations.length}: ID ${station.tele_station_id}, Name: ${station.tele_station_name || 'Unknown'}`);
        
        // Geocode the coordinates
        const locationData = await geocodeCoordinateAlternative(
          station.tele_station_lat,
          station.tele_station_long
        );
        
        if (locationData.province || locationData.amphoe) {
          console.log(`  Found location: Province: ${locationData.province || 'Unknown'}, Amphoe: ${locationData.amphoe || 'Unknown'}`);
          
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
    help: false
  };
  
  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--all') {
      options.all = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
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
  console.log('Usage: node geocode-thaiwater-stations.mjs [options]');
  console.log('');
  console.log('Options:');
  console.log('  --help, -h     Show this help message');
  console.log('  --limit=N      Limit geocoding to N stations (default: 10)');
  console.log('  --all          Geocode all stations needing geocoding');
  console.log('  --dry-run      Run without updating the database');
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