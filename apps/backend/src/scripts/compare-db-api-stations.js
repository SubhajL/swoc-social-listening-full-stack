// Script to compare TMD stations in database with API data
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

const { Pool } = pg;

async function compareDBWithAPIStations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  console.log('Comparing TMD stations in database with API data...');
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

    // Get TMD stations from database
    const dbQuery = `
      SELECT 
        tele_station_id as id,
        tele_station_name,
        tele_station_name_th,
        tele_station_oldcode,
        tele_station_lat as lat,
        tele_station_long as long,
        tele_station_type as station_type,
        agency_id,
        data_source,
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

    // Compare counts
    console.log('\nCount Comparison:');
    console.log(`API: ${apiStations.length} stations`);
    console.log(`DB: ${dbStations.length} stations`);

    // Check for stations with names in API but not in DB
    const apiStationsWithNames = apiStations.filter(station => 
      station.tele_station_name && 
      (typeof station.tele_station_name === 'object' ? 
        (station.tele_station_name.th && station.tele_station_name.th.trim() !== '') : 
        (typeof station.tele_station_name === 'string' && station.tele_station_name.trim() !== ''))
    );

    const dbStationsWithNames = dbStations.filter(station => 
      station.tele_station_name && station.tele_station_name.trim() !== ''
    );

    console.log('\nStations with Names:');
    console.log(`API: ${apiStationsWithNames.length} stations (${((apiStationsWithNames.length / apiStations.length) * 100).toFixed(2)}%)`);
    console.log(`DB: ${dbStationsWithNames.length} stations (${((dbStationsWithNames.length / dbStations.length) * 100).toFixed(2)}%)`);

    // Map API stations by ID for easier lookup
    const apiStationsById = {};
    apiStations.forEach(station => {
      apiStationsById[station.id] = station;
    });

    // Check for stations in DB that have missing names but have names in API
    const stationsToUpdate = dbStations.filter(dbStation => 
      (!dbStation.tele_station_name || dbStation.tele_station_name.trim() === '') && 
      apiStationsById[dbStation.id] && 
      apiStationsById[dbStation.id].tele_station_name && 
      (typeof apiStationsById[dbStation.id].tele_station_name === 'object' ? 
        (apiStationsById[dbStation.id].tele_station_name.th && apiStationsById[dbStation.id].tele_station_name.th.trim() !== '') : 
        (typeof apiStationsById[dbStation.id].tele_station_name === 'string' && apiStationsById[dbStation.id].tele_station_name.trim() !== ''))
    );

    console.log(`\nFound ${stationsToUpdate.length} stations in DB with missing names that have names in API`);

    // Sample of stations to update
    if (stationsToUpdate.length > 0) {
      console.log('\nSample of stations to update (showing up to 10):');
      const sampleToUpdate = stationsToUpdate.slice(0, 10).map(dbStation => {
        const apiStation = apiStationsById[dbStation.id];
        return {
          id: dbStation.id,
          db_name: dbStation.tele_station_name || '',
          api_name: typeof apiStation.tele_station_name === 'object' ? 
            apiStation.tele_station_name.th : 
            apiStation.tele_station_name,
          api_name_en: typeof apiStation.tele_station_name === 'object' ? 
            apiStation.tele_station_name.en : 
            '',
          oldcode: dbStation.tele_station_oldcode,
          province: dbStation.province,
          amphure: dbStation.amphure
        };
      });
      console.log(JSON.stringify(sampleToUpdate, null, 2));

      // Save the list of stations to update
      const stationsToUpdateData = stationsToUpdate.map(dbStation => {
        const apiStation = apiStationsById[dbStation.id];
        return {
          id: dbStation.id,
          db_name: dbStation.tele_station_name || '',
          api_name: typeof apiStation.tele_station_name === 'object' ? 
            apiStation.tele_station_name.th : 
            apiStation.tele_station_name,
          api_name_en: typeof apiStation.tele_station_name === 'object' ? 
            apiStation.tele_station_name.en : 
            '',
          oldcode: dbStation.tele_station_oldcode,
          province: dbStation.province,
          amphure: dbStation.amphure
        };
      });
      fs.writeFileSync('tmd_stations_to_update.json', JSON.stringify(stationsToUpdateData, null, 2));
      console.log('List of stations to update saved to tmd_stations_to_update.json');
    }

    // Generate SQL to update station names
    if (stationsToUpdate.length > 0) {
      let updateSQL = '-- SQL to update TMD station names\n';
      updateSQL += 'BEGIN;\n\n';
      
      stationsToUpdate.forEach(dbStation => {
        const apiStation = apiStationsById[dbStation.id];
        const newName = typeof apiStation.tele_station_name === 'object' ? 
          apiStation.tele_station_name.th : 
          apiStation.tele_station_name;
        const newNameEn = typeof apiStation.tele_station_name === 'object' ? 
          apiStation.tele_station_name.en : 
          '';
          
        updateSQL += `UPDATE thaiwater_tele_stations SET 
  tele_station_name = '${newName.replace(/'/g, "''")}',
  tele_station_name_th = '${newName.replace(/'/g, "''")}'
WHERE tele_station_id = ${dbStation.id};\n`;
      });
      
      updateSQL += '\nCOMMIT;';
      
      fs.writeFileSync('update_tmd_station_names.sql', updateSQL);
      console.log('SQL to update station names saved to update_tmd_station_names.sql');
    }

  } catch (error) {
    console.error('Error comparing stations:', error);
  } finally {
    await pool.end();
  }
}

// Run the comparison function
compareDBWithAPIStations().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 