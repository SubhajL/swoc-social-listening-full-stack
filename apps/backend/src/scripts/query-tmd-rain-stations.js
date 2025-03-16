// Script to query TMD rain stations and check for missing station names
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

const { Pool } = pg;

async function queryTMDRainStations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  console.log('Querying TMD rain stations...');
  console.log(`Using connection string: ${process.env.DATABASE_URL}`);

  try {
    // Get total count of TMD rain stations
    const totalCountQuery = `
      SELECT COUNT(*) as total
      FROM thaiwater_tele_stations 
      WHERE data_source = 'TMD'
      AND (tele_station_type = 'R' OR tele_station_type = 'rainfall');
    `;
    
    const totalCountResult = await pool.query(totalCountQuery);
    const totalCount = totalCountResult.rows[0].total;
    
    // Get count of TMD rain stations without names
    const missingNameCountQuery = `
      SELECT COUNT(*) as missing_name_count
      FROM thaiwater_tele_stations 
      WHERE data_source = 'TMD'
      AND (tele_station_type = 'R' OR tele_station_type = 'rainfall')
      AND (tele_station_name IS NULL OR tele_station_name = '' OR tele_station_name = ' ');
    `;
    
    const missingNameCountResult = await pool.query(missingNameCountQuery);
    const missingNameCount = missingNameCountResult.rows[0].missing_name_count;
    
    // Calculate percentage
    const missingNamePercentage = (missingNameCount / totalCount) * 100;
    
    console.log(`\nTMD Rain Station Statistics:`);
    console.log(`---------------------------`);
    console.log(`Total TMD rain stations: ${totalCount}`);
    console.log(`TMD rain stations without names: ${missingNameCount} (${missingNamePercentage.toFixed(2)}%)`);
    
    // Query sample of TMD rain stations without names
    const sampleQuery = `
      SELECT 
        tele_station_id as station_id, 
        amphure, 
        province, 
        tele_station_name as station_name, 
        tele_station_lat as lat, 
        tele_station_long as long,
        tele_station_type as station_type,
        agency_id,
        data_source
      FROM 
        thaiwater_tele_stations 
      WHERE 
        data_source = 'TMD'
        AND (tele_station_type = 'R' OR tele_station_type = 'rainfall')
        AND (tele_station_name IS NULL OR tele_station_name = '' OR tele_station_name = ' ')
      ORDER BY 
        province, amphure, station_id
      LIMIT 20;
    `;
    
    const sampleResult = await pool.query(sampleQuery);
    
    // Convert numeric strings to numbers
    const formattedRows = sampleResult.rows.map(row => {
      return {
        ...row,
        lat: row.lat !== null ? parseFloat(row.lat) : null,
        long: row.long !== null ? parseFloat(row.long) : null,
        agency_id: row.agency_id !== null ? parseInt(row.agency_id) : null
      };
    });
    
    console.log(`\nSample of TMD rain stations without names (showing up to 20):`);
    console.log(JSON.stringify(formattedRows, null, 2));
    
    // Also query TMD stations without station type
    const missingTypeQuery = `
      SELECT COUNT(*) as missing_type_count
      FROM thaiwater_tele_stations 
      WHERE data_source = 'TMD'
      AND (tele_station_type IS NULL OR tele_station_type = '');
    `;
    
    const missingTypeResult = await pool.query(missingTypeQuery);
    const missingTypeCount = missingTypeResult.rows[0].missing_type_count;
    
    // Get total TMD stations
    const totalTMDQuery = `
      SELECT COUNT(*) as total_tmd
      FROM thaiwater_tele_stations 
      WHERE data_source = 'TMD';
    `;
    
    const totalTMDResult = await pool.query(totalTMDQuery);
    const totalTMD = totalTMDResult.rows[0].total_tmd;
    
    console.log(`\nAdditional TMD Station Statistics:`);
    console.log(`--------------------------------`);
    console.log(`Total TMD stations: ${totalTMD}`);
    console.log(`TMD stations without station type: ${missingTypeCount} (${((missingTypeCount / totalTMD) * 100).toFixed(2)}%)`);
    
    // Save all statistics to a file
    const statistics = {
      totalTMDStations: totalTMD,
      totalTMDRainStations: totalCount,
      tmdRainStationsWithoutNames: missingNameCount,
      tmdRainStationsWithoutNamesPercentage: parseFloat(missingNamePercentage.toFixed(2)),
      tmdStationsWithoutType: missingTypeCount,
      tmdStationsWithoutTypePercentage: parseFloat(((missingTypeCount / totalTMD) * 100).toFixed(2)),
      sampleStationsWithoutNames: formattedRows
    };
    
    fs.writeFileSync('tmd_rain_station_statistics.json', JSON.stringify(statistics, null, 2));
    console.log('\nStatistics also saved to tmd_rain_station_statistics.json');
    
  } catch (error) {
    console.error('Error querying stations:', error);
  } finally {
    await pool.end();
  }
}

// Run the query function
queryTMDRainStations().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 