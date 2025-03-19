// Script to verify and update HII station names in the database
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

const { Pool } = pg;

async function verifyAndUpdateHIIStationNames() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  console.log('Verifying and updating HII station names in the database...');
  console.log(`Using connection string: ${process.env.DATABASE_URL}`);

  try {
    // Get all HII stations from database
    const dbQuery = `
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
      ORDER BY 
        tele_station_id;
    `;

    const dbResult = await pool.query(dbQuery);
    const dbStations = dbResult.rows;
    console.log(`Retrieved ${dbStations.length} HII stations from database`);

    // Count stations with empty names
    const emptyNameStations = dbStations.filter(station => 
      !station.tele_station_name || station.tele_station_name.trim() === ''
    );
    
    console.log(`HII stations with empty names: ${emptyNameStations.length} (${((emptyNameStations.length / dbStations.length) * 100).toFixed(2)}%)`);
    
    // If there are stations with empty names, let's update them
    if (emptyNameStations.length > 0) {
      console.log('\nUpdating HII stations with empty names...');
      
      // Begin transaction
      await pool.query('BEGIN');
      
      let updatedCount = 0;
      let errorCount = 0;
      
      // For each station with an empty name, generate a name based on its location
      for (const station of emptyNameStations) {
        try {
          // If province and amphure are available, use them to generate a name
          if (station.province && station.amphure) {
            const generatedName = `สถานีวัดน้ำ ${station.amphure} ${station.province}`;
            
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
            
            await pool.query(updateQuery, [generatedName, station.id]);
            updatedCount++;
            
            // Log progress every 20 updates
            if (updatedCount % 20 === 0) {
              console.log(`Updated ${updatedCount} stations so far...`);
            }
          } else {
            console.log(`Station ID ${station.id} has no province/amphure data, skipping`);
          }
        } catch (error) {
          console.error(`Error updating station ID ${station.id}:`, error.message);
          errorCount++;
        }
      }
      
      // Commit transaction
      await pool.query('COMMIT');
      
      console.log('\nUpdate Summary:');
      console.log(`Total stations processed: ${emptyNameStations.length}`);
      console.log(`Successfully updated: ${updatedCount}`);
      console.log(`Skipped (no location data): ${emptyNameStations.length - updatedCount - errorCount}`);
      console.log(`Errors: ${errorCount}`);
      
      // Verify the update
      const verifyQuery = `
        SELECT 
          COUNT(*) as count
        FROM 
          thaiwater_tele_stations 
        WHERE 
          data_source = 'HII'
          AND (tele_station_name IS NULL OR tele_station_name = '' OR tele_station_name = ' ');
      `;
      
      const verifyResult = await pool.query(verifyQuery);
      const emptyNameCount = verifyResult.rows[0].count;
      
      console.log(`\nVerification: ${emptyNameCount} HII stations still have empty names`);
      
      if (emptyNameCount > 0) {
        console.log('Some stations still have empty names.');
      } else {
        console.log('All HII stations now have names!');
      }
    } else {
      console.log('All HII stations already have names. No updates needed.');
    }
    
    // Get a sample of updated stations
    const sampleQuery = `
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
      ORDER BY 
        tele_station_id
      LIMIT 20;
    `;
    
    const sampleResult = await pool.query(sampleQuery);
    const sampleStations = sampleResult.rows;
    
    console.log('\nSample of HII stations:');
    console.log(JSON.stringify(sampleStations, null, 2));
    
  } catch (error) {
    // Rollback transaction on error
    await pool.query('ROLLBACK');
    console.error('Error verifying and updating HII station names:', error);
  } finally {
    await pool.end();
  }
}

// Run the verification and update function
verifyAndUpdateHIIStationNames().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 