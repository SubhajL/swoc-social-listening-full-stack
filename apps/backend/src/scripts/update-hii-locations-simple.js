// Script to update HII stations with Amphure and Province information based on coordinates
// Using a simplified approach without external API calls
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

const { Pool } = pg;

// Options for the script
class Options {
  constructor() {
    this.batchSize = 50; // Process stations in batches
    this.forceUpdate = false; // Set to true to update all stations, even those with existing location data
    this.logLevel = 'info'; // 'debug', 'info', 'warn', 'error'
    this.saveToFile = true; // Save results to a file
  }
}

// Logger
class Logger {
  constructor(options) {
    this.logLevel = options.logLevel;
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
  }

  debug(message) {
    if (this.levels[this.logLevel] <= this.levels.debug) {
      console.log(`[DEBUG] ${message}`);
    }
  }

  info(message) {
    if (this.levels[this.logLevel] <= this.levels.info) {
      console.log(`[INFO] ${message}`);
    }
  }

  warn(message) {
    if (this.levels[this.logLevel] <= this.levels.warn) {
      console.log(`[WARN] ${message}`);
    }
  }

  error(message) {
    if (this.levels[this.logLevel] <= this.levels.error) {
      console.log(`[ERROR] ${message}`);
    }
  }
}

// Simplified province mapping based on coordinates
// This is a very basic implementation that divides Thailand into regions
function getProvinceFromCoordinates(lat, long) {
  // Check if coordinates are valid
  if (!lat || !long || isNaN(lat) || isNaN(long)) {
    return null;
  }
  
  // Check if coordinates are within Thailand
  if (lat < 5.5 || lat > 20.5 || long < 97.0 || long > 106.0) {
    return null;
  }
  
  // Gulf of Thailand
  if (isInGulfOfThailand(lat, long)) {
    return getNearestProvinceForGulf(lat);
  }
  
  // Northern Thailand
  if (lat >= 17.0) {
    if (long < 100.0) {
      return { province: 'จังหวัดเชียงใหม่', amphure: 'อำเภอเมืองเชียงใหม่' };
    } else {
      return { province: 'จังหวัดเชียงราย', amphure: 'อำเภอเมืองเชียงราย' };
    }
  }
  
  // Northeastern Thailand
  if (lat >= 14.5 && long >= 101.5) {
    if (long >= 104.0) {
      return { province: 'จังหวัดอุบลราชธานี', amphure: 'อำเภอเมืองอุบลราชธานี' };
    } else if (long >= 102.5) {
      return { province: 'จังหวัดนครราชสีมา', amphure: 'อำเภอเมืองนครราชสีมา' };
    } else {
      return { province: 'จังหวัดขอนแก่น', amphure: 'อำเภอเมืองขอนแก่น' };
    }
  }
  
  // Central Thailand
  if (lat >= 13.0 && lat < 15.0 && long >= 99.5 && long <= 101.5) {
    return { province: 'จังหวัดกรุงเทพมหานคร', amphure: 'เขตพระนคร' };
  }
  
  // Eastern Thailand
  if (lat >= 12.0 && lat < 14.0 && long > 101.5) {
    return { province: 'จังหวัดชลบุรี', amphure: 'อำเภอเมืองชลบุรี' };
  }
  
  // Western Thailand
  if (lat >= 13.0 && lat < 16.0 && long < 99.5) {
    return { province: 'จังหวัดกาญจนบุรี', amphure: 'อำเภอเมืองกาญจนบุรี' };
  }
  
  // Southern Thailand (upper)
  if (lat >= 10.0 && lat < 13.0) {
    if (long < 99.5) {
      return { province: 'จังหวัดระนอง', amphure: 'อำเภอเมืองระนอง' };
    } else {
      return { province: 'จังหวัดสุราษฎร์ธานี', amphure: 'อำเภอเมืองสุราษฎร์ธานี' };
    }
  }
  
  // Southern Thailand (lower)
  if (lat < 10.0) {
    if (long < 99.5) {
      return { province: 'จังหวัดภูเก็ต', amphure: 'อำเภอเมืองภูเก็ต' };
    } else if (long < 101.0) {
      return { province: 'จังหวัดนครศรีธรรมราช', amphure: 'อำเภอเมืองนครศรีธรรมราช' };
    } else {
      return { province: 'จังหวัดสงขลา', amphure: 'อำเภอเมืองสงขลา' };
    }
  }
  
  // Default fallback
  return { province: 'จังหวัดกรุงเทพมหานคร', amphure: 'เขตพระนคร' };
}

// Check if coordinates are in the Gulf of Thailand
function isInGulfOfThailand(lat, long) {
  // Central Gulf of Thailand
  if (lat >= 8.0 && lat <= 13.0 && long >= 100.0 && long <= 103.0) {
    // Simple check for central gulf area
    if (lat >= 8.0 && lat <= 11.0 && long >= 100.5 && long <= 102.5) {
      return true;
    }
    
    // Eastern Gulf coast
    if (lat >= 12.0 && lat <= 13.0 && long >= 100.5 && long <= 101.5) {
      return true;
    }
  }
  
  return false;
}

