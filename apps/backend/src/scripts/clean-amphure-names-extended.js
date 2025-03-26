// Script to clean up amphure names by removing the "อำเภอ" prefix and duplications
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Main function to clean up amphure names
 */
async function cleanExtendedAmphureNames() {
  console.log('Starting extended amphure name cleanup process...');
  
  // Create a connection pool
  const connectionString = process.env.DATABASE_URL;
  console.log(`Using connection string: ${connectionString}`);
  
  const pool = new pg.Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    // Query all stations with amphure names that have problematic prefixes
    const stationsToClean = await queryStationsWithPrefixes(pool);
    console.log(`Found ${stationsToClean.length} stations with amphure names that need cleaning`);
    
    if (stationsToClean.length === 0) {
      console.log('No stations need cleaning. Exiting...');
      return;
    }
    
    // Clean up amphure names and update the database
    const results = await cleanAndUpdateAmphureNames(pool, stationsToClean);
    
    // Save results to file
    const resultsPath = path.resolve(__dirname, '../../../amphure_cleanup_extended_results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`Results saved to ${resultsPath}`);
    
    // Log summary
    console.log('\n=== Amphure Name Extended Cleanup Summary ===');
    console.log(`Total stations processed: ${results.total}`);
    console.log(`Successfully updated: ${results.updated}`);
    console.log(`Errors: ${results.errors}`);
    
    // Display some examples of the changes
    if (results.updated > 0) {
      console.log('\nExamples of changes:');
      const examples = results.stations.filter(s => s.status === 'updated').slice(0, 10);
      
      for (const example of examples) {
        console.log(`Station ${example.id} (${example.name}): "${example.old_amphure}" -> "${example.new_amphure}"`);
      }
      
      if (results.updated > 10) {
        console.log(`... and ${results.updated - 10} more`);
      }
    }
    
  } catch (error) {
    console.error(`Error cleaning amphure names: ${error.message}`);
    if (error.stack) {
      console.error(`Error stack: ${error.stack}`);
    }
  } finally {
    await pool.end();
    console.log('Extended amphure name cleanup process completed');
  }
}

/**
 * Query stations with amphure names that have problematic prefixes
 * 
 * @param {pg.Pool} pool - Database connection pool
 * @returns {Promise<Array>} - Array of stations
 */
async function queryStationsWithPrefixes(pool) {
  console.log('Querying stations with amphure names that have problematic prefixes...');
  
  const query = `
    SELECT 
      tele_station_id,
      tele_station_name,
      amphure,
      data_source
    FROM 
      thaiwater_tele_stations
    WHERE 
      amphure LIKE 'อำเภอ%'
      OR amphure LIKE 'อำเภอ %'
      OR amphure LIKE 'อำเภออำเภอ%'
    ORDER BY 
      data_source, tele_station_id;
  `;
  
  const result = await pool.query(query);
  
  return result.rows.map(station => ({
    id: station.tele_station_id,
    name: station.tele_station_name,
    amphure: station.amphure,
    data_source: station.data_source
  }));
}

/**
 * Clean up amphure names and update the database
 * 
 * @param {pg.Pool} pool - Database connection pool
 * @param {Array} stations - Array of stations to clean
 * @returns {Promise<Object>} - Results of the cleaning process
 */
async function cleanAndUpdateAmphureNames(pool, stations) {
  console.log(`Cleaning and updating amphure names for ${stations.length} stations...`);
  
  const results = {
    total: stations.length,
    updated: 0,
    errors: 0,
    stations: []
  };
  
  for (const station of stations) {
    try {
      // Clean up the amphure name
      const oldAmphure = station.amphure;
      let newAmphure = oldAmphure;
      
      // Remove "อำเภออำเภอ" first (doubled prefix)
      if (newAmphure.startsWith('อำเภออำเภอ')) {
        newAmphure = newAmphure.substring('อำเภอ'.length).trim();
      }
      
      // Then handle single prefix cases
      if (newAmphure.startsWith('อำเภอ ')) {
        newAmphure = newAmphure.substring('อำเภอ '.length).trim();
      } else if (newAmphure.startsWith('อำเภอ')) {
        newAmphure = newAmphure.substring('อำเภอ'.length).trim();
      }
      
      // Update the database
      await updateStationAmphure(pool, station.id, newAmphure);
      
      results.updated++;
      results.stations.push({
        id: station.id,
        name: station.name,
        old_amphure: oldAmphure,
        new_amphure: newAmphure,
        data_source: station.data_source,
        status: 'updated'
      });
      
      console.log(`Updated station ${station.id} (${station.name}): "${oldAmphure}" -> "${newAmphure}"`);
      
    } catch (error) {
      console.error(`Error updating station ${station.id} (${station.name}): ${error.message}`);
      results.errors++;
      results.stations.push({
        id: station.id,
        name: station.name,
        amphure: station.amphure,
        data_source: station.data_source,
        status: 'error',
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Update station amphure in the database
 * 
 * @param {pg.Pool} pool - Database connection pool
 * @param {number} stationId - Station ID
 * @param {string} newAmphure - New amphure name
 * @returns {Promise<void>} - Promise that resolves when the update is complete
 */
async function updateStationAmphure(pool, stationId, newAmphure) {
  const query = `
    UPDATE thaiwater_tele_stations
    SET 
      amphure = $1,
      updated_at = CURRENT_TIMESTAMP
    WHERE 
      tele_station_id = $2
  `;
  
  await pool.query(query, [newAmphure, stationId]);
}

// Run the function
cleanExtendedAmphureNames().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 