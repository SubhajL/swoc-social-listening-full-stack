#!/usr/bin/env node

/**
 * Update Station Names from JSON
 * 
 * This script updates the station_name field in the telemetry_data_stations table
 * for records where station_name starts with "Station", replacing them with
 * station details from the all_daily_stations.json file based on station ID.
 */

const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');
const { Pool } = require('pg');

// Load environment variables from backend .env file
dotenv.config({ path: path.resolve(__dirname, '../apps/backend/.env') });

// Set NODE_TLS_REJECT_UNAUTHORIZED to allow self-signed certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Path to the JSON file
const JSON_FILE_PATH = path.resolve(__dirname, './daily_hydro_results/all_daily_stations.json');

/**
 * Load and parse the JSON file
 */
function loadStationsData() {
  try {
    console.log(`Loading data from ${JSON_FILE_PATH}...`);
    
    // Check if file exists
    if (!fs.existsSync(JSON_FILE_PATH)) {
      throw new Error(`JSON file not found at ${JSON_FILE_PATH}`);
    }
    
    // Read and parse the JSON file
    const jsonData = fs.readFileSync(JSON_FILE_PATH, 'utf8');
    const stationsData = JSON.parse(jsonData);
    
    if (!Array.isArray(stationsData)) {
      throw new Error('JSON data is not an array');
    }
    
    console.log(`Successfully loaded ${stationsData.length} stations from JSON file`);
    return stationsData;
  } catch (error) {
    console.error(`Error loading JSON data: ${error.message}`);
    throw error;
  }
}

/**
 * Create a mapping of station IDs to station details
 */
function createStationMapping(stationsData) {
  try {
    console.log('Creating station ID to station details mapping...');
    
    const stationMap = new Map();
    let numericIdCount = 0;
    let stationIdCount = 0;
    let stationCodeCount = 0;
    
    for (const station of stationsData) {
      // Extract the needed fields
      const { stationid, stationcode, stationdetail, name } = station;
      
      // Skip stations without necessary data
      if (!stationid || !stationdetail) {
        continue;
      }
      
      // Store by stationid (numeric)
      if (stationid) {
        stationMap.set(stationid.toString(), {
          stationid,
          stationcode,
          stationdetail,
          name
        });
        numericIdCount++;
      }
      
      // Also store by stationcode if different from stationid
      if (stationcode && stationcode !== stationid.toString()) {
        stationMap.set(stationcode, {
          stationid,
          stationcode,
          stationdetail,
          name
        });
        stationCodeCount++;
      }
    }
    
    console.log(`Created mapping with ${stationMap.size} entries`);
    console.log(`- ${numericIdCount} mapped by numeric station ID`);
    console.log(`- ${stationCodeCount} mapped by station code`);
    
    return stationMap;
  } catch (error) {
    console.error(`Error creating station mapping: ${error.message}`);
    throw error;
  }
}

/**
 * Find records in the database that need to be updated
 */
async function findRecordsToUpdate() {
  try {
    console.log('Finding records in telemetry_data_stations that need updating...');
    
    const query = `
      SELECT 
        id, station_id, station_code, station_name, station_detail, original_station_id 
      FROM 
        telemetry_data_stations 
      WHERE 
        station_name LIKE 'Station%' OR 
        station_name IS NULL OR 
        station_name = ''
    `;
    
    const result = await pool.query(query);
    console.log(`Found ${result.rows.length} records that need updating`);
    
    return result.rows;
  } catch (error) {
    console.error(`Error finding records to update: ${error.message}`);
    throw error;
  }
}

/**
 * Update station names in the database
 */
async function updateStationNames(recordsToUpdate, stationMap) {
  try {
    console.log('\nUpdating station names in the database...');
    
    // Begin transaction
    await pool.query('BEGIN');
    
    let updateCount = 0;
    let errorCount = 0;
    const updateErrors = [];
    const updateResults = [];
    
    // Process each record
    for (const record of recordsToUpdate) {
      try {
        // Look up the station in our mapping by different IDs
        let stationData = null;
        
        // Try multiple fields to find a match
        const idFields = [
          record.station_id,
          record.original_station_id,
          record.station_code
        ];
        
        for (const idField of idFields) {
          if (idField && stationMap.has(idField)) {
            stationData = stationMap.get(idField);
            break;
          }
        }
        
        // If we found a match, update the record
        if (stationData) {
          const newStationName = stationData.stationdetail || stationData.name;
          
          if (newStationName) {
            const updateQuery = `
              UPDATE telemetry_data_stations
              SET 
                station_name = $1,
                updated_at = NOW()
              WHERE id = $2
              RETURNING id, station_id, station_name;
            `;
            
            const updateResult = await pool.query(updateQuery, [newStationName, record.id]);
            
            if (updateResult.rows.length > 0) {
              updateResults.push({
                id: record.id,
                station_id: record.station_id,
                old_name: record.station_name,
                new_name: newStationName
              });
              
              updateCount++;
              console.log(`Updated record ${record.id} (${record.station_id}): "${record.station_name}" -> "${newStationName}"`);
            }
          }
        } else {
          console.log(`No matching station found for ${record.station_id} (ID: ${record.id})`);
          errorCount++;
          updateErrors.push({
            id: record.id,
            station_id: record.station_id,
            error: 'No matching station found in JSON data'
          });
        }
      } catch (error) {
        console.error(`Error updating record ${record.id}: ${error.message}`);
        errorCount++;
        updateErrors.push({
          id: record.id,
          station_id: record.station_id,
          error: error.message
        });
      }
    }
    
    // Commit transaction
    await pool.query('COMMIT');
    
    // Save results to file
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    
    if (updateResults.length > 0) {
      const updateResultsFile = `station_name_updates_${timestamp}.json`;
      fs.writeFileSync(updateResultsFile, JSON.stringify(updateResults, null, 2));
      console.log(`\nSuccessfully updated ${updateCount} records`);
      console.log(`Update details saved to ${updateResultsFile}`);
    }
    
    if (updateErrors.length > 0) {
      const updateErrorsFile = `station_name_update_errors_${timestamp}.json`;
      fs.writeFileSync(updateErrorsFile, JSON.stringify(updateErrors, null, 2));
      console.log(`\n${errorCount} records could not be updated`);
      console.log(`Error details saved to ${updateErrorsFile}`);
    }
    
    return { updateCount, errorCount };
  } catch (error) {
    // Rollback on error
    await pool.query('ROLLBACK');
    console.error(`Error updating station names: ${error.message}`);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('=== Updating Station Names from JSON ===');
    console.log(`Started at: ${new Date().toISOString()}`);
    
    // Load stations data from JSON
    const stationsData = loadStationsData();
    
    // Create mapping of station IDs to station details
    const stationMap = createStationMapping(stationsData);
    
    // Find records that need to be updated
    const recordsToUpdate = await findRecordsToUpdate();
    
    // Update station names
    if (recordsToUpdate.length > 0) {
      const { updateCount, errorCount } = await updateStationNames(recordsToUpdate, stationMap);
      
      console.log('\n=== Update Summary ===');
      console.log(`Total records processed: ${recordsToUpdate.length}`);
      console.log(`Successfully updated: ${updateCount}`);
      console.log(`Failed: ${errorCount}`);
    } else {
      console.log('No records need to be updated.');
    }
    
    console.log('\nUpdate completed successfully.');
    console.log(`Completed at: ${new Date().toISOString()}`);
  } catch (error) {
    console.error('\nError updating station names:', error.message);
    process.exit(1);
  } finally {
    // Close database connection
    await pool.end();
    console.log('\nDatabase connection closed.');
  }
}

// Run the main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 