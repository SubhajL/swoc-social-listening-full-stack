// Script to clean up amphure names by removing all "อำเภอ" prefixes using regex
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
 * Main function to clean up amphure names using regex
 */
async function cleanAmphureNamesWithRegex() {
  console.log('Starting amphure name cleanup process using regex...');
  
  // Create a connection pool
  const connectionString = process.env.DATABASE_URL;
  console.log(`Using connection string: ${connectionString}`);
  
  const pool = new pg.Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  let client;
  
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    
    // First, get all affected rows before making changes
    const selectQuery = `
      SELECT 
        tele_station_id,
        tele_station_name,
        amphure,
        data_source
      FROM 
        thaiwater_tele_stations
      WHERE 
        amphure ~ '^อำเภอ.*'
      ORDER BY 
        data_source, tele_station_id;
    `;
    
    const beforeResult = await client.query(selectQuery);
    const stationsToClean = beforeResult.rows.map(station => ({
      id: station.tele_station_id,
      name: station.tele_station_name,
      old_amphure: station.amphure,
      data_source: station.data_source
    }));
    
    console.log(`Found ${stationsToClean.length} stations with amphure names that need cleaning`);
    
    if (stationsToClean.length === 0) {
      console.log('No stations need cleaning. Exiting...');
      await client.query('ROLLBACK');
      return;
    }
    
    // Save a backup of the data before changes
    const backupPath = path.resolve(__dirname, '../../../amphure_cleanup_backup.json');
    fs.writeFileSync(backupPath, JSON.stringify(stationsToClean, null, 2));
    console.log(`Backup saved to ${backupPath}`);
    
    // Update all affected rows with a single query
    // This regex handles:
    // 1. 'อำเภออำเภอ' -> First 'อำเภอ' removed
    // 2. 'อำเภอ ' -> Prefix with space
    // 3. 'อำเภอ' -> Prefix without space
    const updateQuery = `
      UPDATE thaiwater_tele_stations
      SET 
        amphure = REGEXP_REPLACE(
          REGEXP_REPLACE(amphure, '^อำเภออำเภอ', 'อำเภอ'), 
          '^อำเภอ\\s*', 
          ''
        ),
        updated_at = CURRENT_TIMESTAMP
      WHERE 
        amphure ~ '^อำเภอ.*'
      RETURNING 
        tele_station_id, 
        tele_station_name, 
        amphure, 
        data_source;
    `;
    
    const updateResult = await client.query(updateQuery);
    const updatedCount = updateResult.rowCount;
    
    console.log(`Updated ${updatedCount} stations successfully`);
    
    // Get the updated data to include in the results
    const updatedStations = updateResult.rows.map(station => ({
      id: station.tele_station_id,
      name: station.tele_station_name,
      new_amphure: station.amphure,
      data_source: station.data_source
    }));
    
    // Combine before and after data to create a complete result
    const combinedResults = stationsToClean.map(beforeStation => {
      const afterStation = updatedStations.find(s => s.id === beforeStation.id);
      return {
        id: beforeStation.id,
        name: beforeStation.name,
        old_amphure: beforeStation.old_amphure,
        new_amphure: afterStation ? afterStation.new_amphure : beforeStation.old_amphure,
        data_source: beforeStation.data_source,
        status: afterStation ? 'updated' : 'error'
      };
    });
    
    // Create final results object
    const results = {
      total: stationsToClean.length,
      updated: updatedCount,
      errors: stationsToClean.length - updatedCount,
      stations: combinedResults
    };
    
    // Save results to file
    const resultsPath = path.resolve(__dirname, '../../../amphure_cleanup_regex_results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`Results saved to ${resultsPath}`);
    
    // Log summary
    console.log('\n=== Amphure Name Cleanup Summary ===');
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
    
    // Check if there are still any records with the prefix
    const checkQuery = `
      SELECT COUNT(*) as count
      FROM thaiwater_tele_stations
      WHERE amphure ~ '^อำเภอ.*';
    `;
    
    const checkResult = await client.query(checkQuery);
    const remainingCount = parseInt(checkResult.rows[0].count);
    
    if (remainingCount > 0) {
      console.warn(`Warning: There are still ${remainingCount} records with "อำเภอ" prefix`);
      console.log('Rolling back transaction for safety...');
      await client.query('ROLLBACK');
    } else {
      console.log('All "อำเภอ" prefixes have been removed successfully');
      console.log('Committing transaction...');
      await client.query('COMMIT');
    }
    
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error(`Error cleaning amphure names: ${error.message}`);
    if (error.stack) {
      console.error(`Error stack: ${error.stack}`);
    }
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
    console.log('Amphure name cleanup process completed');
  }
}

// Run the function
cleanAmphureNamesWithRegex().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 