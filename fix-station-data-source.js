// Script to fix data_source field for TMD stations
const dotenv = require('dotenv');
const pg = require('pg');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

// Load environment variables from backend .env
const envPath = path.join(__dirname, 'apps/backend/.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.log(`Backend .env file not found at: ${envPath}`);
  dotenv.config(); // Try default location
}

// API configuration
const THAIWATER_API_ENDPOINT = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/api_service';

// TMD station data
const TMD_STATION_API_MID = '264';
const TMD_STATION_API_EID = 'skbNrh269YFK3TOaTT7074F_kQKPqfo0Ji_UkABKAnbLZiK_ceQ6ii0zx6HsLGOsYbMRu5Ll6d4wrpZ9jB7SHA';

// Database configuration
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// Dry run mode (set to false to actually update the database)
const DRY_RUN = process.argv.includes('--dry-run');

/**
 * Fetch TMD stations from ThaiWater API
 */
async function fetchTMDStationsFromAPI() {
  try {
    console.log('Fetching TMD stations from ThaiWater API...');
    
    const url = `${THAIWATER_API_ENDPOINT}?mid=${TMD_STATION_API_MID}&eid=${encodeURIComponent(TMD_STATION_API_EID)}`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'SWOC-Stations-Fix/1.0',
        'Accept': 'application/json'
      },
      timeout: 30000 // 30 seconds timeout
    });
    
    if (!Array.isArray(response.data)) {
      console.error('Invalid response format for TMD stations:', response.data);
      return [];
    }
    
    console.log(`Successfully fetched ${response.data.length} TMD stations from API`);
    return response.data;
  } catch (error) {
    console.error('Error fetching TMD stations from API:', error.message);
    return [];
  }
}

/**
 * Update data_source for TMD stations in database
 */
