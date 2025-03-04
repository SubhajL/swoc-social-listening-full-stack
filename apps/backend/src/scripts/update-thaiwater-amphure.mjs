// Script to update ThaiWater stations with amphure information
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { setTimeout } from 'timers/promises';

// Load environment variables
dotenv.config();

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Thai province to amphure mapping
let PROVINCE_AMPHURE_MAPPING = {};

// Load province-amphure mapping from file
try {
  const mappingPath = path.join(__dirname, 'thai-province-amphure-mapping.json');
  if (fs.existsSync(mappingPath)) {
    PROVINCE_AMPHURE_MAPPING = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
    console.log(`Loaded province-amphure mapping with ${Object.keys(PROVINCE_AMPHURE_MAPPING).length} provinces`);
  } else {
    console.error('Province-amphure mapping file not found:', mappingPath);
    process.exit(1);
  }
} catch (error) {
  console.error('Could not load province-amphure mapping:', error.message);
  process.exit(1);
}

/**
 * Updates a station with amphure information
 * @param {object} client - Database client
 * @param {number} stationId - Station ID
 * @param {string} province - Province name
 * @param {string} amphure - Amphure name
 * @param {boolean} dryRun - Whether to run in dry-run mode
 * @returns {Promise<boolean>}
 */
async function updateStationAmphure(client, stationId, province, amphure, dryRun = false) {
  try {
    if (dryRun) {
      console.log(`  [DRY RUN] Would update station ${stationId} with amphure=${amphure}`);
      return true;
    }
    
    const query = `
      UPDATE thaiwater_tele_stations
      SET 
        amphure = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE tele_station_id = $2
    `;
    
    await client.query(query, [amphure, stationId]);
    return true;
  } catch (error) {
    console.error(`Error updating station ${stationId}:`, error.message);
    return false;
  }
}

/**
 * Updates ThaiWater stations with amphure information
 * @param {object} options - Options for updating
 * @returns {Promise<void>}
 */
async function updateThaiWaterAmphure(options = {}) {
  const { limit = 10, all = false, dryRun = false, randomAmphure = false } = options;
  
  console.log('Starting update of ThaiWater stations with amphure information...');
  console.log(`Options: limit=${limit}, all=${all}, dryRun=${dryRun}, randomAmphure=${randomAmphure}`);
  
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
      
      // Get stations that have province but no amphure
      const stationsQuery = `
        SELECT 
          tele_station_id,
          tele_station_name,
          province,
          data_source
        FROM thaiwater_tele_stations
        WHERE province IS NOT NULL 
          AND province != ''
          AND (amphure IS NULL OR amphure = '' OR amphure = 'Unknown')
        ${all ? '' : `LIMIT ${limit}`}
      `;
      
      const stationsResult = await client.query(stationsQuery);
      const stations = stationsResult.rows;
      
      console.log(`Found ${stations.length} stations to update with amphure information`);
      
      let successCount = 0;
      let failureCount = 0;
      
      // Process each station
      for (let i = 0; i < stations.length; i++) {
        const station = stations[i];
        console.log(`Processing station ${i+1}/${stations.length}: ID ${station.tele_station_id}, Name: ${station.tele_station_name || 'Unknown'}, Province: ${station.province}`);
        
        // Check if we have amphure mapping for this province
        if (PROVINCE_AMPHURE_MAPPING[station.province]) {
          const amphures = PROVINCE_AMPHURE_MAPPING[station.province];
          
          if (amphures && amphures.length > 0) {
            // Choose an amphure
            let amphure;
            
            if (randomAmphure) {
              // Choose a random amphure from the list
              const randomIndex = Math.floor(Math.random() * amphures.length);
              amphure = amphures[randomIndex];
              console.log(`  Randomly selected amphure: ${amphure}`);
            } else {
              // Use the first amphure in the list (usually the main district)
              amphure = amphures[0];
              console.log(`  Using first amphure in list: ${amphure}`);
            }
            
            // Update the station
            const updated = await updateStationAmphure(client, station.tele_station_id, station.province, amphure, dryRun);
            
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
            console.log(`  No amphures found for province ${station.province}`);
          }
        } else {
          failureCount++;
          console.log(`  Province ${station.province} not found in mapping`);
        }
        
        // Add a small delay between updates
        if (i < stations.length - 1) {
          await setTimeout(100);
        }
      }
      
      // Commit transaction if not in dry-run mode
      if (!dryRun) {
        await client.query('COMMIT');
      } else {
        console.log('\n[DRY RUN] No changes were made to the database');
      }
      
      console.log('\nUpdate completed:');
      console.log(`  Successful updates: ${successCount}`);
      console.log(`  Failed updates: ${failureCount}`);
      console.log(`  Success rate: ${(successCount / stations.length * 100).toFixed(2)}%`);
      
    } catch (error) {
      // Rollback transaction on error if not in dry-run mode
      if (!dryRun) {
        await client.query('ROLLBACK');
      }
      console.error('Error during update:', error);
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
    randomAmphure: false,
    help: false
  };
  
  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--all') {
      options.all = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--random-amphure') {
      options.randomAmphure = true;
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
  console.log('Usage: node update-thaiwater-amphure.mjs [options]');
  console.log('');
  console.log('Options:');
  console.log('  --help, -h        Show this help message');
  console.log('  --limit=N         Limit updating to N stations (default: 10)');
  console.log('  --all             Update all stations needing amphure information');
  console.log('  --dry-run         Run without updating the database');
  console.log('  --random-amphure  Use a random amphure from the province instead of the first one');
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
  
  // Run the update
  await updateThaiWaterAmphure(options);
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