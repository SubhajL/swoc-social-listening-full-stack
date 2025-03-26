// Script to clean administrative location names by removing prefixes
// from existing records without performing any geocoding
import pg from 'pg';
import dotenv from 'dotenv';
import { setTimeout } from 'timers/promises';
import winston from 'winston';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure logs directory exists
try {
  if (!fs.existsSync('./logs')) {
    fs.mkdirSync('./logs');
  }
} catch (error) {
  console.error('Error creating logs directory:', error.message);
}

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
      filename: 'clean-admin-locations.log',
      dirname: './logs'
    })
  ]
});

/**
 * Cleans administrative names by removing common prefixes
 * @param {string} name - The name to clean
 * @param {string} type - The type of administrative area ('province', 'amphure', or 'tambon')
 * @returns {string} - The cleaned name
 */
function cleanAdminName(name, type) {
  if (!name) return name;
  
  switch (type) {
    case 'province':
      // Remove "จังหวัด" prefix
      if (name.startsWith('จังหวัด')) {
        return name.substring('จังหวัด'.length).trim();
      }
      break;
    case 'amphure':
      // Remove "อำเภอ" or "เขต" prefix
      if (name.startsWith('อำเภอ')) {
        return name.substring('อำเภอ'.length).trim();
      } else if (name.startsWith('เขต')) {
        return name.substring('เขต'.length).trim();
      }
      break;
    case 'tambon':
      // Remove "ตำบล" or "แขวง" prefix
      if (name.startsWith('ตำบล')) {
        return name.substring('ตำบล'.length).trim();
      } else if (name.startsWith('แขวง')) {
        return name.substring('แขวง'.length).trim();
      }
      break;
  }
  
  return name;
}

/**
 * Updates a station with cleaned location information
 * @param {object} client - Database client
 * @param {number} stationId - Station ID
 * @param {object} cleanedData - Cleaned location data
 * @param {boolean} dryRun - Whether to run in dry-run mode
 * @returns {Promise<boolean>}
 */
