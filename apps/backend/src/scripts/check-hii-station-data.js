// Script to check the current state of HII station data in the database
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { Pool } = pg;

async function checkHIIStationData() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  console.log('Checking HII station data in the database...');
  console.log(`Using connection string: ${process.env.DATABASE_URL}`);

  try {
    // Get total count of HII stations
    const totalQuery = `
      SELECT COUNT(*) as count
      FROM thaiwater_tele_stations 
      WHERE data_source = 'HII';
    `;
    
    const totalResult = await pool.query(totalQuery);
    const totalStations = parseInt(totalResult.rows[0].count);
    
    // Get count of stations with names
    const withNamesQuery = `
      SELECT COUNT(*) as count
      FROM thaiwater_tele_stations 
      WHERE data_source = 'HII'
      AND tele_station_name IS NOT NULL 
      AND tele_station_name != '' 
      AND tele_station_name != ' ';
    `;
    
    const withNamesResult = await pool.query(withNamesQuery);
    const withNamesCount = parseInt(withNamesResult.rows[0].count);
    
    // Get count of stations with location data
    const withLocationQuery = `
      SELECT COUNT(*) as count
      FROM thaiwater_tele_stations 
      WHERE data_source = 'HII'
      AND province IS NOT NULL 
      AND amphure IS NOT NULL;
    `;
    
    const withLocationResult = await pool.query(withLocationQuery);
    const withLocationCount = parseInt(withLocationResult.rows[0].count);
    
    // Calculate percentages
    const withNamesPercentage = (withNamesCount / totalStations) * 100;
    const withLocationPercentage = (withLocationCount / totalStations) * 100;
    
    // Get sample of stations without names
    const noNamesQuery = `
      SELECT 
        tele_station_id as id,
        tele_station_name,
        tele_station_oldcode,
        province,
        amphure
      FROM thaiwater_tele_stations 
      WHERE data_source = 'HII'
      AND (tele_station_name IS NULL OR tele_station_name = '' OR tele_station_name = ' ')
      LIMIT 10;
    `;
    
    const noNamesResult = await pool.query(noNamesQuery);
    const noNamesStations = noNamesResult.rows;
    
    // Get sample of stations without location data
    const noLocationQuery = `
      SELECT 
        tele_station_id as id,
        tele_station_name,
        tele_station_oldcode,
        province,
        amphure
      FROM thaiwater_tele_stations 
      WHERE data_source = 'HII'
      AND (province IS NULL OR amphure IS NULL)
      LIMIT 10;
    `;
    
    const noLocationResult = await pool.query(noLocationQuery);
    const noLocationStations = noLocationResult.rows;
    
    // Print results
    console.log('\nHII Station Data Summary:');
    console.log(`Total HII stations: ${totalStations}`);
    console.log(`Stations with names: ${withNamesCount} (${withNamesPercentage.toFixed(2)}%)`);
    console.log(`Stations without names: ${totalStations - withNamesCount} (${(100 - withNamesPercentage).toFixed(2)}%)`);
    console.log(`Stations with location data: ${withLocationCount} (${withLocationPercentage.toFixed(2)}%)`);
    console.log(`Stations without location data: ${totalStations - withLocationCount} (${(100 - withLocationPercentage).toFixed(2)}%)`);
    
    if (noNamesStations.length > 0) {
      console.log('\nSample of stations without names:');
      console.log(JSON.stringify(noNamesStations, null, 2));
    }
    
    if (noLocationStations.length > 0) {
      console.log('\nSample of stations without location data:');
      console.log(JSON.stringify(noLocationStations, null, 2));
    }
    
  } catch (error) {
    console.error('Error checking HII station data:', error);
  } finally {
    await pool.end();
  }
}

// Run the check function
checkHIIStationData().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 