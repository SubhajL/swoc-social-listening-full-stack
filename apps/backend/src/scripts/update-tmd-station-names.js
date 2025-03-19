// Script to update TMD station names in the thaiwater_tele_stations table
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

const { Pool } = pg;

async function updateTMDStationNames() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  console.log('Updating TMD station names in the database...');
  console.log(`Using connection string: ${process.env.DATABASE_URL}`);

  try {
    // Load the API data from the file we saved
    let apiStations = [];
    try {
      const apiData = fs.readFileSync('thaiwater_api_tmd_stations.json', 'utf8');
      apiStations = JSON.parse(apiData);
      console.log(`Loaded ${apiStations.length} TMD stations from API data file`);
    } catch (error) {
      console.error('Error loading API data:', error.message);
      console.log('Please run query-thaiwater-api.js first to generate the API data file');
      return;
    }

    // Map API stations by ID for easier lookup
    const apiStationsById = {};
    apiStations.forEach(station => {
      apiStationsById[station.id] = station;
    });

    // Get TMD stations from database that need updating
    const dbQuery = `
      SELECT 
        tele_station_id as id,
        tele_station_name,
        tele_station_name_th
      FROM 
        thaiwater_tele_stations 
      WHERE 
        data_source = 'TMD'
        AND (tele_station_name IS NULL OR tele_station_name = '' OR tele_station_name = ' ')
      ORDER BY 
        tele_station_id;
    `;

    const dbResult = await pool.query(dbQuery);
    const stationsToUpdate = dbResult.rows;
    console.log(`Found ${stationsToUpdate.length} TMD stations in database that need name updates`);

    // Begin transaction
    await pool.query('BEGIN');

    // Update station names
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const dbStation of stationsToUpdate) {
      try {
        const apiStation = apiStationsById[dbStation.id];
        
        if (!apiStation) {
          console.log(`Station ID ${dbStation.id} not found in API data, skipping`);
          skippedCount++;
          continue;
        }

        if (!apiStation.tele_station_name) {
          console.log(`Station ID ${dbStation.id} has no name in API data, skipping`);
          skippedCount++;
          continue;
        }

        // Extract the Thai name from the API data
        let newName = '';
        if (typeof apiStation.tele_station_name === 'object' && apiStation.tele_station_name.th) {
          newName = apiStation.tele_station_name.th.trim();
        } else if (typeof apiStation.tele_station_name === 'string') {
          newName = apiStation.tele_station_name.trim();
        }

        if (!newName) {
          console.log(`Station ID ${dbStation.id} has empty name in API data, skipping`);
          skippedCount++;
          continue;
        }

        // Update the station name in the database
        const updateQuery = `
          UPDATE thaiwater_tele_stations
          SET 
            tele_station_name = $1,
            tele_station_name_th = $1,
            updated_at = NOW()
          WHERE 
            tele_station_id = $2
        `;

        await pool.query(updateQuery, [newName, dbStation.id]);
        updatedCount++;

        // Log progress every 100 updates
        if (updatedCount % 100 === 0) {
          console.log(`Updated ${updatedCount} stations so far...`);
        }
      } catch (error) {
        console.error(`Error updating station ID ${dbStation.id}:`, error.message);
        errorCount++;
      }
    }

    // Commit transaction
    await pool.query('COMMIT');

    console.log('\nUpdate Summary:');
    console.log(`Total stations processed: ${stationsToUpdate.length}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);

    // Verify the update
    const verifyQuery = `
      SELECT 
        COUNT(*) as count
      FROM 
        thaiwater_tele_stations 
      WHERE 
        data_source = 'TMD'
        AND (tele_station_name IS NULL OR tele_station_name = '' OR tele_station_name = ' ');
    `;

    const verifyResult = await pool.query(verifyQuery);
    const remainingEmptyNames = verifyResult.rows[0].count;

    console.log(`\nVerification: ${remainingEmptyNames} TMD stations still have empty names`);

    if (remainingEmptyNames > 0) {
      console.log('Some stations could not be updated. These might be stations that don\'t have names in the API data.');
    } else {
      console.log('All TMD stations now have names!');
    }

  } catch (error) {
    // Rollback transaction on error
    await pool.query('ROLLBACK');
    console.error('Error updating station names:', error);
  } finally {
    await pool.end();
  }
}

// Run the update function
updateTMDStationNames().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 