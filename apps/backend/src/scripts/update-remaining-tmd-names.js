// Script to update the remaining TMD stations with English names to use Thai names from the API
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

const { Pool } = pg;

async function updateRemainingTMDNames() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  console.log('Updating remaining TMD stations with English names to use Thai names...');
  console.log(`Using connection string: ${process.env.DATABASE_URL}`);

  try {
    // Load the mismatches from the file we saved
    let mismatches = [];
    try {
      const mismatchesData = fs.readFileSync('tmd_station_name_mismatches.json', 'utf8');
      mismatches = JSON.parse(mismatchesData);
      console.log(`Loaded ${mismatches.length} mismatched stations from file`);
    } catch (error) {
      console.error('Error loading mismatches data:', error.message);
      console.log('Please run verify-tmd-station-names.js first to generate the mismatches file');
      return;
    }

    // Begin transaction
    await pool.query('BEGIN');

    // Update station names
    let updatedCount = 0;
    let errorCount = 0;

    for (const station of mismatches) {
      try {
        if (!station.api_name) {
          console.log(`Station ID ${station.id} has no API name, skipping`);
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

        await pool.query(updateQuery, [station.api_name, station.id]);
        updatedCount++;

        // Log progress every 20 updates
        if (updatedCount % 20 === 0) {
          console.log(`Updated ${updatedCount} stations so far...`);
        }
      } catch (error) {
        console.error(`Error updating station ID ${station.id}:`, error.message);
        errorCount++;
      }
    }

    // Commit transaction
    await pool.query('COMMIT');

    console.log('\nUpdate Summary:');
    console.log(`Total stations processed: ${mismatches.length}`);
    console.log(`Successfully updated: ${updatedCount}`);
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
    const emptyNameCount = verifyResult.rows[0].count;

    console.log(`\nVerification: ${emptyNameCount} TMD stations still have empty names`);

    if (emptyNameCount > 0) {
      console.log('Some stations still have empty names.');
    } else {
      console.log('All TMD stations have names!');
    }

    // Run a final verification to check if all names now match the API
    console.log('\nRunning final verification to check if all names now match the API...');
    console.log('Please run verify-tmd-station-names.js again to confirm all names match.');

  } catch (error) {
    // Rollback transaction on error
    await pool.query('ROLLBACK');
    console.error('Error updating station names:', error);
  } finally {
    await pool.end();
  }
}

// Run the update function
updateRemainingTMDNames().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 