async function updateTMDStationsDataSource(tmdStations) {
  try {
    console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Updating data_source for TMD stations in database...`);
    
    const client = await pool.connect();
    
    // Start transaction
    if (!DRY_RUN) {
      await client.query('BEGIN');
    }
    
    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    
    // Create a set of TMD station IDs for faster lookup
    const tmdStationIds = new Set(tmdStations.map(station => station.id));
    
    // Get all stations in database
    const dbStationsResult = await client.query(`
      SELECT tele_station_id, tele_station_name_th, data_source
      FROM thaiwater_tele_stations
      WHERE data_source = 'HII'
    `);
    
    const dbStations = dbStationsResult.rows;
    console.log(`Found ${dbStations.length} stations with data_source='HII' in database`);
    
    // For each station in database, check if it exists in TMD API and update data_source
    for (const dbStation of dbStations) {
      totalProcessed++;
      
      const stationId = parseInt(dbStation.tele_station_id, 10);
      
      // Check if station exists in TMD API
      if (tmdStationIds.has(stationId)) {
        console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Updating station ${dbStation.tele_station_id} (${dbStation.tele_station_name_th}) data_source from 'HII' to 'TMD'`);
        
        if (!DRY_RUN) {
          try {
            // Update data_source to TMD
            await client.query(`
              UPDATE thaiwater_tele_stations
              SET data_source = 'TMD', updated_at = NOW()
              WHERE tele_station_id = $1
            `, [dbStation.tele_station_id]);
            
            totalUpdated++;
          } catch (error) {
            console.error(`Error updating station ${dbStation.tele_station_id}:`, error.message);
            totalFailed++;
          }
        } else {
          // In dry run mode, just count as updated
          totalUpdated++;
        }
      } else {
        // Skip stations that don't exist in TMD API
        totalSkipped++;
      }
      
      // Print progress every 100 stations
      if (totalProcessed % 100 === 0) {
        console.log(`Progress: ${totalProcessed}/${dbStations.length} (${(totalProcessed / dbStations.length * 100).toFixed(1)}%)`);
      }
    }
    
    // Commit transaction
    if (!DRY_RUN) {
      await client.query('COMMIT');
    }
    
    console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Stations processing completed:`);
    console.log(`  Total stations processed: ${totalProcessed}`);
    console.log(`  Total stations updated to TMD: ${totalUpdated}`);
    console.log(`  Total stations skipped (kept as HII): ${totalSkipped}`);
    console.log(`  Total stations failed to update: ${totalFailed}`);
    
    client.release();
    
    return {
      totalProcessed,
      totalUpdated,
      totalSkipped,
      totalFailed
    };
  } catch (error) {
    console.error('Error updating TMD stations data_source:', error.message);
    
    // Rollback transaction if not in dry run mode
    if (!DRY_RUN) {
      try {
        const client = await pool.connect();
        await client.query('ROLLBACK');
        client.release();
      } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError.message);
      }
    }
    
    return {
      totalProcessed: 0,
      totalUpdated: 0,
      totalSkipped: 0,
      totalFailed: 0
    };
  }
}

/**
 * Fix specific stations from the screenshot if needed
 */
async function fixSpecificStations() {
  try {
    console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Fixing specific stations from screenshot...`);
    
    const specificStationIds = [
      '1128781', '1128919', '1128728', '1128411', 
      '1128683', '1128155', '1128954', '457560', 
      '1128951', '1128319'
    ];
    
    const client = await pool.connect();
    
    // Start transaction
    if (!DRY_RUN) {
      await client.query('BEGIN');
    }
    
    let fixedCount = 0;
    
    for (const stationId of specificStationIds) {
      // Check the current state of the station
      const stationResult = await client.query(`
        SELECT tele_station_id, tele_station_name_th, data_source, 
               tele_station_lat, tele_station_long, province, amphure
        FROM thaiwater_tele_stations
        WHERE tele_station_id = $1
      `, [stationId]);
      
      if (stationResult.rows.length === 0) {
        console.log(`Station ${stationId} not found in database, skipping`);
        continue;
      }
      
      const station = stationResult.rows[0];
      
      // Check for specific issues and fix them
      let updateQuery = '';
      let updateParams = [];
      let updateMessage = '';
      
      // Fix longitude for station 1128728 (Lat Krabang) which is incorrectly set to 10.707778 instead of 100.707778
      if (stationId === '1128728' && station.tele_station_long === '10.707778') {
        updateQuery = `
          UPDATE thaiwater_tele_stations
          SET tele_station_long = $1, updated_at = NOW()
          WHERE tele_station_id = $2
        `;
        updateParams = ['100.707778', stationId];
        updateMessage = `Fixing incorrect longitude for station ${stationId} from 10.707778 to 100.707778`;
      }
      
      // Apply the fix if needed
      if (updateQuery) {
        console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}${updateMessage}`);
        
        if (!DRY_RUN) {
          await client.query(updateQuery, updateParams);
          fixedCount++;
        } else {
          fixedCount++;
        }
      }
    }
    
    // Commit transaction
    if (!DRY_RUN) {
      await client.query('COMMIT');
    }
    
    console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Fixed ${fixedCount} specific issues with stations`);
    
    client.release();
    
    return fixedCount;
  } catch (error) {
    console.error('Error fixing specific stations:', error.message);
    
    // Rollback transaction if not in dry run mode
    if (!DRY_RUN) {
      try {
        const client = await pool.connect();
        await client.query('ROLLBACK');
        client.release();
      } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError.message);
      }
    }
    
    return 0;
  }
}

/**
 * Main function
 */
async function main() {
  console.log(`Running in ${DRY_RUN ? 'DRY RUN' : 'LIVE'} mode`);
  console.log(`To run in dry-run mode (no database changes), use --dry-run flag`);
  
  try {
    // 1. Fetch TMD stations from API
    const tmdStations = await fetchTMDStationsFromAPI();
    
    if (tmdStations.length === 0) {
      console.error('No TMD stations found in API. Aborting.');
      return;
    }
    
    // 2. Update data_source for TMD stations in database
    await updateTMDStationsDataSource(tmdStations);
    
    // 3. Fix specific issues with stations from screenshot
    await fixSpecificStations();
    
    console.log('\nAll operations completed successfully.');
    
    if (DRY_RUN) {
      console.log('\nThis was a DRY RUN. No changes were made to the database.');
      console.log('To apply changes, run the script without the --dry-run flag.');
    }
  } catch (error) {
    console.error('Unhandled error:', error);
  } finally {
    // Close the database pool
    await pool.end();
  }
}

// Run the main function
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
}); 