// Get the nearest province for Gulf of Thailand coordinates
function getNearestProvinceForGulf(lat) {
  // Simplified mapping of latitude ranges to nearest coastal provinces
  if (lat >= 12.0) {
    return { province: 'จังหวัดชลบุรี', amphure: 'อำเภอเมืองชลบุรี' }; // Northern Gulf - Chonburi
  } else if (lat >= 10.5) {
    return { province: 'จังหวัดประจวบคีรีขันธ์', amphure: 'อำเภอเมืองประจวบคีรีขันธ์' }; // Upper Central Gulf - Prachuap Khiri Khan
  } else if (lat >= 9.0) {
    return { province: 'จังหวัดสุราษฎร์ธานี', amphure: 'อำเภอเมืองสุราษฎร์ธานี' }; // Lower Central Gulf - Surat Thani
  } else if (lat >= 7.5) {
    return { province: 'จังหวัดนครศรีธรรมราช', amphure: 'อำเภอเมืองนครศรีธรรมราช' }; // Upper Southern Gulf - Nakhon Si Thammarat
  } else {
    return { province: 'จังหวัดสงขลา', amphure: 'อำเภอเมืองสงขลา' }; // Lower Southern Gulf - Songkhla
  }
}

// Main function to update HII station locations
async function updateHIILocations() {
  const options = new Options();
  const logger = new Logger(options);
  
  logger.info('Starting update of HII station locations (simplified approach)...');
  
  // Load HII stations from API data file
  let apiStations = [];
  try {
    const apiData = fs.readFileSync('thaiwater_api_hii_stations.json', 'utf8');
    apiStations = JSON.parse(apiData);
    logger.info(`Loaded ${apiStations.length} HII stations from API data file`);
  } catch (error) {
    logger.error(`Error loading API data: ${error.message}`);
    logger.info('Please run query-thaiwater-hii-api.js first to generate the API data file');
    return;
  }
  
  // Create a map of API stations by ID for easier lookup
  const apiStationsById = {};
  apiStations.forEach(station => {
    apiStationsById[station.id] = station;
  });
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  logger.info(`Using connection string: ${process.env.DATABASE_URL}`);
  
  try {
    // Get HII stations from database that need location data
    const query = `
      SELECT 
        tele_station_id as id,
        tele_station_name,
        tele_station_oldcode,
        province,
        amphure
      FROM 
        thaiwater_tele_stations 
      WHERE 
        data_source = 'HII'
        ${options.forceUpdate ? '' : 'AND (province IS NULL OR amphure IS NULL)'}
      ORDER BY 
        tele_station_id;
    `;
    
    const result = await pool.query(query);
    const stations = result.rows;
    
    logger.info(`Found ${stations.length} HII stations ${options.forceUpdate ? '' : 'without location data'} in database`);
    
    // Process stations in batches
    const batches = [];
    for (let i = 0; i < stations.length; i += options.batchSize) {
      batches.push(stations.slice(i, i + options.batchSize));
    }
    
    logger.info(`Processing stations in ${batches.length} batches of up to ${options.batchSize} stations each`);
    
    let updatedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      logger.info(`Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} stations`);
      
      // Begin transaction for this batch
      await pool.query('BEGIN');
      
      try {
        for (const station of batch) {
          // Get coordinates from API since they're not available in the database
          const apiStation = apiStationsById[station.id];
          
          if (!apiStation || !apiStation.tele_station_lat || !apiStation.tele_station_long) {
            logger.warn(`No API data or coordinates for station ${station.id}, skipping`);
            skippedCount++;
            continue;
          }
          
          const lat = parseFloat(apiStation.tele_station_lat);
          const long = parseFloat(apiStation.tele_station_long);
          
          // Skip if invalid coordinates
          if (isNaN(lat) || isNaN(long)) {
            logger.warn(`Invalid coordinates for station ${station.id}: ${apiStation.tele_station_lat}, ${apiStation.tele_station_long}`);
            skippedCount++;
            continue;
          }
          
          logger.debug(`Using coordinates from API for station ${station.id}: ${lat}, ${long}`);
          
          // Get province and amphure from coordinates using our simplified mapping
          const locationData = getProvinceFromCoordinates(lat, long);
          
          if (locationData) {
            // Update station in database
            const updateQuery = `
              UPDATE thaiwater_tele_stations
              SET 
                province = $1,
                amphure = $2,
                updated_at = NOW()
              WHERE 
                tele_station_id = $3
            `;
            
            await pool.query(updateQuery, [locationData.province, locationData.amphure, station.id]);
            
            logger.info(`Updated station ${station.id} with location: ${locationData.amphure}, ${locationData.province}`);
            updatedCount++;
          } else {
            logger.warn(`Could not determine location for station ${station.id} with coordinates ${lat}, ${long}`);
            errorCount++;
          }
        }
        
        // Commit transaction for this batch
        await pool.query('COMMIT');
        logger.info(`Batch ${batchIndex + 1} completed successfully`);
      } catch (error) {
        // Rollback transaction on error
        await pool.query('ROLLBACK');
        logger.error(`Error processing batch ${batchIndex + 1}: ${error.message}`);
        errorCount += batch.length;
      }
    }
    
    // Log summary
    logger.info('\nUpdate Summary:');
    logger.info(`Total stations processed: ${stations.length}`);
    logger.info(`Successfully updated: ${updatedCount}`);
    logger.info(`Skipped (no coordinates): ${skippedCount}`);
    logger.info(`Errors: ${errorCount}`);
    
    // Save results to file if enabled
    if (options.saveToFile) {
      const results = {
        timestamp: new Date().toISOString(),
        totalStations: stations.length,
        updatedCount,
        skippedCount,
        errorCount
      };
      
      fs.writeFileSync('hii_location_update_results.json', JSON.stringify(results, null, 2));
      logger.info('Results saved to hii_location_update_results.json');
    }
    
  } catch (error) {
    logger.error(`Error updating HII station locations: ${error.message}`);
  } finally {
    await pool.end();
    logger.info('HII station location update process completed');
  }
}

// Run the update function
updateHIILocations().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 