async function updateStationLocation(client, stationId, cleanedData, dryRun = false) {
  try {
    if (dryRun) {
      logger.info(`[DRY RUN] Would update station ${stationId} with:`, cleanedData);
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
    
    await client.query(query, [
      cleanedData.province,
      cleanedData.amphure,
      cleanedData.tambon,
      stationId
    ]);
    
    return true;
  } catch (error) {
    logger.error(`Error updating station ${stationId}:`, error.message);
    return false;
  }
}

/**
 * Cleans administrative location names in ThaiWater stations
 * @param {object} options - Options for cleaning
 * @returns {Promise<void>}
 */
async function cleanAdminLocationNames(options = {}) {
  const { limit = 0, dryRun = false, batchSize = 100 } = options;
  
  logger.info('Starting cleaning of administrative location names in ThaiWater stations...');
  logger.info(`Options: limit=${limit}, dryRun=${dryRun}, batchSize=${batchSize}`);
  
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
      
      // Get total count of stations that have location data
      const countQuery = `
        SELECT COUNT(*) as total
        FROM thaiwater_tele_stations
        WHERE (province IS NOT NULL AND province != '') 
          OR (amphure IS NOT NULL AND amphure != '')
          OR (tambon IS NOT NULL AND tambon != '')
      `;
      
      const countResult = await client.query(countQuery);
      const totalCount = parseInt(countResult.rows[0].total, 10);
      
      logger.info(`Found ${totalCount} stations with some location data to process`);
      
      // Prepare the query to get stations with location data
      let stationsQuery = `
        SELECT 
          tele_station_id,
          tele_station_name,
          province,
          amphure,
          tambon
        FROM thaiwater_tele_stations
        WHERE (province IS NOT NULL AND province != '') 
          OR (amphure IS NOT NULL AND amphure != '')
          OR (tambon IS NOT NULL AND tambon != '')
        ORDER BY tele_station_id
      `;
      
      // Add limit if specified
      if (limit > 0) {
        stationsQuery += ` LIMIT ${limit}`;
      }
      
      logger.info('Fetching stations...');
      const stationsResult = await client.query(stationsQuery);
      const stations = stationsResult.rows;
      
      logger.info(`Processing ${stations.length} stations to clean administrative names`);
      
      let successCount = 0;
      let changedCount = 0;
      let failureCount = 0;
      
      // Process stations in batches
      for (let i = 0; i < stations.length; i += batchSize) {
        const batch = stations.slice(i, i + batchSize);
        
        logger.info(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(stations.length/batchSize)} (${i+1}-${Math.min(i+batchSize, stations.length)} of ${stations.length})`);
        
        // Process each station in the batch
        for (const station of batch) {
          // Get existing values
          const originalProvince = station.province;
          const originalAmphure = station.amphure;
          const originalTambon = station.tambon;
          
          // Clean the values
          const cleanedProvince = cleanAdminName(originalProvince, 'province');
          const cleanedAmphure = cleanAdminName(originalAmphure, 'amphure');
          const cleanedTambon = cleanAdminName(originalTambon, 'tambon');
          
          // Check if any value changed
          const hasChanges = 
            cleanedProvince !== originalProvince || 
            cleanedAmphure !== originalAmphure || 
            cleanedTambon !== originalTambon;
          
          if (hasChanges) {
            const cleanedData = {
              province: cleanedProvince,
              amphure: cleanedAmphure,
              tambon: cleanedTambon
            };
            
            // Log the changes
            logger.info(`Station ${station.tele_station_id} (${station.tele_station_name || 'Unnamed'}): Cleaning names`);
            
            if (cleanedProvince !== originalProvince) {
              logger.info(`  Province: "${originalProvince}" -> "${cleanedProvince}"`);
            }
            
            if (cleanedAmphure !== originalAmphure) {
              logger.info(`  Amphure: "${originalAmphure}" -> "${cleanedAmphure}"`);
            }
            
            if (cleanedTambon !== originalTambon) {
              logger.info(`  Tambon: "${originalTambon}" -> "${cleanedTambon}"`);
            }
            
            // Update the station
            const updated = await updateStationLocation(client, station.tele_station_id, cleanedData, dryRun);
            
            if (updated) {
              successCount++;
              changedCount++;
            } else {
              failureCount++;
            }
          } else {
            // No changes needed for this station
            successCount++;
          }
        }
        
        // Add a small delay between batches to avoid overloading the database
        if (i + batchSize < stations.length) {
          await setTimeout(100);
        }
      }
      
      // Commit transaction if not in dry-run mode
      if (!dryRun) {
        await client.query('COMMIT');
      } else {
        logger.info('\n[DRY RUN] No changes were made to the database');
      }
      
      logger.info('\nClean-up completed:');
      logger.info(`  Stations processed: ${successCount}`);
      logger.info(`  Stations changed: ${changedCount}`);
      logger.info(`  Failures: ${failureCount}`);
      logger.info(`  Success rate: ${(successCount / stations.length * 100).toFixed(2)}%`);
      
    } catch (error) {
      // Rollback transaction if not in dry-run mode
      if (!dryRun) {
        await client.query('ROLLBACK');
      }
      
      logger.error('Error cleaning administrative names:', error.message);
      
    } finally {
      // Release the client
      client.release();
    }
    
  } catch (error) {
    logger.error('Database connection error:', error.message);
  } finally {
    // Close the pool
    await pool.end();
  }
  
  logger.info('Script completed');
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  limit: 0,
  dryRun: args.includes('--dry-run'),
  batchSize: 100
};

// Check for limit argument
const limitArg = args.find(arg => arg.startsWith('--limit='));
if (limitArg) {
  options.limit = parseInt(limitArg.split('=')[1], 10);
}

// Check for batch size argument
const batchArg = args.find(arg => arg.startsWith('--batch='));
if (batchArg) {
  options.batchSize = parseInt(batchArg.split('=')[1], 10);
}

// Run the script
cleanAdminLocationNames(options).catch(error => {
  logger.error('Unhandled error:', error.message);
  process.exit(1);
}); 