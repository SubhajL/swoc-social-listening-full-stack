// Script to check location data in ThaiWater stations
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Checks location data in ThaiWater stations
 */
async function checkThaiWaterLocationData() {
  console.log('Checking location data in ThaiWater stations...');
  
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    // Connect to the database
    const client = await pool.connect();
    
    try {
      // Check how many stations have province and amphure data
      const locationQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN province IS NOT NULL AND province != '' THEN 1 END) as with_province,
          COUNT(CASE WHEN amphure IS NOT NULL AND amphure != '' THEN 1 END) as with_amphure,
          COUNT(CASE WHEN province IS NOT NULL AND province != '' AND amphure IS NOT NULL AND amphure != '' THEN 1 END) as with_both,
          COUNT(CASE WHEN tele_station_lat IS NOT NULL AND tele_station_long IS NOT NULL THEN 1 END) as with_coordinates,
          COUNT(CASE WHEN (province IS NULL OR province = '') AND (amphure IS NULL OR amphure = '') AND tele_station_lat IS NOT NULL AND tele_station_long IS NOT NULL THEN 1 END) as need_geocoding
        FROM thaiwater_tele_stations
      `;
      
      const locationResult = await client.query(locationQuery);
      const locationStats = locationResult.rows[0];
      
      console.log('\nLocation data statistics:');
      console.log(`Total stations: ${locationStats.total}`);
      console.log(`Stations with province: ${locationStats.with_province} (${(locationStats.with_province / locationStats.total * 100).toFixed(2)}%)`);
      console.log(`Stations with amphure: ${locationStats.with_amphure} (${(locationStats.with_amphure / locationStats.total * 100).toFixed(2)}%)`);
      console.log(`Stations with both province and amphure: ${locationStats.with_both} (${(locationStats.with_both / locationStats.total * 100).toFixed(2)}%)`);
      console.log(`Stations with coordinates: ${locationStats.with_coordinates} (${(locationStats.with_coordinates / locationStats.total * 100).toFixed(2)}%)`);
      console.log(`Stations needing geocoding: ${locationStats.need_geocoding} (${(locationStats.need_geocoding / locationStats.total * 100).toFixed(2)}%)`);
      
      // Check data source distribution for stations needing geocoding
      const dataSourceQuery = `
        SELECT 
          data_source, 
          COUNT(*) as count
        FROM thaiwater_tele_stations
        WHERE (province IS NULL OR province = '') 
          AND (amphure IS NULL OR amphure = '')
          AND tele_station_lat IS NOT NULL 
          AND tele_station_long IS NOT NULL
        GROUP BY data_source
      `;
      
      const dataSourceResult = await client.query(dataSourceQuery);
      
      console.log('\nStations needing geocoding by data source:');
      dataSourceResult.rows.forEach(row => {
        console.log(`  ${row.data_source}: ${row.count} stations`);
      });
      
      // Sample some stations with coordinates but no location data
      const sampleQuery = `
        SELECT 
          tele_station_id,
          tele_station_name,
          tele_station_lat,
          tele_station_long,
          data_source
        FROM thaiwater_tele_stations
        WHERE (province IS NULL OR province = '') 
          AND (amphure IS NULL OR amphure = '')
          AND tele_station_lat IS NOT NULL 
          AND tele_station_long IS NOT NULL
          AND tele_station_lat != 0
          AND tele_station_long != 0
          AND tele_station_lat::text NOT LIKE 'NaN'
          AND tele_station_long::text NOT LIKE 'NaN'
        LIMIT 10
      `;
      
      const sampleResult = await client.query(sampleQuery);
      
      console.log('\nSample stations needing geocoding:');
      sampleResult.rows.forEach(row => {
        console.log(`  ID: ${row.tele_station_id}, Name: ${row.tele_station_name}, Coordinates: [${row.tele_station_lat}, ${row.tele_station_long}], Source: ${row.data_source}`);
      });
      
      // Check coordinate ranges to ensure they're valid for Thailand
      const coordRangeQuery = `
        SELECT 
          MIN(CASE WHEN tele_station_lat::text NOT LIKE 'NaN' AND tele_station_lat != 0 THEN tele_station_lat END) as min_lat,
          MAX(CASE WHEN tele_station_lat::text NOT LIKE 'NaN' AND tele_station_lat != 0 THEN tele_station_lat END) as max_lat,
          MIN(CASE WHEN tele_station_long::text NOT LIKE 'NaN' AND tele_station_long != 0 THEN tele_station_long END) as min_long,
          MAX(CASE WHEN tele_station_long::text NOT LIKE 'NaN' AND tele_station_long != 0 THEN tele_station_long END) as max_long,
          COUNT(CASE WHEN tele_station_lat::text LIKE 'NaN' OR tele_station_long::text LIKE 'NaN' THEN 1 END) as nan_coords,
          COUNT(CASE WHEN tele_station_lat = 0 OR tele_station_long = 0 THEN 1 END) as zero_coords
        FROM thaiwater_tele_stations
        WHERE tele_station_lat IS NOT NULL 
          AND tele_station_long IS NOT NULL
      `;
      
      const coordRangeResult = await client.query(coordRangeQuery);
      const coordRange = coordRangeResult.rows[0];
      
      console.log('\nCoordinate ranges:');
      console.log(`  Latitude: ${coordRange.min_lat} to ${coordRange.max_lat}`);
      console.log(`  Longitude: ${coordRange.min_long} to ${coordRange.max_long}`);
      console.log(`  Stations with NaN coordinates: ${coordRange.nan_coords}`);
      console.log(`  Stations with zero coordinates: ${coordRange.zero_coords}`);
      
      // Thailand's approximate bounds: 5.5-20.5°N, 97.5-105.5°E
      const validLat = coordRange.min_lat >= 5.5 && coordRange.max_lat <= 20.5;
      const validLong = coordRange.min_long >= 97.5 && coordRange.max_long <= 105.5;
      
      console.log(`  Coordinates within Thailand's bounds: ${validLat && validLong ? 'Yes' : 'No'}`);
      
      // Count stations with valid coordinates for Thailand
      const validCoordsQuery = `
        SELECT COUNT(*) as count
        FROM thaiwater_tele_stations
        WHERE tele_station_lat BETWEEN 5.5 AND 20.5
          AND tele_station_long BETWEEN 97.5 AND 105.5
          AND tele_station_lat::text NOT LIKE 'NaN'
          AND tele_station_long::text NOT LIKE 'NaN'
          AND tele_station_lat != 0
          AND tele_station_long != 0
      `;
      
      const validCoordsResult = await client.query(validCoordsQuery);
      console.log(`  Stations with valid Thailand coordinates: ${validCoordsResult.rows[0].count}`);
      
      // Check if we have any stations with both coordinates and location data
      const bothDataQuery = `
        SELECT COUNT(*) as count
        FROM thaiwater_tele_stations
        WHERE province IS NOT NULL 
          AND province != ''
          AND amphure IS NOT NULL 
          AND amphure != ''
          AND tele_station_lat IS NOT NULL 
          AND tele_station_long IS NOT NULL
          AND tele_station_lat::text NOT LIKE 'NaN'
          AND tele_station_long::text NOT LIKE 'NaN'
          AND tele_station_lat != 0
          AND tele_station_long != 0
      `;
      
      const bothDataResult = await client.query(bothDataQuery);
      console.log(`\nStations with both coordinates and location data: ${bothDataResult.rows[0].count}`);
      
      if (bothDataResult.rows[0].count > 0) {
        // Sample some stations with both coordinates and location data
        const bothDataSampleQuery = `
          SELECT 
            tele_station_id,
            tele_station_name,
            tele_station_lat,
            tele_station_long,
            province,
            amphure,
            data_source
          FROM thaiwater_tele_stations
          WHERE province IS NOT NULL 
            AND province != ''
            AND amphure IS NOT NULL 
            AND amphure != ''
            AND tele_station_lat IS NOT NULL 
            AND tele_station_long IS NOT NULL
            AND tele_station_lat::text NOT LIKE 'NaN'
            AND tele_station_long::text NOT LIKE 'NaN'
            AND tele_station_lat != 0
            AND tele_station_long != 0
          LIMIT 5
        `;
        
        const bothDataSampleResult = await client.query(bothDataSampleQuery);
        
        console.log('\nSample stations with both coordinates and location data:');
        bothDataSampleResult.rows.forEach(row => {
          console.log(`  ID: ${row.tele_station_id}, Name: ${row.tele_station_name}, Coordinates: [${row.tele_station_lat}, ${row.tele_station_long}], Province: ${row.province}, Amphure: ${row.amphure}, Source: ${row.data_source}`);
        });
      }
      
    } finally {
      // Release client back to pool
      client.release();
    }
    
  } catch (error) {
    console.error('Error checking location data:', error);
  } finally {
    // Close pool
    await pool.end();
  }
}

// Run the function
checkThaiWaterLocationData()
  .then(() => {
    console.log('\nLocation data check completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 