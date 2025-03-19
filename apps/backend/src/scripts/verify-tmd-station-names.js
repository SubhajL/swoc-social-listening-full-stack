// Script to verify that TMD station names in the database match those from the ThaiWater API
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

const { Pool } = pg;

async function verifyTMDStationNames() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  console.log('Verifying TMD station names in the database against API data...');
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

    // Get all TMD stations from database
    const dbQuery = `
      SELECT 
        tele_station_id as id,
        tele_station_name,
        tele_station_name_th,
        tele_station_oldcode,
        province,
        amphure
      FROM 
        thaiwater_tele_stations 
      WHERE 
        data_source = 'TMD'
      ORDER BY 
        tele_station_id;
    `;

    const dbResult = await pool.query(dbQuery);
    const dbStations = dbResult.rows;
    console.log(`Retrieved ${dbStations.length} TMD stations from database`);

    // Compare station names
    let matchCount = 0;
    let mismatchCount = 0;
    let missingInApiCount = 0;
    const mismatches = [];

    for (const dbStation of dbStations) {
      const apiStation = apiStationsById[dbStation.id];
      
      if (!apiStation) {
        console.log(`Station ID ${dbStation.id} not found in API data`);
        missingInApiCount++;
        continue;
      }

      // Extract the Thai name from the API data
      let apiName = '';
      if (typeof apiStation.tele_station_name === 'object' && apiStation.tele_station_name.th) {
        apiName = apiStation.tele_station_name.th.trim();
      } else if (typeof apiStation.tele_station_name === 'string') {
        apiName = apiStation.tele_station_name.trim();
      }

      const dbName = dbStation.tele_station_name ? dbStation.tele_station_name.trim() : '';
      
      if (apiName === dbName) {
        matchCount++;
      } else {
        mismatchCount++;
        mismatches.push({
          id: dbStation.id,
          db_name: dbName,
          api_name: apiName,
          oldcode: dbStation.tele_station_oldcode,
          province: dbStation.province,
          amphure: dbStation.amphure
        });
      }
    }

    // Calculate statistics
    const matchPercentage = (matchCount / dbStations.length) * 100;
    const mismatchPercentage = (mismatchCount / dbStations.length) * 100;
    const missingInApiPercentage = (missingInApiCount / dbStations.length) * 100;

    console.log('\nVerification Results:');
    console.log(`Total TMD stations in database: ${dbStations.length}`);
    console.log(`Stations with matching names: ${matchCount} (${matchPercentage.toFixed(2)}%)`);
    console.log(`Stations with mismatched names: ${mismatchCount} (${mismatchPercentage.toFixed(2)}%)`);
    console.log(`Stations missing in API data: ${missingInApiCount} (${missingInApiPercentage.toFixed(2)}%)`);

    // Show sample of mismatches
    if (mismatches.length > 0) {
      console.log('\nSample of mismatched stations (showing up to 10):');
      console.log(JSON.stringify(mismatches.slice(0, 10), null, 2));
      
      // Save all mismatches to a file
      fs.writeFileSync('tmd_station_name_mismatches.json', JSON.stringify(mismatches, null, 2));
      console.log(`All ${mismatches.length} mismatches saved to tmd_station_name_mismatches.json`);
    } else {
      console.log('\nAll station names match the API data!');
    }

    // Check for stations with empty names
    const emptyNameQuery = `
      SELECT COUNT(*) as count
      FROM thaiwater_tele_stations 
      WHERE data_source = 'TMD'
      AND (tele_station_name IS NULL OR tele_station_name = '' OR tele_station_name = ' ');
    `;
    
    const emptyNameResult = await pool.query(emptyNameQuery);
    const emptyNameCount = emptyNameResult.rows[0].count;
    
    console.log(`\nTMD stations with empty names: ${emptyNameCount}`);
    
    if (emptyNameCount > 0) {
      console.log('Some stations still have empty names. You may want to run the update script again.');
    } else {
      console.log('All TMD stations have names!');
    }

  } catch (error) {
    console.error('Error verifying station names:', error);
  } finally {
    await pool.end();
  }
}

// Run the verification function
verifyTMDStationNames().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 